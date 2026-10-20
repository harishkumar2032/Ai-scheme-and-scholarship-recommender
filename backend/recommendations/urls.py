from django.urls import path

from .views import RecommendationListView, generate_recommendations

urlpatterns = [
    path("", RecommendationListView.as_view(), name="recommendation-list"),
    path("generate/", generate_recommendations, name="generate-recommendations"),
]
