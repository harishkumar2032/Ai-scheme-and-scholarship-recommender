from django.urls import path

from .views import DataSourceRecordListView

urlpatterns = [
    path("", DataSourceRecordListView.as_view(), name="data-source-record-list"),
]
