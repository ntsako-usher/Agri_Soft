from django import forms
from django.contrib import admin, messages
from django.contrib.admin import helpers
from django.http import HttpResponseRedirect
from django.shortcuts import render
from django.urls import path, reverse
from django.utils.html import format_html

from farmers.models import Farmer
from .models import Farm, Device, SensorReading, Threshold, Alert, DeviceCommand


# =========================================================================
# Custom form used by the "Assign technician" admin action
# =========================================================================
class AssignTechnicianForm(forms.Form):
    technician = forms.ModelChoiceField(
        queryset=Farmer.objects.none(),   # populated in __init__
        required=True,
        label="Available technician",
        empty_label="— Select an available technician —",
    )
    service_notes = forms.CharField(
        required=False,
        widget=forms.Textarea(attrs={"rows": 3}),
        label="Instructions for the technician (optional)",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Only show technicians who are approved and not busy
        self.fields["technician"].queryset = Farm.available_technicians()


# =========================================================================
# Farm admin
# =========================================================================
@admin.register(Farm)
class FarmAdmin(admin.ModelAdmin):
    list_display = (
        "id", "farm_name", "farmer", "status_badge",
        "technician", "service_status_badge",
        "location_desc", "size_hectares", "timezone", "created_at",
    )
    list_filter = ("status", "service_status", "timezone")
    search_fields = (
        "farm_name", "location_desc",
        "farmer__email", "farmer__name",
        "technician__email", "technician__name",
    )
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at", "farmer_feedback", "farmer_satisfied")

    actions = (
        "approve_farms",
        "reject_farms",
        "reset_to_pending",
        "request_service",
        "assign_technician_action",
        "mark_service_complete",
    )
    actions_on_top = True
    actions_on_bottom = True

    fieldsets = (
        (None, {"fields": ("farm_name", "farmer", "status")}),
        ("Location", {"fields": ("location_desc", "latitude", "longitude", "timezone")}),
        ("Size", {"fields": ("size_hectares",)}),
        (
            "Service",
            {
                "fields": (
                    "technician", "service_status",
                    "service_requested", "service_notes",
                    "farmer_feedback", "farmer_satisfied",
                ),
                "description": (
                    "Use the 'Assign technician to selected farms' action "
                    "in the list view for a cleaner workflow."
                ),
            },
        ),
        ("Metadata", {"fields": ("created_at", "updated_at")}),
    )

    # ---------------------------------------------------------------------
    # Badges
    # ---------------------------------------------------------------------
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

    @admin.display(description="Service", ordering="service_status")
    def service_status_badge(self, obj):
        colors = {
            Farm.ServiceStatus.NONE:      ("#333",    "#eee"),
            Farm.ServiceStatus.REQUESTED: ("#664d03", "#fff3cd"),
            Farm.ServiceStatus.ASSIGNED:  ("#084298", "#cfe2ff"),
            Farm.ServiceStatus.COMPLETED: ("#0f5132", "#d1e7dd"),
            Farm.ServiceStatus.CONFIRMED: ("#0f5132", "#d1e7dd"),
        }
        fg, bg = colors.get(obj.service_status, ("#333", "#eee"))
        return format_html(
            '<span style="padding:3px 10px;border-radius:999px;'
            'font-size:12px;font-weight:600;color:{};background:{};">{}</span>',
            fg, bg, obj.get_service_status_display(),
        )

    # ---------------------------------------------------------------------
    # Filter the FK dropdown to available technicians only
    # ---------------------------------------------------------------------
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "technician":
            kwargs["queryset"] = Farm.available_technicians()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    # ---------------------------------------------------------------------
    # Block reassignment while service is in progress
    # ---------------------------------------------------------------------
    def save_model(self, request, obj, form, change):
        if change:
            previous = Farm.objects.get(pk=obj.pk)
            if (
                previous.service_status == Farm.ServiceStatus.ASSIGNED
                and previous.technician_id != obj.technician_id
            ):
                obj.technician_id = previous.technician_id
                self.message_user(
                    request,
                    "This farm's service is in progress. Mark it complete before reassigning.",
                    level=messages.WARNING,
                )
        super().save_model(request, obj, form, change)

    # ---------------------------------------------------------------------
    # Custom action: Assign technician to selected farms
    # ---------------------------------------------------------------------
    @admin.action(description="Assign technician to selected farms")
    def assign_technician_action(self, request, queryset):
        # Step 2: user submitted the intermediate form
        if "apply" in request.POST:
            form = AssignTechnicianForm(request.POST)
            if form.is_valid():
                technician = form.cleaned_data["technician"]
                notes = form.cleaned_data.get("service_notes") or ""
                count = 0
                for farm in queryset:
                    if farm.service_status == Farm.ServiceStatus.ASSIGNED:
                        continue
                    farm.technician = technician
                    farm.service_status = Farm.ServiceStatus.ASSIGNED
                    farm.service_requested = True
                    if notes:
                        farm.service_notes = notes
                    farm.save()
                    count += 1
                self.message_user(
                    request,
                    f"{technician.name} assigned to {count} farm(s).",
                    level=messages.SUCCESS,
                )
                return HttpResponseRedirect(request.get_full_path())
        else:
            # Step 1: show the intermediate form
            form = AssignTechnicianForm()

        context = {
            **self.admin_site.each_context(request),
            "title": "Assign technician",
            "queryset": queryset,
            "form": form,
            "opts": self.model._meta,
            "action_checkbox_name": helpers.ACTION_CHECKBOX_NAME,
            "media": self.media + form.media,
        }
        return render(
            request,
            "admin/agri/assign_technician.html",
            context,
        )

    # ---------------------------------------------------------------------
    # Bulk actions
    # ---------------------------------------------------------------------
    @admin.action(description="Approve selected farms")
    def approve_farms(self, request, queryset):
        updated = queryset.update(status=Farm.Status.APPROVED)
        self.message_user(request, f"{updated} farm(s) approved.")

    @admin.action(description="Reject selected farms")
    def reject_farms(self, request, queryset):
        updated = queryset.update(status=Farm.Status.REJECTED)
        self.message_user(request, f"{updated} farm(s) rejected.")

    @admin.action(description="Reset selected farms to pending")
    def reset_to_pending(self, request, queryset):
        updated = queryset.update(status=Farm.Status.PENDING)
        self.message_user(request, f"{updated} farm(s) set to pending.")

    @admin.action(description="Request technician service")
    def request_service(self, request, queryset):
        updated = queryset.update(
            service_requested=True,
            service_status=Farm.ServiceStatus.REQUESTED,
        )
        self.message_user(request, f"{updated} farm(s) flagged for service.")

    @admin.action(description="Mark service complete (frees the technician)")
    def mark_service_complete(self, request, queryset):
        updated = queryset.update(
            service_status=Farm.ServiceStatus.COMPLETED,
            service_requested=False,
        )
        self.message_user(
            request,
            f"{updated} farm(s) marked as completed. Technicians are now available again.",
        )


# =========================================================================
# Device / SensorReading / Threshold / Alert / DeviceCommand — unchanged
# =========================================================================
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