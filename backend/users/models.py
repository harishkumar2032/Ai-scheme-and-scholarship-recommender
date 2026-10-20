from django.contrib.auth.models import AbstractUser
from django.db import models


class AppUser(AbstractUser):
    USER_TYPE_CHOICES = [
        ("student", "Student"),
        ("company", "Company"),
        ("admin", "Admin"),
    ]

    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default="student")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "users"
