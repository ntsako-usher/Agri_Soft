from django.contrib import admin
from django.utils.html import format_html

from .models import Farm, Device, SensorReading, Threshold, Alert, DeviceCommand


@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = (
        "id", "farm_name", "farmer", "status_badge",
        "technician", "service_requested",
        "location_desc", "size_hectares", "timezone", "created_at",
    )
    list_filter = ("status", "service_requested", "timezone")
    search_fields = (
        "farm_name", "location_desc",
        "farmer__email", "farmer__name",
        "technician__email", "technician__name",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")

    actions = (
        "approve_farms", "reject_farms", "reset_to_pending",
        "request_service",
    )
    actions_on_top = True
    actions_on_bottom = True

    fieldsets = (
        (None, {"fields": ("farm_name", "farmer", "status")}),
        ("Location", {"fields": ("location_desc", "latitude", "longitude", "timezone")}),
        ("Size", {"fields": ("size_hectares",)}),
        ("Service", {"fields": ("technician", "service_requested", "service_notes")}),
        ("Metadata", {"fields": ("created_at", "updated_at")}),
    )

    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            Farm.Status.APPROVED: ("#0f5132", "#d1e7dd"),
            Farm.Status.PENDING:  ("#664d03", "#fff3cd"),
            Farm.Status.REJECTED: ("#842029", "#f8d7da"),
        }
        fg, bg = colors.get(obj.status, ("#333", "#eee"))
        return format_html(
            '<span style="padding:3px 10px;border-radius:999px;'
            'font-size:12px;font-weight:600;color:{};background:{};">{}</span>',
            fg, bg, obj.get_status_display(),
        )

    @admin.action(description="✅ Approve selected farms")
    def approve_farms(self, request, queryset):
        updated = queryset.update(status=Farm.Status.APPROVED)
        self.message_user(request, f"{updated} farm(s) approved.")

    @admin.action(description="❌ Reject selected farms")
    def reject_farms(self, request, queryset):
        updated = queryset.update(status=Farm.Status.REJECTED)
        self.message_user(request, f"{updated} farm(s) rejected.")

    @admin.action(description="⏳ Reset selected farms to pending")
    def reset_to_pending(self, request, queryset):
        updated = queryset.update(status=Farm.Status.PENDING)
        self.message_user(request, f"{updated} farm(s) set to pending.")

    @admin.action(description="🔧 Request technician service")
    def request_service(self, request, queryset):
        updated = queryset.update(service_requested=True)
        self.message_user(request, f"{updated} farm(s) flagged for service.")


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
