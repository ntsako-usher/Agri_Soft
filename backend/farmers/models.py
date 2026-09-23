from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class FarmerManager(BaseUserManager):
    """Custom manager for the Farmer model (email as username)."""

    def create_user(self, email, name, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        extra_fields.setdefault("status", Farmer.Status.APPROVED)
        extra_fields.setdefault("role", Farmer.Role.ADMIN)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, name, password, **extra_fields)


class Farmer(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model for Soft-Agri.

    Every account (farmer, technician, admin) lives in this single table.
    - `role` distinguishes the business role.
    - `is_staff` / `is_superuser` grant Django admin access.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    class Role(models.TextChoices):
        FARMER = "farmer", "Farmer"
        TECHNICIAN = "technician", "Technician"
        ADMIN = "admin", "Admin"

    name = models.CharField(max_length=120)
    email = models.EmailField(max_length=180, unique=True)
    phone = models.CharField(max_length=30, blank=True, null=True)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.FARMER,
        help_text="Business role: farmer, technician, or admin.",
    )

    # Django-required flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    objects = FarmerManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    class Meta:
        db_table = "farmers"
        verbose_name = "Farmer"
        verbose_name_plural = "Farmers"
        indexes = [
            models.Index(fields=["status"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self):
        return f"{self.name} <{self.email}> [{self.role}]"

    @property
    def is_approved(self):
        return self.status == self.Status.APPROVED


class Message(models.Model):
    """
    Direct message between two Farmer rows.
    In practice: farmer ↔ admin, and (later) farmer ↔ technician.
    """

    sender = models.ForeignKey(
        Farmer,
        on_delete=models.CASCADE,
        related_name="sent_messages",
    )
    recipient = models.ForeignKey(
        Farmer,
        on_delete=models.CASCADE,
        related_name="received_messages",
    )
    body = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        indexes = [
            models.Index(fields=["sender", "created_at"]),
            models.Index(fields=["recipient", "created_at"]),
            models.Index(fields=["is_read"]),
        ]

    def __str__(self):
        return f"{self.sender.email} → {self.recipient.email}: {self.body[:40]}"