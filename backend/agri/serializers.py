from rest_framework import serializers

from .models import Farm, Device, SensorReading, Threshold, Alert, DeviceCommand


# =========================================================================
# Farm
# =========================================================================
class FarmSerializer(serializers.ModelSerializer):
    farmer_name = serializers.CharField(source="farmer.name", read_only=True)
    technician_name = serializers.CharField(
        source="technician.name", read_only=True, default=None
    )
    service_status_display = serializers.CharField(
        source="get_service_status_display", read_only=True
    )

    class Meta:
        model = Farm
        fields = (
            "id",
            "farmer",
            "farmer_name",
            "farm_name",
            "location_desc",
            "latitude",
            "longitude",
            "size_hectares",
            "timezone",
            "status",
            "technician",
            "technician_name",
            "service_status",
            "service_status_display",
            "service_requested",
            "service_notes",
            "farmer_feedback",
            "farmer_satisfied",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "farmer",
            "status",
            "technician",
            "technician_name",
            "service_status",
            "service_status_display",
            "service_requested",
            "service_notes",
            "farmer_feedback",
            "farmer_satisfied",
            "created_at",
            "updated_at",
        )


# =========================================================================
# Device
# =========================================================================
class DeviceSerializer(serializers.ModelSerializer):
    farm_name = serializers.CharField(source="farm.farm_name", read_only=True)

    class Meta:
        model = Device
        fields = (
            "id",
            "farm",
            "farm_name",
            "device_uid",
            "name",
            "location",
            "firmware_version",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# =========================================================================
# SensorReading
# =========================================================================
class SensorReadingSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    device_uid = serializers.CharField(source="device.device_uid", read_only=True)

    class Meta:
        model = SensorReading
        fields = (
            "id",
            "device",
            "device_name",
            "device_uid",
            "moisture",
            "temp_c",
            "humidity",
            "pressure_hpa",
            "light_level",
            "rain_detected",
            "soil_ph",
            "smoke_level",
            "flame_detected",
            "motion_detected",
            "recorded_at",
        )
        read_only_fields = ("id", "recorded_at")


# =========================================================================
# Threshold
# =========================================================================
class ThresholdSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)

    class Meta:
        model = Threshold
        fields = (
            "id",
            "device",
            "device_name",
            "moisture_min",
            "moisture_max",
            "pump_on_threshold",
            "frost_temp_alert_c",
            "storm_pressure_drop_hpa",
            "updated_at",
        )
        read_only_fields = ("id", "updated_at")


# =========================================================================
# Alert
# =========================================================================
class AlertSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    farm_name = serializers.CharField(source="device.farm.farm_name", read_only=True)

    class Meta:
        model = Alert
        fields = (
            "id",
            "device",
            "device_name",
            "farm_name",
            "type",
            "severity",
            "message",
            "is_resolved",
            "resolved_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


# =========================================================================
# DeviceCommand
# =========================================================================
class DeviceCommandSerializer(serializers.ModelSerializer):
    device_name = serializers.CharField(source="device.name", read_only=True)
    issued_by_name = serializers.CharField(source="issued_by.name", read_only=True, default=None)

    class Meta:
        model = DeviceCommand
        fields = (
            "id",
            "device",
            "device_name",
            "issued_by",
            "issued_by_name",
            "command",
            "source",
            "acknowledged",
            "acknowledged_at",
            "created_at",
        )
        read_only_fields = ("id", "created_at")