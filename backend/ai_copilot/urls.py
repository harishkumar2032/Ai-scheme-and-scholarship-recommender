from django.urls import path

from .views import chat_query, chat_history, clear_chat_history

urlpatterns = [
    path("chat/", chat_query, name="ai-copilot-chat"),
    path("history/", chat_history, name="ai-copilot-history"),
    path("clear/", clear_chat_history, name="ai-copilot-clear"),
]
