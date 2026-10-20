from django.urls import path

from .views import (
    CompanyProfileListCreateView,
    CompanyProfileDetailView,
    company_profile_me,
    company_cin_lookup,
    company_recommendations_view,
    company_scheme_detail,
)

urlpatterns = [
    path("", CompanyProfileListCreateView.as_view(), name="company-profile-list-create"),
    path("me/", company_profile_me, name="company-profile-me"),
    path("lookup/", company_cin_lookup, name="company-cin-lookup"),
    path("recommendations/", company_recommendations_view, name="company-recommendations"),
    path("<int:pk>/", CompanyProfileDetailView.as_view(), name="company-profile-detail"),
    path("<int:pk>/recommendations/", company_recommendations_view, name="company-profile-recommendations"),
    path("schemes/<int:scheme_id>/", company_scheme_detail, name="company-scheme-detail"),
]
