from django.conf import settings
from django.db import models


# =========================================================================
# 1. Farm
# =========================================================================
class Farm(models.Model):
    """A farm owned by a Farmer."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"

    farmer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="farms",
        db_column="user_id",
    )
    farm_name = models.CharField(max_length=150)
    location_desc = models.CharField(max_length=255, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    size_hectares = models.DecimalField(max_digits=8, decimal_places=2, blank=True, null=True)
    timezone = models.CharField(max_length=64, default="Africa/Johannesburg")
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
    )

    # ---- Technician assignment ----
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_farms",
        limit_choices_to={"role": "technician"},
        db_column="technician_id",
        help_text="Technician responsible for installing/maintaining devices on this farm.",
    )
    service_requested = models.BooleanField(
        default=False,
        help_text="Set to true when this farm needs a technician visit.",
    )
    service_notes = models.TextField(
        blank=True,
        null=True,
        help_text="Instructions or notes for the assigned technician.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "farms"
        indexes = [
            models.Index(fields=["farmer"]),
            models.Index(fields=["status"]),
            models.Index(fields=["technician"]),
        ]
        verbose_name = "Farm"
        verbose_name_plural = "Farms"

    def __str__(self):
        return self.farm_name


# =========================================================================
# 2. Device
# =========================================================================
class Device(models.Model):
    """A physical ESP32 sensor node installed on a farm."""

    class Status(models.TextChoices):
        ONLINE = "online", "Online"
        OFFLINE = "offline", "Offline"
        MAINTENANCE = "maintenance", "Maintenance"

    farm = models.ForeignKey(
        Farm,
        on_delete=models.CASCADE,
        related_name="devices",
        db_column="farm_id",
    )
    device_uid = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=120)
    location = models.CharField(max_length=255, blank=True, null=True)
    firmware_version = models.CharField(max_length=30, blank=True, null=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OFFLINE,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "devices"
        indexes = [
            models.Index(fields=["farm"]),
        ]
        verbose_name = "Device"
        verbose_name_plural = "Devices"

    def __str__(self):
        return f"{self.name} ({self.device_uid})"


# =========================================================================
# 3. SensorReading
# =========================================================================
class SensorReading(models.Model):
    """A single snapshot of all sensor values reported by a Device."""

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="readings",
        db_column="device_id",
    )
    moisture = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    temp_c = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    humidity = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    pressure_hpa = models.DecimalField(max_digits=7, decimal_places=2, blank=True, null=True)
    light_level = models.PositiveIntegerField(blank=True, null=True)
    rain_detected = models.BooleanField(default=False)
    soil_ph = models.DecimalField(max_digits=4, decimal_places=2, blank=True, null=True)
    smoke_level = models.PositiveIntegerField(blank=True, null=True)
    flame_detected = models.BooleanField(default=False)
    motion_detected = models.BooleanField(default=False)

    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sensor_readings"
        indexes = [
            models.Index(fields=["device", "recorded_at"]),
        ]
        ordering = ["-recorded_at"]
        verbose_name = "Sensor Reading"
        verbose_name_plural = "Sensor Readings"

    def __str__(self):
        return f"Reading #{self.pk} for {self.device.name} @ {self.recorded_at:%Y-%m-%d %H:%M}"


# =========================================================================
# 4. Threshold
# =========================================================================
class Threshold(models.Model):
    """Per-device automation thresholds. One row per device."""

    device = models.OneToOneField(
        Device,
        on_delete=models.CASCADE,
        related_name="threshold",
        db_column="device_id",
    )
    moisture_min = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    moisture_max = models.DecimalField(max_digits=5, decimal_places=2, default=80.00)
    pump_on_threshold = models.DecimalField(max_digits=5, decimal_places=2, default=30.00)
    frost_temp_alert_c = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    storm_pressure_drop_hpa = models.DecimalField(max_digits=6, decimal_places=2, default=5.00)

    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "thresholds"
        verbose_name = "Threshold"
        verbose_name_plural = "Thresholds"

    def __str__(self):
        return f"Thresholds for {self.device.name}"


# =========================================================================
# 5. Alert
# =========================================================================
class Alert(models.Model):
    """A warning raised by the system (fire, intrusion, threshold breach, etc.)."""

    class Type(models.TextChoices):
        FIRE = "fire", "Fire"
        INTRUSION = "intrusion", "Intrusion"
        FROST = "frost", "Frost"
        STORM = "storm", "Storm"
        THRESHOLD_BREACH = "threshold_breach", "Threshold Breach"
        LOW_BATTERY = "low_battery", "Low Battery"
        SENSOR_ERROR = "sensor_error", "Sensor Error"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="alerts",
        db_column="device_id",
    )
    type = models.CharField(max_length=30, choices=Type.choices)
    severity = models.CharField(
        max_length=10, choices=Severity.choices, default=Severity.WARNING
    )
    message = models.CharField(max_length=500)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "alerts"
        indexes = [
            models.Index(fields=["device"]),
            models.Index(fields=["is_resolved", "created_at"]),
        ]
        ordering = ["-created_at"]
        verbose_name = "Alert"
        verbose_name_plural = "Alerts"

    def __str__(self):
        return f"[{self.severity}] {self.type} on {self.device.name}"


# =========================================================================
# 6. DeviceCommand
# =========================================================================
class DeviceCommand(models.Model):
    """A command sent to a device (PUMP_ON, PUMP_OFF, REBOOT, OTA_UPDATE)."""

    class Command(models.TextChoices):
        PUMP_ON = "PUMP_ON", "Pump On"
        PUMP_OFF = "PUMP_OFF", "Pump Off"
        REBOOT = "REBOOT", "Reboot"
        OTA_UPDATE = "OTA_UPDATE", "OTA Update"

    class Source(models.TextChoices):
        AUTOMATION = "automation", "Automation"
        MANUAL = "manual", "Manual"

    device = models.ForeignKey(
        Device,
        on_delete=models.CASCADE,
        related_name="commands",
        db_column="device_id",
    )
    issued_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name="issued_commands",
        db_column="issued_by",
    )
    command = models.CharField(max_length=20, choices=Command.choices)
    source = models.CharField(
        max_length=15, choices=Source.choices, default=Source.AUTOMATION
    )
    acknowledged = models.BooleanField(default=False)
    acknowledged_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "device_commands"
        indexes = [
            models.Index(fields=["device", "created_at"]),
            models.Index(fields=["device", "command", "created_at"]),
        ]
        ordering = ["-created_at"]
        verbose_name = "Device Command"
        verbose_name_plural = "Device Commands"

    def __str__(self):
        return f"{self.command} -> {self.device.name} ({self.created_at:%Y-%m-%d %H:%M})"
