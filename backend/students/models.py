from django.db import models

from users.models import AppUser


class StudentProfile(models.Model):
    user = models.OneToOneField(AppUser, on_delete=models.CASCADE, related_name="student_profile")
    age = models.IntegerField(null=True, blank=True)
    gender = models.CharField(max_length=20, blank=True)
    state = models.CharField(max_length=100, blank=True)
    district = models.CharField(max_length=100, blank=True)
    education_level = models.CharField(max_length=100, blank=True)
    course = models.CharField(max_length=100, blank=True)
    college = models.CharField(max_length=200, blank=True)
    year_semester = models.CharField(max_length=50, blank=True)
    marks_or_cgpa = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    family_income = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    category = models.CharField(max_length=50, blank=True)
    disability_status = models.CharField(max_length=50, blank=True)
    rural_urban = models.CharField(max_length=20, blank=True)
    parent_occupation = models.CharField(max_length=100, blank=True)
    first_generation = models.BooleanField(default=False)
    hosteller = models.BooleanField(default=False)
    college_type = models.CharField(max_length=50, blank=True)

    class Meta:
        db_table = "student_profile"
