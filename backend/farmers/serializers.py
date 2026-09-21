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