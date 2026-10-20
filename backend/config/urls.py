from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/users/", include("users.urls")),
    path("api/students/", include("students.urls")),
    path("api/companies/", include("companies.urls")),
    path("api/schemes/", include("schemes.urls")),
    path("api/recommendations/", include("recommendations.urls")),
    path("api/ai-copilot/", include("ai_copilot.urls")),
    path("api/data-pipeline/", include("data_pipeline.urls")),
]
