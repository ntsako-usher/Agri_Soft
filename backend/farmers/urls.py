from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    AdminIdView,
    ChangePasswordView,
    MessageViewSet,
    RegisterView,
)

router = DefaultRouter()
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="farmer-register"),
    path("admin-id/", AdminIdView.as_view(), name="farmer-admin-id"),
    path("change-password/", ChangePasswordView.as_view(), name="farmer-change-password"),
] + router.urls