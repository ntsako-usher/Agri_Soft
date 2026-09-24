from datetime import timedelta

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Farm, Device, SensorReading, Threshold, Alert, DeviceCommand
from .serializers import (
    FarmSerializer,
    DeviceSerializer,
    SensorReadingSerializer,
    ThresholdSerializer,
    AlertSerializer,
    DeviceCommandSerializer,
)


# =========================================================================
# Helpers
# =========================================================================
def _is_admin(user):
    return bool(user and user.is_staff)


def _is_technician(user):
    return bool(user and getattr(user, "role", None) == "technician")


def _farms_visible_to(user):
    """
    Farms visible to the given user:
    - Admin: all farms
    - Technician: farms assigned to them
    - Farmer: farms they own
    """
    qs = Farm.objects.all().select_related("farmer", "technician")
    if _is_admin(user):
        return qs
    if _is_technician(user):
        return qs.filter(technician=user)
    return qs.filter(farmer=user)


def _sync_service_requested(farm):
    """
    Keep the legacy `service_requested` boolean in sync with `service_status`.
    True whenever the workflow is active (requested / assigned / completed).
    False when none or confirmed.
    """
    active = farm.service_status in (
        Farm.ServiceStatus.REQUESTED,
        Farm.ServiceStatus.ASSIGNED,
        Farm.ServiceStatus.COMPLETED,
    )
    farm.service_requested = active


