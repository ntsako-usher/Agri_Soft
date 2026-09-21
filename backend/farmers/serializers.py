from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import Farmer


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login with email. Also accepts 'username' as an alias
    because the React frontend sends { username, password }.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["username"] = serializers.CharField(required=False, write_only=True)
        # Make email optional at field level so 'username' alone can succeed
        self.fields[self.username_field].required = False

    def validate(self, attrs):
        # If only 'username' was sent, treat it as 'email'
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
        return token


class FarmerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = ("id", "name", "email", "phone", "status", "created_at")
        read_only_fields = ("id", "created_at")


class RegisterSerializer(serializers.ModelSerializer):
    """
    Signup serializer. Creates a Farmer with status=PENDING.
    Accepts optional 'address' from the frontend and stores it in 'phone'
    only if phone wasn't sent — otherwise ignores it (no address column on model).
    """

    password = serializers.CharField(write_only=True, min_length=6)
    confirm_password = serializers.CharField(write_only=True, required=False)
    address = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Farmer
        fields = ("id", "name", "email", "phone", "password", "confirm_password", "address")
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
        # 'address' is accepted but not stored (no model field) — drop it
        attrs.pop("address", None)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        farmer = Farmer(**validated_data)
        farmer.set_password(password)
        farmer.status = Farmer.Status.PENDING
        farmer.save()
        return farmer