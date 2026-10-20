from django.db import models


class DataSourceRecord(models.Model):
    source_name = models.CharField(max_length=200)
    source_url = models.URLField(blank=True)
    verification_status = models.CharField(max_length=30, default="PENDING_REVIEW")
    last_verified_date = models.DateField(null=True, blank=True)
    raw_data = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "data_source_records"
