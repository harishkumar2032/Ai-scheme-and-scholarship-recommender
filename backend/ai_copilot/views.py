from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .engine import generate_copilot_response
from .models import ChatMessage


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def chat_query(request):
    """
    Dynamic chatbot endpoint:
    - Accepts { "message": "..." } in the request body
    - Dynamically evaluates against live schemes and user profile
    - Returns rich markdown response + matched schemes + contextual suggestions + intent
    - Persists history if user is authenticated
    """
    user_message = (request.data.get("message") or "").strip()

    if not user_message:
        return Response(
            {"error": "Please provide a 'message' field in the request body."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Persist user query if authenticated
    if request.user and request.user.is_authenticated:
        ChatMessage.objects.create(
            user=request.user,
            role="user",
            content=user_message,
        )

    # Generate dynamic response via enhanced engine
    result = generate_copilot_response(request.user if request.user.is_authenticated else None, user_message)
    assistant_content = result["content"]

    # Persist assistant response if authenticated
    if request.user and request.user.is_authenticated:
        ChatMessage.objects.create(
            user=request.user,
            role="assistant",
            content=assistant_content,
        )

    return Response(
        {
            "reply": assistant_content,
            "matched_schemes": result.get("matched_schemes", []),
            "suggested_actions": result.get("suggested_actions", []),
            "intent": result.get("intent", "GENERAL"),
        },
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def chat_history(request):
    """
    Returns the user's full chat history if authenticated, else empty array.
    """
    if not request.user or not request.user.is_authenticated:
        return Response({"history": []})

    messages = ChatMessage.objects.filter(user=request.user).order_by("created_at")
    data = [
        {
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]
    return Response({"history": data})


@api_view(["DELETE"])
@permission_classes([permissions.AllowAny])
def clear_chat_history(request):
    """
    Clears all chat messages for the current user.
    """
    if not request.user or not request.user.is_authenticated:
        return Response({"cleared": 0})

    deleted_count, _ = ChatMessage.objects.filter(user=request.user).delete()
    return Response({"cleared": deleted_count})
