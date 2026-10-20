from django.db.models import Q
from rest_framework import generics, permissions

from .models import GovernmentScheme
from .serializers import GovernmentSchemeSerializer


class SchemeListCreateView(generics.ListCreateAPIView):
    serializer_class = GovernmentSchemeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = GovernmentScheme.objects.all().order_by("id")
        target_user = self.request.query_params.get("target_user")
        state = self.request.query_params.get("state")
        search = self.request.query_params.get("search")

        if target_user:
            queryset = queryset.filter(target_user__iexact=target_user)
        if state:
            queryset = queryset.filter(state__iexact=state)
        if search:
            queryset = queryset.filter(
                Q(scheme_name__icontains=search)
                | Q(description__icontains=search)
                | Q(department__icontains=search)
                | Q(scheme_type__icontains=search)
            )

        return queryset


class SchemeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = GovernmentScheme.objects.all()
    serializer_class = GovernmentSchemeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

