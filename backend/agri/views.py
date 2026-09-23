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
# CRUD ViewSets
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
        user = self.request.user
        qs = Farm.objects.all().select_related("farmer", "technician")

        if user.is_staff:
            return qs.order_by("-created_at")
        if getattr(user, "role", None) == "technician":
            return qs.filter(technician=user).order_by("-created_at")
        return qs.filter(farmer=user).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user)

    @action(detail=True, methods=["post"], url_path="assign-technician",
            permission_classes=[IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """
        Admin-only: assign a technician to this farm.
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
        farm.save(update_fields=["technician", "service_notes", "service_requested", "updated_at"])

        return Response(FarmSerializer(farm).data)


class DeviceViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Device.objects.filter(
            farm__farmer=self.request.user
        ).select_related("farm").order_by("-created_at")


class SensorReadingViewSet(viewsets.ModelViewSet):
    serializer_class = SensorReadingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SensorReading.objects.filter(
            device__farm__farmer=self.request.user
        ).select_related("device")

        # Optional filters: ?device=<id>&range=24h|7d|30d
        device_id = self.request.query_params.get("device")
        if device_id:
            qs = qs.filter(device_id=device_id)

        range_param = self.request.query_params.get("range", "24h")
        hours = {"24h": 24, "7d": 24 * 7, "30d": 24 * 30}.get(range_param, 24)
        qs = qs.filter(recorded_at__gte=timezone.now() - timedelta(hours=hours))

        return qs.order_by("-recorded_at")


class ThresholdViewSet(viewsets.ModelViewSet):
    serializer_class = ThresholdSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Threshold.objects.filter(
            device__farm__farmer=self.request.user
        ).select_related("device")


class AlertViewSet(viewsets.ModelViewSet):
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Alert.objects.filter(
            device__farm__farmer=self.request.user
        ).select_related("device", "device__farm")

    @action(detail=True, methods=["patch"])
    def resolve(self, request, pk=None):
        """Mark an alert as resolved. POST /api/alerts/{id}/resolve/"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return Response(AlertSerializer(alert).data)

    @action(detail=True, methods=["patch"])
    def reopen(self, request, pk=None):
        """Reopen a resolved alert. POST /api/alerts/{id}/reopen/"""
        alert = self.get_object()
        alert.is_resolved = False
        alert.resolved_at = None
        alert.save(update_fields=["is_resolved", "resolved_at"])
        return Response(AlertSerializer(alert).data)


class DeviceCommandViewSet(viewsets.ModelViewSet):
    serializer_class = DeviceCommandSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return DeviceCommand.objects.filter(
            device__farm__farmer=self.request.user
        ).select_related("device", "issued_by")


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
    """Dashboard summary for a field. /api/overview/?field=<farm_id>"""
    farm_id = request.query_params.get("field")
    farms = Farm.objects.filter(farmer=request.user)
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
    """Live monitoring snapshot. /api/monitoring/?field=<farm_id>"""
    farm_id = request.query_params.get("field")
    farms = Farm.objects.filter(farmer=request.user)
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
            {"key": "temperature", "label": "Air temperature", "value": float(latest.temp_c or 0), "unit": "°C"},
            {"key": "humidity", "label": "Relative humidity", "value": float(latest.humidity or 0), "unit": "%"},
            {"key": "pressure", "label": "Pressure", "value": float(latest.pressure_hpa or 0), "unit": " hPa"},
            {"key": "light", "label": "Light intensity", "value": latest.light_level or 0, "unit": ""},
            {"key": "rain", "label": "Rain sensor", "value": "Wet" if latest.rain_detected else "Dry", "unit": ""},
            {"key": "smoke", "label": "Smoke detection", "value": latest.smoke_level or 0, "unit": ""},
            {"key": "motion", "label": "Motion security", "value": "Detected" if latest.motion_detected else "Clear", "unit": ""},
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def irrigation(request):
    """Toggle irrigation for a field. Body: {field: <farm_id>, on: true|false}"""
    farm_id = request.data.get("field")
    on = bool(request.data.get("on"))

    device = Device.objects.filter(farm_id=farm_id, farm__farmer=request.user).first()
    if not device:
        return Response({"detail": "No device found for that field."}, status=404)

    cmd = DeviceCommand.objects.create(
        device=device,
        issued_by=request.user,
        command=DeviceCommand.Command.PUMP_ON if on else DeviceCommand.Command.PUMP_OFF,
        source=DeviceCommand.Source.MANUAL,
    )

    # TODO: Publish to MQTT topic softagri/command/<device_uid>
    return Response({"on": on, "command_id": cmd.id})