from django.db import models

from schemes.models import GovernmentScheme
from users.models import AppUser


class Recommendation(models.Model):
    user = models.ForeignKey(AppUser, on_delete=models.CASCADE, related_name="recommendations")
    scheme = models.ForeignKey(GovernmentScheme, on_delete=models.CASCADE, related_name="recommendations")
    match_score = models.FloatField(default=0.0)
    eligibility_status = models.CharField(max_length=40, default="ELIGIBLE")
    recommended_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "recommendations"
