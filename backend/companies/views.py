from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, NotFound

from schemes.models import GovernmentScheme
from recommendations.models import Recommendation
from .models import CompanyProfile, CompanyLookupLog
from .serializers import CompanyProfileSerializer
from .services.company_lookup import CompanyLookupService, validate_cin_format
from .services.company_recommendation import (
    generate_company_scheme_recommendations,
    evaluate_company_scheme_eligibility,
    calculate_company_relevance_score,
)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def company_cin_lookup(request):
    """
    CIN Lookup Endpoint:
    Validates CIN format, queries configured provider / verified registry,
    and returns normalized company details or structured error.
    Accessible to authenticated users or during onboarding registration.
    """
    cin = request.data.get("cin", "")
    if not cin:
        return Response(
            {"success": False, "error_code": "MISSING_CIN", "message": "CIN parameter is required."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate and lookup
    result = CompanyLookupService.lookup_company(cin, user=request.user if request.user.is_authenticated else None)

    if not result.get("success"):
        err_code = result.get("error_code")
        if err_code in ("COMPANY_NOT_FOUND", "COMPANY_NOT_FOUND_IN_REGISTRY"):
            http_status = status.HTTP_404_NOT_FOUND
        elif err_code == "PROVIDER_AUTH_FAILED":
            http_status = status.HTTP_401_UNAUTHORIZED
        elif err_code in ("PROVIDER_TIMEOUT", "PROVIDER_UNAVAILABLE"):
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        else:
            http_status = status.HTTP_400_BAD_REQUEST
        return Response(result, status=http_status)

    return Response(result, status=status.HTTP_200_OK)


class CompanyProfileListCreateView(generics.ListCreateAPIView):
    serializer_class = CompanyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users only access their own profile unless staff
        if self.request.user.is_staff:
            return CompanyProfile.objects.all()
        return CompanyProfile.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class CompanyProfileDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CompanyProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = CompanyProfile.objects.all()

    def get_object(self):
        obj = super().get_object()
        # Privacy & Access Control: Only owner or staff can view/edit
        if obj.user != self.request.user and not self.request.user.is_staff:
            raise PermissionDenied("You do not have permission to access this company profile.")
        return obj


@api_view(["GET", "POST", "PATCH"])
@permission_classes([permissions.IsAuthenticated])
def company_profile_me(request):
    """
    Retrieve or update the company profile belonging to the currently authenticated user.
    """
    profile, created = CompanyProfile.objects.get_or_create(user=request.user)

    if request.method in ["POST", "PATCH"]:
        payload = request.data.copy()
        payload["user"] = request.user.id
        serializer = CompanyProfileSerializer(profile, data=payload, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    serializer = CompanyProfileSerializer(profile)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET", "POST"])
@permission_classes([permissions.IsAuthenticated])
def company_recommendations_view(request, pk=None):
    """
    Generate or retrieve AI-ranked scheme recommendations tailored to the company profile.
    """
    if pk:
        try:
            profile = CompanyProfile.objects.get(pk=pk)
            if profile.user != request.user and not request.user.is_staff:
                raise PermissionDenied("Permission denied.")
        except CompanyProfile.DoesNotExist:
            raise NotFound("Company profile not found.")
    else:
        profile = CompanyProfile.objects.filter(user=request.user).first()
        if not profile:
            profile, _ = CompanyProfile.objects.get_or_create(user=request.user)

    # Generate recommendations using hybrid rule filtering + TF-IDF cosine ranking
    recommendations = generate_company_scheme_recommendations(profile, limit=50)

    # Persist top eligible recommendations in database
    if request.method == "POST":
        Recommendation.objects.filter(user=request.user).delete()
        for item in recommendations[:25]:
            scheme_id = item["scheme_id"]
            scheme_obj = GovernmentScheme.objects.filter(id=scheme_id).first()
            if scheme_obj:
                Recommendation.objects.create(
                    user=request.user,
                    scheme=scheme_obj,
                    match_score=item["match_score"],
                    eligibility_status=item["eligibility_status"],
                )

    return Response({
        "company_id": profile.id,
        "company_name": profile.company_name or profile.legal_name or "Your Enterprise",
        "cin": profile.cin,
        "verification_status": profile.verification_status,
        "total_matches": len(recommendations),
        "results": recommendations,
    }, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def company_scheme_detail(request, scheme_id):
    """
    Retrieve full details for a scheme with company-specific relevance breakdown.
    """
    try:
        scheme = GovernmentScheme.objects.get(id=scheme_id)
    except GovernmentScheme.DoesNotExist:
        return Response({"error": "Scheme not found"}, status=status.HTTP_404_NOT_FOUND)

    profile = CompanyProfile.objects.filter(user=request.user).first()
    eval_result = evaluate_company_scheme_eligibility(profile, scheme) if profile else {
        "status": "NEEDS_VERIFICATION",
        "status_label": "Eligibility needs profile data",
        "reasons": ["Complete your company profile to evaluate eligibility."],
        "unmet_conditions": [],
        "verification_items": [],
    }
    score = calculate_company_relevance_score(profile, scheme) if profile else 75.0

    return Response({
        "scheme_id": scheme.id,
        "scheme_name": scheme.scheme_name,
        "scheme_type": scheme.scheme_type,
        "department": scheme.department,
        "state": scheme.state,
        "government_level": scheme.government_level,
        "description": scheme.description,
        "benefits": scheme.benefits,
        "eligibility": scheme.eligibility,
        "required_documents": [d.strip() for d in (scheme.required_documents or "").split(",") if d.strip()],
        "official_portal": scheme.official_portal or scheme.source_url,
        "source_url": scheme.source_url or scheme.official_portal,
        "scheme_status": scheme.scheme_status,
        "verification_status": scheme.verification_status,
        "match_score": score,
        "eligibility_evaluation": eval_result,
    }, status=status.HTTP_200_OK)
