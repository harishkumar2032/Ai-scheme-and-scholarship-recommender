from django.db import models


class GovernmentScheme(models.Model):
    scheme_name = models.CharField(max_length=200)
    scheme_type = models.CharField(max_length=100, blank=True)
    target_user = models.CharField(max_length=50, blank=True)
    government_level = models.CharField(max_length=50, blank=True)
    state = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    benefits = models.TextField(blank=True)
    eligibility = models.TextField(blank=True)
    required_documents = models.TextField(blank=True)
    application_start_date = models.DateField(null=True, blank=True)
    application_end_date = models.DateField(null=True, blank=True)
    official_portal = models.URLField(blank=True)
    source_url = models.URLField(blank=True)
    application_process = models.TextField(blank=True)
    scheme_status = models.CharField(max_length=50, default="ACTIVE")
    last_verified_date = models.DateField(null=True, blank=True)
    verification_status = models.CharField(max_length=30, default="PENDING_REVIEW")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "government_schemes"


class EligibilityRule(models.Model):
    scheme = models.ForeignKey(GovernmentScheme, on_delete=models.CASCADE, related_name="eligibility_rules")
    min_age = models.IntegerField(null=True, blank=True)
    max_age = models.IntegerField(null=True, blank=True)
    income_limit = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    minimum_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    course = models.CharField(max_length=100, blank=True)
    eligible_state = models.CharField(max_length=100, blank=True)
    eligible_category = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=30, blank=True)
    disability_required = models.BooleanField(default=False)
    rural_urban = models.CharField(max_length=20, blank=True)
    msme_required = models.BooleanField(default=False)
    startup_required = models.BooleanField(default=False)
    turnover_limit = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    employee_limit = models.IntegerField(null=True, blank=True)
    company_type = models.CharField(max_length=100, blank=True)
    industry = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "eligibility_rules"
