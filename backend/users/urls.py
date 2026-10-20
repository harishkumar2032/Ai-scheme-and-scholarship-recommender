from django.urls import path

from .views import UserListCreateView, current_user, login_user, logout_user, register_user

urlpatterns = [
    path("", UserListCreateView.as_view(), name="user-list-create"),
    path("register/", register_user, name="register-user"),
    path("login/", login_user, name="login-user"),
    path("logout/", logout_user, name="logout-user"),
    path("me/", current_user, name="current-user"),
]
