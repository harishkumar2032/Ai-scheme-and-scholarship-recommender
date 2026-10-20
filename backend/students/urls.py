from django.urls import path

from .views import StudentProfileListCreateView, student_profile_me

urlpatterns = [
    path("", StudentProfileListCreateView.as_view(), name="student-profile-list-create"),
    path("me/", student_profile_me, name="student-profile-me"),
]
