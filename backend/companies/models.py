from django.db import models
from users.models import AppUser


class CompanyProfile(models.Model):
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, related_name="company_profile")
    cin = models.CharField(max_length=21, blank=True, null=True, db_index=True)
    company_name = models.CharField(max_length=200, blank=True)
    legal_name = models.CharField(max_length=250, blank=True)
    company_type = models.CharField(max_length=100, blank=True)
    company_category = models.CharField(max_length=100, blank=True)
    company_subcategory = models.CharField(max_length=100, blank=True)
    company_class = models.CharField(max_length=50, blank=True)
    roc_code = models.CharField(max_length=50, blank=True)
    industry = models.CharField(max_length=100, blank=True)
    business_activity = models.CharField(max_length=250, blank=True)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    registered_city = models.CharField(max_length=100, blank=True)
    registered_address = models.TextField(blank=True)
    incorporation_date = models.DateField(null=True, blank=True)
    company_status = models.CharField(max_length=50, default="ACTIVE", blank=True)
    authorized_capital = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    paid_up_capital = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    employee_count = models.IntegerField(null=True, blank=True)
    msme_status = models.BooleanField(default=False)
    udyam_registration_number = models.CharField(max_length=50, blank=True)
    startup_status = models.BooleanField(default=False)
    dpiit_recognition_number = models.CharField(max_length=50, blank=True)
    annual_turnover = models.DecimalField(max_digits=16, decimal_places=2, null=True, blank=True)
    export_status = models.BooleanField(default=False)
    data_source = models.CharField(max_length=100, default="MANUAL", blank=True)
    last_fetched_at = models.DateTimeField(null=True, blank=True)
    verification_status = models.CharField(max_length=50, default="UNVERIFIED", blank=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        db_table = "company_profile"

    def __str__(self):
        return f"{self.company_name or self.cin or 'Company'} (User: {self.user.username})"


class CompanyLookupLog(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.SET_NULL, null=True, blank=True)
    cin = models.CharField(max_length=21, db_index=True)
    provider = models.CharField(max_length=100)
    success = models.BooleanField(default=False)
    retrieved_name = models.CharField(max_length=200, blank=True)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "company_lookup_logs"

    def __str__(self):
        return f"Lookup {self.cin} - {self.provider} ({'Success' if self.success else 'Failed'})"
