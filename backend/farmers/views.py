from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import RegisterSerializer


class RegisterView(APIView):
    """
    POST /api/farmers/register/
    Body: { name, email, phone?, password, confirm_password?, address? }
    Creates a Farmer with status=PENDING.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            farmer = serializer.save()
            return Response(
                {
                    "id": farmer.id,
                    "name": farmer.name,
                    "email": farmer.email,
                    "phone": farmer.phone,
                    "status": farmer.status,
                    "message": "Account created. Awaiting admin approval.",
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)