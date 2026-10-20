from django.contrib.auth import authenticate, login, logout
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import AppUser
from .serializers import LoginSerializer, RegisterSerializer, UserSerializer


class UserListCreateView(generics.ListCreateAPIView):
    queryset = AppUser.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_user(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        login(request, user)
        return Response(
            {
                "user": UserSerializer(user).data,
                "message": "Registration successful.",
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    user = authenticate(
        request,
        username=serializer.validated_data["username"],
        password=serializer.validated_data["password"],
    )

    if user is None:
        return Response({"detail": "Invalid username or password."}, status=status.HTTP_401_UNAUTHORIZED)

    login(request, user)
    return Response({"user": UserSerializer(user).data, "message": "Login successful."})


from django.views.decorators.csrf import ensure_csrf_cookie


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def logout_user(request):
    logout(request)
    return Response({"message": "Logged out successfully."})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def current_user(request):
    if not request.user.is_authenticated:
        return Response({"authenticated": False, "user": None}, status=status.HTTP_200_OK)
    return Response({"authenticated": True, "user": UserSerializer(request.user).data}, status=status.HTTP_200_OK)
