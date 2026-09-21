"""
Seed demo data for Soft-Agri.

Usage:
    python manage.py seed_demo
"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone

from agri.models import (
    Farm,
    Device,
    SensorReading,
    Threshold,
    Alert,
    DeviceCommand,
)


Farmer = get_user_model()


class Command(BaseCommand):
    help = "Populate the database with demo data for Soft-Agri."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing demo data before seeding.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self.stdout.write(self.style.WARNING("Resetting demo data..."))
            DeviceCommand.objects.all().delete()
            Alert.objects.all().delete()
            Threshold.objects.all().delete()
            SensorReading.objects.all().delete()
            Device.objects.all().delete()
            Farm.objects.all().delete()
            Farmer.objects.filter(is_superuser=False).delete()

        # ------------------------------------------------------------------
        # 1. Farmer
        # ------------------------------------------------------------------
        farmer, created = Farmer.objects.get_or_create(
            email="tumiso@softagri.local",
            defaults={
                "name": "Tumiso Mokoena",
                "phone": "+27821234567",
                "status": Farmer.Status.APPROVED,
                "is_active": True,
            },
        )
        if created:
            farmer.set_password("farmer123")
            farmer.save()
            self.stdout.write(self.style.SUCCESS(f"[+] Created farmer: {farmer.email}"))
        else:
            self.stdout.write(self.style.NOTICE(f"[=] Farmer exists: {farmer.email}"))

        # ------------------------------------------------------------------
        # 2. Farm
        # ------------------------------------------------------------------
        farm, created = Farm.objects.get_or_create(
            farmer=farmer,
            farm_name="Demo Farm",
            defaults={
                "location_desc": "Pretoria, Gauteng",
                "latitude": "-25.747900",
                "longitude": "28.229300",
                "size_hectares": "2.50",
                "timezone": "Africa/Johannesburg",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"[+] Created farm: {farm.farm_name}"))
        else:
            self.stdout.write(self.style.NOTICE(f"[=] Farm exists: {farm.farm_name}"))

        # ------------------------------------------------------------------
        # 3. Device
        # ------------------------------------------------------------------
        device, created = Device.objects.get_or_create(
            device_uid="001",
            defaults={
                "farm": farm,
                "name": "Field Sensor Node 1",
                "location": "North field, near irrigation valve",
                "firmware_version": "v1.0.0",
                "status": Device.Status.ONLINE,
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"[+] Created device: {device.name}"))
        else:
            self.stdout.write(self.style.NOTICE(f"[=] Device exists: {device.name}"))

        # ------------------------------------------------------------------
        # 4. Threshold
        # ------------------------------------------------------------------
        threshold, created = Threshold.objects.get_or_create(
            device=device,
            defaults={
                "moisture_min": "20.00",
                "moisture_max": "80.00",
                "pump_on_threshold": "30.00",
                "frost_temp_alert_c": "2.00",
                "storm_pressure_drop_hpa": "5.00",
            },
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"[+] Created threshold for {device.name}"))
        else:
            self.stdout.write(self.style.NOTICE(f"[=] Threshold exists for {device.name}"))

        # ------------------------------------------------------------------
        # 5. Sensor readings (last 24 hours, every hour)
        # ------------------------------------------------------------------
        if SensorReading.objects.filter(device=device).count() < 5:
            now = timezone.now()
            for hours_ago in range(24, 0, -1):
                SensorReading.objects.create(
                    device=device,
                    moisture=28.50 + (hours_ago % 5),
                    temp_c=24.30 + (hours_ago % 3),
                    humidity=60.00 + (hours_ago % 7),
                    pressure_hpa=1013.25,
                    light_level=450,
                    rain_detected=False,
                    soil_ph=6.50,
                    smoke_level=120,
                    flame_detected=False,
                    motion_detected=False,
                )
            self.stdout.write(self.style.SUCCESS("[+] Created 24 demo sensor readings"))
        else:
            self.stdout.write(self.style.NOTICE("[=] Sensor readings already exist"))

        # ------------------------------------------------------------------
        # 6. Alerts
        # ------------------------------------------------------------------
        if Alert.objects.filter(device=device).count() == 0:
            Alert.objects.create(
                device=device,
                type=Alert.Type.THRESHOLD_BREACH,
                severity=Alert.Severity.WARNING,
                message="Soil moisture dropped to 22.4%, below the recommended 30% threshold.",
            )
            Alert.objects.create(
                device=device,
                type=Alert.Type.FIRE,
                severity=Alert.Severity.CRITICAL,
                message="Smoke density exceeded safe threshold near equipment shed.",
            )
            Alert.objects.create(
                device=device,
                type=Alert.Type.INTRUSION,
                severity=Alert.Severity.CRITICAL,
                message="Motion detected near west boundary fence during early morning.",
            )
            self.stdout.write(self.style.SUCCESS("[+] Created 3 demo alerts"))
        else:
            self.stdout.write(self.style.NOTICE("[=] Alerts already exist"))

        # ------------------------------------------------------------------
        # 7. Device commands
        # ------------------------------------------------------------------
        if DeviceCommand.objects.filter(device=device).count() == 0:
            DeviceCommand.objects.create(
                device=device,
                issued_by=None,
                command=DeviceCommand.Command.PUMP_ON,
                source=DeviceCommand.Source.AUTOMATION,
                acknowledged=True,
                acknowledged_at=timezone.now(),
            )
            DeviceCommand.objects.create(
                device=device,
                issued_by=farmer,
                command=DeviceCommand.Command.PUMP_OFF,
                source=DeviceCommand.Source.MANUAL,
            )
            self.stdout.write(self.style.SUCCESS("[+] Created 2 demo commands"))
        else:
            self.stdout.write(self.style.NOTICE("[=] Device commands already exist"))

        # ------------------------------------------------------------------
        # Done
        # ------------------------------------------------------------------
        self.stdout.write(self.style.SUCCESS("\n=== Demo data seeded successfully ==="))
        self.stdout.write(f"    Farmer login: {farmer.email} / farmer123")
        self.stdout.write(f"    Farm: {farm.farm_name}")
        self.stdout.write(f"    Device UID: {device.device_uid}")