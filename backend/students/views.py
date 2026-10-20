from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import StudentProfile
from .serializers import StudentProfileSerializer


class StudentProfileListCreateView(generics.ListCreateAPIView):
    queryset = StudentProfile.objects.all()
    serializer_class = StudentProfileSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET", "POST", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def student_profile_me(request):
    profile, created = StudentProfile.objects.get_or_create(user=request.user)

    if request.method in ["POST", "PATCH"]:
        payload = request.data.copy()
        payload["user"] = request.user.id
        serializer = StudentProfileSerializer(profile, data=payload, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = StudentProfileSerializer(profile)
    return Response(serializer.data)
