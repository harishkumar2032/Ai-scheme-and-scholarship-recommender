from rest_framework import serializers

from .models import AppUser


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = AppUser
        fields = ["id", "username", "email", "user_type", "created_at"]
        read_only_fields = ["id", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = AppUser
        fields = ["username", "email", "password", "user_type"]

    def validate_email(self, value):
        if AppUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = AppUser.objects.create_user(**validated_data, password=password)
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