# =========================================================================
# Farm
# =========================================================================
class FarmViewSet(viewsets.ModelViewSet):
    """
    Farms visible to the logged-in user:
    - Farmers see their own farms.
    - Technicians see farms assigned to them.
    - Admins see everything.
    """
    serializer_class = FarmSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _farms_visible_to(self.request.user).order_by("-created_at")

    def perform_create(self, serializer):
        if _is_technician(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Technicians cannot create farms.")
        serializer.save(farmer=self.request.user)

    # ---------------------------------------------------------------------
    # Farmer: request service (installation / maintenance / repair)
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="request-service",
            permission_classes=[IsAuthenticated])
    def request_service(self, request, pk=None):
        """
        Farmer-only.
        POST /api/farms/{id}/request-service/
        Body: { service_notes: "what do you need?" }

        Allowed when service_status is 'none' or 'confirmed'.
        """
        farm = self.get_object()
        user = request.user

        if farm.farmer_id != user.id:
            return Response(
                {"detail": "Only the farm owner can request service."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if farm.service_status not in (
            Farm.ServiceStatus.NONE,
            Farm.ServiceStatus.CONFIRMED,
        ):
            return Response(
                {"detail": f"Cannot request service while status is '{farm.service_status}'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = (request.data.get("service_notes") or "").strip()
        if not notes:
            return Response(
                {"detail": "service_notes is required — describe what you need."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        farm.service_notes = notes
        farm.service_status = Farm.ServiceStatus.REQUESTED
        farm.farmer_feedback = None
        farm.farmer_satisfied = None
        _sync_service_requested(farm)
        farm.save(update_fields=[
            "service_notes", "service_status", "service_requested",
            "farmer_feedback", "farmer_satisfied", "updated_at",
        ])

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Admin: assign (or reassign) a technician
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="assign-technician",
            permission_classes=[IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """
        Admin-only.
        POST /api/farms/{id}/assign-technician/
        Body: { technician: <id|nullable>, service_notes: "optional" }
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Only admins can assign technicians."},
                status=status.HTTP_403_FORBIDDEN,
            )

        farm = self.get_object()
        tech_id = request.data.get("technician")
        notes = request.data.get("service_notes")

        if tech_id:
            from farmers.models import Farmer
            try:
                technician = Farmer.objects.get(id=tech_id, role=Farmer.Role.TECHNICIAN)
            except Farmer.DoesNotExist:
                return Response(
                    {"detail": "Technician not found or account is not a technician."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            farm.technician = technician
            farm.service_status = Farm.ServiceStatus.ASSIGNED
        else:
            farm.technician = None
            farm.service_status = Farm.ServiceStatus.REQUESTED

        if notes is not None:
            farm.service_notes = notes

        _sync_service_requested(farm)
        farm.save()

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Technician: mark the assigned job as done
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="mark-service-done",
            permission_classes=[IsAuthenticated])
    def mark_service_done(self, request, pk=None):
        """
        Technician-only.
        POST /api/farms/{id}/mark-service-done/
        Body: { service_notes: "what was done", clear_technician: bool }
        """
        farm = self.get_object()
        user = request.user

        if not (_is_technician(user) and farm.technician_id == user.id):
            return Response(
                {"detail": "Only the assigned technician can mark this job done."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notes = (request.data.get("service_notes") or "").strip()
        clear = bool(request.data.get("clear_technician", False))

        if notes:
            existing = farm.service_notes or ""
            separator = "\n\n---\n" if existing.strip() else ""
            farm.service_notes = (existing + separator + notes).strip()

        farm.service_status = Farm.ServiceStatus.COMPLETED

        if clear:
            farm.technician = None

        _sync_service_requested(farm)
        farm.save()

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Farmer: confirm the work is good
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="confirm-service",
            permission_classes=[IsAuthenticated])
    def confirm_service(self, request, pk=None):
        """
        Farmer-only.
        POST /api/farms/{id}/confirm-service/
        Body: { farmer_feedback: "optional comment" }
        """
        farm = self.get_object()
        if farm.farmer_id != request.user.id:
            return Response(
                {"detail": "Only the farm owner can confirm this service."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if farm.service_status != Farm.ServiceStatus.COMPLETED:
            return Response(
                {"detail": "Only jobs awaiting your feedback can be confirmed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        farm.service_status = Farm.ServiceStatus.CONFIRMED
        farm.farmer_satisfied = True
        farm.farmer_feedback = (request.data.get("farmer_feedback") or "").strip() or None
        _sync_service_requested(farm)
        farm.save()

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Farmer: reject and request a redo
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="reject-service",
            permission_classes=[IsAuthenticated])
    def reject_service(self, request, pk=None):
        """
        Farmer-only.
        POST /api/farms/{id}/reject-service/
        Body: { farmer_feedback: "why is this not good?" }

        Puts the farm back in the admin queue with status='requested'.
        """
        farm = self.get_object()
        if farm.farmer_id != request.user.id:
            return Response(
                {"detail": "Only the farm owner can reject this service."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if farm.service_status != Farm.ServiceStatus.COMPLETED:
            return Response(
                {"detail": "Only jobs awaiting your feedback can be rejected."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        feedback = (request.data.get("farmer_feedback") or "").strip()
        if not feedback:
            return Response(
                {"detail": "Please explain what needs to be redone."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        farm.service_status = Farm.ServiceStatus.REQUESTED
        farm.farmer_satisfied = False
        farm.farmer_feedback = feedback
        # Append the farmer's complaint to the running notes so the next tech sees it.
        existing = farm.service_notes or ""
        separator = "\n\n---\n" if existing.strip() else ""
        farm.service_notes = (existing + separator + f"[Farmer redo request] {feedback}").strip()

        _sync_service_requested(farm)
        farm.save()

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Admin: list farms with any active service
    # ---------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="pending-service",
            permission_classes=[IsAuthenticated])
    def pending_service(self, request):
        """
        Admin-only. Returns all farms whose service workflow is not 'none'
        (includes 'confirmed' so admins can see history).
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Admin only."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = (
            Farm.objects
            .exclude(service_status=Farm.ServiceStatus.NONE)
            .select_related("farmer", "technician")
            .order_by("-updated_at")
        )
        return Response(FarmSerializer(qs, many=True).data)


# =========================================================================
# Device
# =========================================================================
class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        farm_ids = _farms_visible_to(user).values_list("id", flat=True)
        return (
            Device.objects
            .filter(farm_id__in=farm_ids)
            .select_related("farm")
            .order_by("-created_at")
        )


# =========================================================================
# SensorReading
# =========================================================================
class SensorReadingViewSet(viewsets.ModelViewSet):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        farm_ids = _farms_visible_to(user).values_list("id", flat=True)

        qs = (
            SensorReading.objects
            .filter(device__farm_id__in=farm_ids)
            .select_related("device")
        )

        device_id = self.request.query_params.get("device")
        if device_id:
            qs = qs.filter(device_id=device_id)

        range_param = self.request.query_params.get("range", "24h")
        hours = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30}.get(range_param, 24)
        qs = qs.filter(recorded_at__gte=timezone.now() - timedelta(hours=hours))

        return qs.order_by("-recorded_at")


# =========================================================================
# Threshold
# =========================================================================
class ThresholdViewSet(viewsets.ModelViewSet):
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        farm_ids = _farms_visible_to(user).values_list("id", flat=True)
        return (
            Threshold.objects
            .filter(device__farm_id__in=farm_ids)
            .select_related("device")
        )


# =========================================================================
# Alert
# =========================================================================
class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        farm_ids = _farms_visible_to(user).values_list("id", flat=True)
        return (
            Alert.objects
            .filter(device__farm_id__in=farm_ids)
            .select_related("device", "device__farm")
        )

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=["patch"])
    def reopen(self, request, pk=None):
        alert = self.get_object()
        alert.is_resolved = False
        alert.resolved_at = None
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return Response(AlertSerializer(alert).data)


# =========================================================================
# DeviceCommand
# =========================================================================
class DeviceCommandViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceCommandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        farm_ids = _farms_visible_to(user).values_list("id", flat=True)
        return (
            DeviceCommand.objects
            .filter(device__farm_id__in=farm_ids)
            .select_related("device", "issued_by")
        )


# =========================================================================
# IoT ingest — ESP32 posts sensor readings here
# =========================================================================
@api_view(["POST"])
@permission_classes([AllowAny])  # TODO: replace with API-key auth
def sensor_data_ingest(request):
    device_uid = request.data.get("device_uid")
    if not device_uid:
        return Response({"detail": "device_uid is required."}, status=400)

    try:
        device = Device.objects.get(device_uid=device_uid)
    except Device.DoesNotExist:
        return Response({"detail": f"Unknown device_uid: {device_uid}"}, status=404)

    serializer = SensorReadingSerializer(data={**request.data, "device": device.id})
    serializer.is_valid(raise_exception=True)
    reading = serializer.save()

    device.status = Device.Status.ONLINE
    device.save(update_fields=["status", "updated_at"])

    return Response(SensorReadingSerializer(reading).data, status=201)


# =========================================================================
# Frontend helpers
# =========================================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request):
    farm_id = request.query_params.get("field")
    farms = _farms_visible_to(request.user)
    if farm_id:
        farms = farms.filter(id=farm_id)

    farm = farms.first()
    if not farm:
        return Response({"detail": "No farm found."}, status=404)

    latest = (
        SensorReading.objects.filter(device__farm=farm)
        .select_related("device")
        .order_by("-recorded_at")
        .first()
    )
    device = Device.objects.filter(farm=farm).first()
    threshold = Threshold.objects.filter(device=device).first() if device else None

    active_alerts = Alert.objects.filter(device__farm=farm, is_resolved=False).count()
    total_devices = Device.objects.filter(farm=farm).count()
    online_devices = Device.objects.filter(farm=farm, status=Device.Status.ONLINE).count()

    return Response({
        "farm": {"id": farm.id, "name": farm.farm_name, "size_hectares": farm.size_hectares},
        "soilMoisture": {
            "value": float(latest.moisture) if latest and latest.moisture is not None else None,
            "unit": "%",
            "targetMin": float(threshold.moisture_min) if threshold else None,
            "targetMax": float(threshold.moisture_max) if threshold else None,
        },
        "environment": {
            "temperature": float(latest.temp_c) if latest and latest.temp_c is not None else None,
            "humidity": float(latest.humidity) if latest and latest.humidity is not None else None,
            "pressure": float(latest.pressure_hpa) if latest and latest.pressure_hpa is not None else None,
            "rain_detected": latest.rain_detected if latest else False,
        },
        "farmStatus": {
            "devicesOnline": online_devices,
            "devicesTotal": total_devices,
            "activeAlerts": active_alerts,
        },
        "lastUpdate": latest.recorded_at if latest else None,
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def monitoring(request):
    farm_id = request.query_params.get("field")
    farms = _farms_visible_to(request.user)
    if farm_id:
        farms = farms.filter(id=farm_id)
    farm = farms.first()
    if not farm:
        return Response({"detail": "No farm found."}, status=404)

    latest = (
        SensorReading.objects.filter(device__farm=farm)
        .order_by("-recorded_at")
        .first()
    )
    if not latest:
        return Response({"detail": "No readings yet."}, status=404)

    return Response({
        "updatedAt": latest.recorded_at,
        "soil": {
            "value": float(latest.moisture) if latest.moisture is not None else None,
            "unit": "%",
            "sensor": latest.device.name,
        },
        "sensors": [
            {"key": "temperature", "label": "Air temperature",
             "value": float(latest.temp_c or 0), "unit": "°C"},
            {"key": "humidity", "label": "Relative humidity",
             "value": float(latest.humidity or 0), "unit": "%"},
            {"key": "pressure", "label": "Pressure",
             "value": float(latest.pressure_hpa or 0), "unit": " hPa"},
            {"key": "light", "label": "Light intensity",
             "value": latest.light_level or 0, "unit": ""},
            {"key": "rain", "label": "Rain sensor",
             "value": "Wet" if latest.rain_detected else "Dry", "unit": ""},
            {"key": "smoke", "label": "Smoke detection",
             "value": latest.smoke_level or 0, "unit": ""},
            {"key": "motion", "label": "Motion security",
             "value": "Detected" if latest.motion_detected else "Clear", "unit": ""},
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def irrigation(request):
    farm_id = request.data.get("field")
    on = bool(request.data.get("on"))

    farms = _farms_visible_to(request.user)
    if farm_id:
        farms = farms.filter(id=farm_id)

    farm = farms.first()
    if not farm:
        return Response({"detail": "No farm found for that field."}, status=404)

    device = Device.objects.filter(farm=farm).first()
    if not device:
        return Response({"detail": "No device found for that farm."}, status=404)

    cmd = DeviceCommand.objects.create(
        device=device,
        issued_by=request.user,
        command=DeviceCommand.Command.PUMP_ON if on else DeviceCommand.Command.PUMP_OFF,
        source=DeviceCommand.Source.MANUAL,
    )
    return Response({"on": on, "command_id": cmd.id})