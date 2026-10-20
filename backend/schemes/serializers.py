from rest_framework import serializers

from .models import GovernmentScheme, EligibilityRule


class EligibilityRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = EligibilityRule
        fields = "__all__"


class GovernmentSchemeSerializer(serializers.ModelSerializer):
    eligibility_rules = EligibilityRuleSerializer(many=True, read_only=True)

    class Meta:
        model = GovernmentScheme
        fields = "__all__"
