from django.contrib import admin
from .models import Farm, Device, SensorReading, Threshold, Alert, DeviceCommand


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = ("id", "farm_name", "farmer", "location_desc", "size_hectares", "timezone", "created_at")
    list_filter = ("timezone",)
    search_fields = ("farm_name", "location_desc", "farmer__email", "farmer__name")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(Device)
class DeviceAdmin(admin.ModelAdmin):
    list_display = ("id", "device_uid", "name", "farm", "status", "firmware_version", "created_at")
    list_filter = ("status",)
    search_fields = ("device_uid", "name", "farm__farm_name")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "moisture", "temp_c", "humidity", "pressure_hpa", "rain_detected", "recorded_at")
    list_filter = ("rain_detected", "flame_detected", "motion_detected")
    search_fields = ("device__name", "device__device_uid")
    ordering = ("-recorded_at",)
    readonly_fields = ("recorded_at",)


@admin.register(Threshold)
class ThresholdAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "moisture_min", "moisture_max", "pump_on_threshold", "frost_temp_alert_c", "storm_pressure_drop_hpa", "updated_at")
    search_fields = ("device__name", "device__device_uid")
    readonly_fields = ("updated_at",)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "type", "severity", "is_resolved", "created_at")
    list_filter = ("type", "severity", "is_resolved")
    search_fields = ("device__name", "message")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)


@admin.register(DeviceCommand)
class DeviceCommandAdmin(admin.ModelAdmin):
    list_display = ("id", "device", "command", "source", "issued_by", "acknowledged", "created_at")
    list_filter = ("command", "source", "acknowledged")
    search_fields = ("device__name", "device__device_uid")
    ordering = ("-created_at",)
    readonly_fields = ("created_at",)