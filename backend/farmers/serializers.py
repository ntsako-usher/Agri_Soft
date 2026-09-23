from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Farmer, Message


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login with email. Also accepts 'username' as an alias
    because the React frontend sends { username, password }.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"] = serializers.CharField(required=False, write_only=True)
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        if not attrs.get(self.username_field) and attrs.get("username"):
            attrs[self.username_field] = attrs.pop("username")
        attrs.pop("username", None)

        if not attrs.get(self.username_field):
            raise serializers.ValidationError(
                {self.username_field: "This field is required."}
            )
        return super().validate(attrs)

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["name"] = user.name
        token["email"] = user.email
        token["status"] = user.status
        token["role"] = user.role
        token["is_staff"] = user.is_staff
        return token


class FarmerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = ("id", "name", "email", "phone", "status", "role", "created_at")
        read_only_fields = ("id", "created_at", "role", "status")


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Farmer
        fields = (
            "id", "name", "email", "phone",
            "password", "confirm_password", "address",
        )
        read_only_fields = ("id",)

    def validate_email(self, value):
        value = value.lower().strip()
        if Farmer.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A farmer with this email already exists.")
        return value

    def validate(self, attrs):
        pw = attrs.get("password")
        confirm = attrs.pop("confirm_password", None)
        if confirm is not None and pw != confirm:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        attrs.pop("address", None)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        farmer = Farmer(**validated_data)
        farmer.set_password(password)
        farmer.status = Farmer.Status.PENDING
        farmer.role = Farmer.Role.FARMER
        farmer.save()
        return farmer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source="sender.name", read_only=True)
    recipient_name = serializers.CharField(source="recipient.name", read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "sender", "sender_name",
            "recipient", "recipient_name",
            "body",
            "is_read",
            "created_at",
        )
        read_only_fields = ("id", "sender", "is_read", "created_at")


class ChangePasswordSerializer(serializers.Serializer):
    """Validates a change-password request for the logged-in user."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        return user