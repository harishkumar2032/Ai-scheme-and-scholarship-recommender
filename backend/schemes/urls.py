from django.urls import path

from .views import SchemeDetailView, SchemeListCreateView

urlpatterns = [
    path("", SchemeListCreateView.as_view(), name="scheme-list-create"),
    path("<int:pk>/", SchemeDetailView.as_view(), name="scheme-detail"),
]
