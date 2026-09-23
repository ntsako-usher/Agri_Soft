from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Farmer, Message
from .serializers import MessageSerializer, RegisterSerializer


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


class AdminIdView(APIView):
    """
    GET /api/farmers/admin-id/
    Returns the id and name of the first staff farmer.
    Used by farmers to know who to message.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        admin = Farmer.objects.filter(is_staff=True).order_by("id").first()
        if not admin:
            return Response({"id": None, "name": None, "email": None})
        return Response({
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
        })


class MessageViewSet(viewsets.ModelViewSet):
    """
    Farmer ↔ Admin chat.

    GET  /api/farmers/messages/                  — messages involving current user
    GET  /api/farmers/messages/?with=<farmer_id> — messages between current user and that farmer
    POST /api/farmers/messages/                  — send {recipient, body}
    PATCH /api/farmers/messages/{id}/            — mark as read (is_read: true)

    GET  /api/farmers/messages/conversations/    — (admin only) list of farmers
                                                   who have messaged the admin
    """
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Message.objects.filter(
            models.Q(sender=user) | models.Q(recipient=user)
        ).order_by("created_at")

        # Optional filter: /messages/?with=<farmer_id>
        with_id = self.request.query_params.get("with")
        if with_id:
            qs = qs.filter(
                models.Q(sender=user, recipient_id=with_id) |
                models.Q(sender_id=with_id, recipient=user)
            )

        return qs

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_read = request.data.get("is_read")
        if is_read is not None:
            instance.is_read = bool(is_read)
            instance.save(update_fields=["is_read"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="conversations")
    def conversations(self, request):
        """
        Admin-only: returns a list of farmers who have exchanged messages
        with the current user (admin). Each entry includes the farmer's
        info + the last message + unread count.
        """
        if not request.user.is_staff:
            return Response(
                {"detail": "Only admins can list conversations."},
                status=status.HTTP_403_FORBIDDEN,
            )

        me = request.user

        # All messages involving me
        qs = Message.objects.filter(
            models.Q(sender=me) | models.Q(recipient=me)
        ).select_related("sender", "recipient")

        # Group by the OTHER farmer
        convo_map = {}
        for msg in qs.order_by("created_at"):
            other = msg.recipient if msg.sender_id == me.id else msg.sender
            if not other or other.id == me.id:
                continue
            entry = convo_map.setdefault(other.id, {
                "farmer_id": other.id,
                "name": other.name,
                "email": other.email,
                "last_message": "",
                "last_at": None,
                "unread": 0,
            })
            entry["last_message"] = msg.body
            entry["last_at"] = msg.created_at.isoformat()
            if msg.recipient_id == me.id and not msg.is_read:
                entry["unread"] += 1

        # Sort by most recent first
        convo_list = sorted(
            convo_map.values(),
            key=lambda c: c["last_at"] or "",
            reverse=True,
        )
        return Response(convo_list)