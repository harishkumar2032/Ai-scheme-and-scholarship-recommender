from rest_framework import generics, permissions

from .models import DataSourceRecord


class DataSourceRecordListView(generics.ListAPIView):
    queryset = DataSourceRecord.objects.all()
    permission_classes = [permissions.IsAuthenticated]
