from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import Farmer


@admin.register(Farmer)
class FarmerAdmin(BaseUserAdmin):
    list_display = ("email", "name", "status_badge", "is_staff", "is_active", "created_at")
    list_editable = ("is_staff", "is_active")   # status now edited via actions
    list_filter = ("status", "is_staff", "is_active")
    search_fields = ("email", "name", "phone")
    ordering = ("-created_at",)

    actions = ("approve_farmers", "reject_farmers", "reset_to_pending")
    actions_on_top = True
    actions_on_bottom = True

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("name", "phone")}),
        ("Status", {"fields": ("status",)}),
        (
            "Permissions",
            {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    readonly_fields = ("created_at", "updated_at", "last_login")

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "name", "phone", "password1", "password2", "status"),
            },
        ),
    )

    # ---------- Color-coded status column ----------
    @admin.display(description="Status", ordering="status")
    def status_badge(self, obj):
        colors = {
            Farmer.Status.APPROVED: ("#0f5132", "#d1e7dd"),  # green
            Farmer.Status.PENDING:  ("#664d03", "#fff3cd"),  # amber
            Farmer.Status.REJECTED: ("#842029", "#f8d7da"),  # red
        }
        fg, bg = colors.get(obj.status, ("#333", "#eee"))
        return format_html(
            '<span style="padding:3px 10px;border-radius:999px;'
            'font-size:12px;font-weight:600;color:{};background:{};">{}</span>',
            fg, bg, obj.get_status_display(),
        )

    # ---------- Admin actions ----------
    @admin.action(description="✅ Approve selected farmers")
    def approve_farmers(self, request, queryset):
        updated = queryset.update(status=Farmer.Status.APPROVED, is_active=True)
        self.message_user(request, f"{updated} farmer(s) approved and activated.")

    @admin.action(description="❌ Reject selected farmers")
    def reject_farmers(self, request, queryset):
        updated = queryset.update(status=Farmer.Status.REJECTED, is_active=False)
        self.message_user(request, f"{updated} farmer(s) rejected and deactivated.")

    @admin.action(description="⏳ Reset selected farmers to pending")
    def reset_to_pending(self, request, queryset):
        updated = queryset.update(status=Farmer.Status.PENDING)
        self.message_user(request, f"{updated} farmer(s) set to pending.")