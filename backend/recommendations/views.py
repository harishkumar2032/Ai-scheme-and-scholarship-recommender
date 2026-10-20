from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .engine import generate_user_recommendations
from .models import Recommendation
from .serializers import RecommendationSerializer


class RecommendationListView(generics.ListAPIView):
    queryset = Recommendation.objects.all()
    serializer_class = RecommendationSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def generate_recommendations(request):
    user = request.user
    results = generate_user_recommendations(user)

    Recommendation.objects.filter(user=user).delete()
    saved = []
    for item in results:
        scheme = item["scheme"]
        elig_status = item.get("eligibility_status", "ELIGIBLE")
        recommendation = Recommendation.objects.create(
            user=user,
            scheme=scheme,
            match_score=item["score"],
            eligibility_status=elig_status,
        )
        saved.append({
            "recommendation_id": recommendation.id,
            "scheme_id": scheme.id,
            "scheme_name": scheme.scheme_name,
            "scheme_type": scheme.scheme_type,
            "benefit": scheme.benefits,
            "benefits": scheme.benefits,
            "description": scheme.description,
            "department": scheme.department,
            "state": scheme.state,
            "source_url": scheme.source_url,
            "official_portal": scheme.official_portal,
            "match_score": recommendation.match_score,
            "eligibility_status": recommendation.eligibility_status,
            "eligibility_status_label": item.get("eligibility_status_label", "Eligible"),
            "relevance_explanation": item.get("relevance_explanation", ""),
            "reasons": item["reasons"],
            "verification_items": item.get("verification_items", []),
            "unmet_conditions": item.get("unmet_conditions", []),
            "documents": [d.strip() for d in (scheme.required_documents or "").split(",") if d.strip()] or [
                "Identification Proof / PAN",
                "Incorporation Certificate / Registration Proof",
                "Financial Statements / Income Proof",
            ],
        })

    return Response({"count": len(saved), "results": saved}, status=status.HTTP_200_OK)
