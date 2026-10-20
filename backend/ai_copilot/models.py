from django.db import models
from users.models import AppUser


class ChatMessage(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, null=True, blank=True, related_name="chat_messages")
    role = models.CharField(max_length=20, choices=[("user", "User"), ("assistant", "Assistant")])
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "chat_messages"
        ordering = ["created_at"]
