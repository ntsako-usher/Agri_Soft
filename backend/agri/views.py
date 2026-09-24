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
    Return the queryset of Farms the given user is allowed to see.
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
        # Only farmers can create farms. A technician should never create one.
        if _is_technician(self.request.user):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Technicians cannot create farms.")
        serializer.save(farmer=self.request.user)

    # ---------------------------------------------------------------------
    # Admin: assign a technician to a farm
    # ---------------------------------------------------------------------
    @action(detail=True, methods=["post"], url_path="assign-technician",
            permission_classes=[IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """
        Admin-only.
        POST /api/farms/{id}/assign-technician/
        Body: { technician: <farmer_id>, service_notes: "optional" }
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Only admins can assign technicians."},
                status=status.HTTP_403_FORBIDDEN,
            )

        farm = self.get_object()
        tech_id = request.data.get("technician")
        notes = request.data.get("service_notes", "")

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
        else:
            farm.technician = None

        farm.service_notes = notes
        farm.service_requested = bool(farm.technician)
        farm.save(update_fields=[
            "technician", "service_notes", "service_requested", "updated_at"
        ])

        # TODO: notify the technician by email/SMS.

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
        Body: { service_notes: "what was done", clear_technician: true|false }

        Clears the service_requested flag so the admin/farmer knows the
        job is done. By default the technician stays assigned (so history
        is preserved); pass clear_technician=true to release them.
        """
        farm = self.get_object()
        user = request.user

        if not (_is_technician(user) and farm.technician_id == user.id):
            return Response(
                {"detail": "Only the assigned technician can mark this job done."},
                status=status.HTTP_403_FORBIDDEN,
            )

        notes = request.data.get("service_notes", "")
        clear = bool(request.data.get("clear_technician", False))

        farm.service_requested = False
        if notes:
            existing = farm.service_notes or ""
            farm.service_notes = (existing + "\n\n---\n" + notes).strip()
        if clear:
            farm.technician = None

        farm.save(update_fields=[
            "service_requested", "service_notes",
            "technician", "updated_at",
        ])

        # TODO: notify admin + farmer by email/SMS.

        return Response(FarmSerializer(farm).data)

    # ---------------------------------------------------------------------
    # Admin: list farms that still need service
    # ---------------------------------------------------------------------
    @action(detail=False, methods=["get"], url_path="pending-service",
            permission_classes=[IsAuthenticated])
    def pending_service(self, request):
        """
        Admin-only.
        GET /api/farms/pending-service/
        Returns farms with service_requested=True (either unassigned or in progress).
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Admin only."},
                status=status.HTTP_403_FORBIDDEN,
            )
        qs = Farm.objects.filter(service_requested=True).select_related(
            "farmer", "technician"
        ).order_by("-updated_at")
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

        # Optional filters: ?device=<id>&range=24h|7d|30d
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
        """Mark an alert as resolved. PATCH /api/alerts/{id}/resolve/"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=["patch"])
    def reopen(self, request, pk=None):
        """Reopen a resolved alert. PATCH /api/alerts/{id}/reopen/"""
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
# IoT ingest — ESP32 posts sensor readings here (API-key auth in prod)
# =========================================================================
@api_view(["POST"])
@permission_classes([AllowAny])  # TODO: replace with API-key auth
def sensor_data_ingest(request):
    """
    Ingest a sensor reading from an ESP32.
    Body: { device_uid, moisture, temp_c, humidity, pressure_hpa,
            light_level, rain_detected, soil_ph, smoke_level,
            flame_detected, motion_detected }
    """
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

    # Update device status to online
    device.status = Device.Status.ONLINE
    device.save(update_fields=["status", "updated_at"])

    return Response(SensorReadingSerializer(reading).data, status=201)


# =========================================================================
# Frontend helper endpoints
# =========================================================================
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overview(request):
    """
    Dashboard summary for a farm.
    /api/overview/?field=<farm_id>

    Farmers see their own farms.
    Technicians see farms assigned to them.
    Admins see all.
    """
    farm_id = request.query_params.get("field")
    farms = _farms_visible_to(request.user)
    if farm_id:
        farms = farms.filter(id=farm_id)

    farm = farms.first()
    if not farm:
        return Response({"detail": "No farm found."}, status=404)

    # Latest reading from any device on this farm
    latest = (
        SensorReading.objects.filter(device__farm=farm)
        .select_related("device")
        .order_by("-recorded_at")
        .first()
    )

    # Threshold from the primary device
    device = Device.objects.filter(farm=farm).first()
    threshold = Threshold.objects.filter(device=device).first() if device else None

    active_alerts = Alert.objects.filter(device__farm=farm, is_resolved=False).count()
    total_devices = Device.objects.filter(farm=farm).count()
    online_devices = Device.objects.filter(farm=farm, status=Device.Status.ONLINE).count()

    return Response({
        "farm": {
            "id": farm.id,
            "name": farm.farm_name,
            "size_hectares": farm.size_hectares,
        },
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
    """
    Live monitoring snapshot. /api/monitoring/?field=<farm_id>
    Same role-scoping as overview.
    """
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
    """
    Toggle irrigation for a farm.
    Body: { field: <farm_id>, on: true|false }

    Farmers can control their own farms.
    Admins can control any farm.
    Technicians are allowed on farms assigned to them (they may be on-site).
    """
    farm_id = request.data.get("field")
    on = bool(request.data.get("on"))

    farms = _farms_visible_to(request.user)
    if farm_id:
        farms = farms.filter(id=farm_id)

    farm = farms.first()
    if not farm:
        return Response(
            {"detail": "No farm found for that field."},
            status=404,
        )

    device = Device.objects.filter(farm=farm).first()
    if not device:
        return Response(
            {"detail": "No device found for that farm."},
            status=404,
        )

    cmd = DeviceCommand.objects.create(
        device=device,
        issued_by=request.user,
        command=DeviceCommand.Command.PUMP_ON if on else DeviceCommand.Command.PUMP_OFF,
        source=DeviceCommand.Source.MANUAL,
    )

    # TODO: Publish to MQTT topic softagri/command/<device_uid>
    return Response({"on": on, "command_id": cmd.id})