from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html

from .models import Farmer, Message


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


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "sender_name", "recipient_name", "body_preview", "is_read", "created_at")
    list_filter = ("is_read", "created_at")
    search_fields = ("sender__email", "sender__name", "recipient__email", "recipient__name", "body")
    ordering = ("-created_at",)
    date_hierarchy = "created_at"
    list_per_page = 50

    # Only the timestamp is read-only — sender/recipient/body are editable
    readonly_fields = ("created_at",)

    actions = ("mark_as_read", "mark_as_unread")
    actions_on_top = True

    fieldsets = (
        (None, {"fields": ("sender", "recipient")}),
        ("Message", {"fields": ("body", "is_read")}),
        ("Metadata", {"fields": ("created_at",)}),
    )

    @admin.display(description="From", ordering="sender__name")
    def sender_name(self, obj):
        return obj.sender.name if obj.sender else "—"

    @admin.display(description="To", ordering="recipient__name")
    def recipient_name(self, obj):
        return obj.recipient.name if obj.recipient else "—"

    @admin.display(description="Message")
    def body_preview(self, obj):
        text = obj.body or ""
        return text[:60] + ("…" if len(text) > 60 else "")

    # ---------- Admin actions ----------
    @admin.action(description="✔ Mark selected messages as read")
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True)
        self.message_user(request, f"{updated} message(s) marked as read.")

    @admin.action(description="✘ Mark selected messages as unread")
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False)
        self.message_user(request, f"{updated} message(s) marked as unread.")