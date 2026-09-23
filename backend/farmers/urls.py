from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AdminIdView, MessageViewSet, RegisterView

router = DefaultRouter()
router.register(r"messages", MessageViewSet, basename="message")

urlpatterns = [
    path("register/", RegisterView.as_view(), name="farmer-register"),
    path("admin-id/", AdminIdView.as_view(), name="farmer-admin-id"),
] + router.urls