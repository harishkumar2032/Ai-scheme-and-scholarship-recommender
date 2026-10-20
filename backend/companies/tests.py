from unittest.mock import patch, MagicMock
from decimal import Decimal
import requests
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from users.models import AppUser
from companies.models import CompanyProfile, CompanyLookupLog
from schemes.models import GovernmentScheme, EligibilityRule
from students.models import StudentProfile
from recommendations.engine import get_student_recommendations
from companies.services.company_lookup import (
    validate_cin_format,
    CompanyLookupService,
    MCAAuthorizedAPIProvider,
    PublicMCACompanyRegistryProvider,
)
from companies.services.company_recommendation import (
    evaluate_company_scheme_eligibility,
    calculate_company_relevance_score,
    generate_company_scheme_recommendations,
)


class CINValidationAndLookupTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = AppUser.objects.create_user(
            username="test_company_user",
            email="company@test.com",
            password="testpassword123",
            user_type="company",
        )
        self.other_user = AppUser.objects.create_user(
            username="other_company_user",
            email="other@test.com",
            password="testpassword123",
            user_type="company",
        )

    # 1. Valid CIN Format
    def test_valid_cin_format(self):
        valid_cin = "U72900TN2020PTC135001"
        is_valid, err, meta = validate_cin_format(valid_cin)
        self.assertTrue(is_valid)
        self.assertEqual(err, "")
        self.assertEqual(meta["state"], "Tamil Nadu")
        self.assertEqual(meta["incorporation_year"], 2020)
        self.assertEqual(meta["company_type"], "Private Limited")
        self.assertEqual(meta["listing_status"], "Unlisted")

    # 2. Invalid CIN Format Tests
    def test_invalid_cin_formats(self):
        invalid_cases = [
            ("", "empty"),
            ("12345", "too short"),
            ("U72900TN2020PTC12345", "20 chars"),
            ("U72900TN2020PTC1234567", "22 chars"),
            ("X72900TN2020PTC123456", "invalid starting letter"),
            ("U72900TN1700PTC123456", "invalid year"),
            ("UABC00TN2020PTC123456", "alphabets in NIC code"),
        ]
        for cin_val, desc in invalid_cases:
            is_valid, err, _ = validate_cin_format(cin_val)
            self.assertFalse(is_valid, f"Failed on case: {desc}")
            self.assertTrue(len(err) > 0)

    # 3. Successful Provider Lookup via Mock
    @patch.object(requests, "post")
    def test_successful_provider_lookup_mocked(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.ok = True
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "success": True,
            "data": {
                "company_name": "ACME DYNAMICS PRIVATE LIMITED",
                "status": "ACTIVE",
                "incorporation_date": "2021-04-10",
                "company_type": "Private Limited",
                "industry": "Manufacturing",
                "business_activity": "Industrial component manufacturing",
                "state": "Tamil Nadu",
                "city": "Chennai",
                "registered_address": "Guindy Industrial Estate, Chennai",
                "authorized_capital": 2500000.0,
                "paid_up_capital": 1000000.0,
            }
        }
        mock_post.return_value = mock_resp

        provider = MCAAuthorizedAPIProvider()
        with self.settings(COMPANY_DATA_API_URL="https://api.example.com/mca", COMPANY_DATA_API_KEY="test_key"):
            result = provider.lookup("U29100TN2021PTC999999", {"state": "Tamil Nadu", "company_type": "Private Limited", "incorporation_year": 2021})
            self.assertTrue(result["success"])
            self.assertEqual(result["legal_name"], "ACME DYNAMICS PRIVATE LIMITED")
            self.assertEqual(result["company_status"], "ACTIVE")

    # 4. Company Not Found
    @patch.object(requests, "post")
    def test_company_not_found(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.status_code = 404
        mock_post.return_value = mock_resp

        provider = MCAAuthorizedAPIProvider()
        with self.settings(COMPANY_DATA_API_URL="https://api.example.com/mca", COMPANY_DATA_API_KEY="test_key"):
            result = provider.lookup("U72900TN2020PTC000000", {"state": "Tamil Nadu", "company_type": "Private Limited", "incorporation_year": 2020})
            self.assertFalse(result["success"])
            self.assertEqual(result["error_code"], "COMPANY_NOT_FOUND")

    # 5. Missing API Credentials Fallback
    def test_missing_api_credentials_fallback(self):
        provider = MCAAuthorizedAPIProvider()
        with self.settings(COMPANY_DATA_API_URL="", COMPANY_DATA_API_KEY=""):
            result = provider.lookup("U72900TN2020PTC000000", {"state": "Tamil Nadu", "company_type": "Private Limited", "incorporation_year": 2020})
            self.assertFalse(result["success"])
            self.assertEqual(result["error_code"], "MISSING_API_CONFIGURATION")
            self.assertTrue(result["allow_manual_entry"])

    # 5b. Provider Authentication Failure
    @patch.object(requests, "post")
    def test_provider_auth_failure_handling(self, mock_post):
        mock_resp = MagicMock()
        mock_resp.ok = False
        mock_resp.status_code = 401
        mock_post.return_value = mock_resp

        provider = MCAAuthorizedAPIProvider()
        with self.settings(COMPANY_DATA_API_URL="https://api.example.com/mca", COMPANY_DATA_API_KEY="invalid_key"):
            result = provider.lookup("U72900TN2020PTC000000", {"state": "Tamil Nadu", "company_type": "Private Limited", "incorporation_year": 2020})
            self.assertFalse(result["success"])
            self.assertEqual(result["error_code"], "PROVIDER_AUTH_FAILED")
            self.assertIn("rejected the configured credentials", result["message"])

    # 6. Provider Timeout or Failure
    @patch.object(requests, "post", side_effect=requests.exceptions.Timeout)
    def test_provider_timeout_handling(self, mock_post):
        provider = MCAAuthorizedAPIProvider()
        with self.settings(COMPANY_DATA_API_URL="https://api.example.com/mca", COMPANY_DATA_API_KEY="test_key"):
            result = provider.lookup("U72900TN2020PTC000000", {"state": "Tamil Nadu", "company_type": "Private Limited", "incorporation_year": 2020})
            self.assertFalse(result["success"])
            self.assertEqual(result["error_code"], "PROVIDER_TIMEOUT")
            self.assertTrue(result["allow_manual_entry"])

    # 7. Built-in Verified Registry Lookup
    def test_verified_registry_lookup(self):
        result = CompanyLookupService.lookup_company("U72900TN2020PTC135001", user=self.user)
        self.assertTrue(result["success"])
        self.assertEqual(result["legal_name"], "AURA TECHNOLOGIES PRIVATE LIMITED")
        self.assertEqual(result["registered_state"], "Tamil Nadu")
        self.assertEqual(result["industry"], "Software")
        self.assertEqual(result["verification_status"], "SOURCE_VERIFIED")

        # Verify lookup logged
        self.assertTrue(CompanyLookupLog.objects.filter(cin="U72900TN2020PTC135001", success=True).exists())

    # 7b. TCS Test CIN Lookup (L22210MH1995PLC084781)
    def test_tcs_cin_lookup_verified_registry(self):
        result = CompanyLookupService.lookup_company("L22210MH1995PLC084781", user=self.user)
        self.assertTrue(result["success"])
        self.assertEqual(result["legal_name"], "TATA CONSULTANCY SERVICES LIMITED")
        self.assertEqual(result["company_status"], "ACTIVE")
        self.assertEqual(result["incorporation_date"], "1995-01-19")
        self.assertEqual(result["company_type"], "Public Limited")
        self.assertEqual(result["roc_code"], "RoC-Mumbai")
        self.assertEqual(result["registered_state"], "Maharashtra")
        self.assertEqual(result["registered_city"], "Mumbai")
        self.assertEqual(result["verification_status"], "SOURCE_VERIFIED")
        self.assertEqual(result["cin_metadata"]["listing_status"], "Listed")

    # 8. Saving and Updating Company Profile via API
    def test_save_and_update_company_profile(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "cin": "U72900TN2020PTC135001",
            "company_name": "Aura Technologies Private Limited",
            "legal_name": "AURA TECHNOLOGIES PRIVATE LIMITED",
            "company_type": "Private Limited",
            "industry": "Software",
            "state": "Tamil Nadu",
            "annual_turnover": "45000000.00",
            "employee_count": 45,
            "msme_status": True,
            "udyam_registration_number": "UDYAM-TN-01-0012345",
            "startup_status": True,
        }
        res = self.client.post("/api/companies/me/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        profile = CompanyProfile.objects.get(user=self.user)
        self.assertEqual(profile.cin, "U72900TN2020PTC135001")
        self.assertTrue(profile.msme_status)
        self.assertEqual(profile.udyam_registration_number, "UDYAM-TN-01-0012345")

        # Test partial PATCH update
        patch_res = self.client.patch("/api/companies/me/", {"employee_count": 55}, format="json")
        self.assertEqual(patch_res.status_code, status.HTTP_200_OK)
        profile.refresh_from_db()
        self.assertEqual(profile.employee_count, 55)

    # 9. Access Control and Company Data Privacy
    def test_access_control_privacy(self):
        profile = CompanyProfile.objects.create(
            user=self.user,
            company_name="Private Corp A",
            cin="U72900TN2020PTC111111",
        )
        self.client.force_authenticate(user=self.other_user)
        res = self.client.get(f"/api/companies/{profile.id}/")
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)


class CompanyRecommendationEngineTests(TestCase):
    def setUp(self):
        self.user = AppUser.objects.create_user(
            username="rec_test_company",
            email="rec_company@test.com",
            password="testpassword123",
            user_type="company",
        )
        self.profile = CompanyProfile.objects.create(
            user=self.user,
            cin="U72900TN2020PTC135001",
            company_name="Aura Technologies",
            company_type="Private Limited",
            industry="Software",
            state="Tamil Nadu",
            annual_turnover=Decimal("45000000.00"),
            employee_count=40,
            msme_status=True,
            udyam_registration_number="UDYAM-TN-01-0012345",
            startup_status=True,
            dpiit_recognition_number="DPIIT12345",
            company_status="ACTIVE",
        )
        # Scheme 1: Matching MSME Scheme
        self.msme_scheme = GovernmentScheme.objects.create(
            scheme_name="Startup India Tech Seed Fund",
            scheme_type="Startup/Funding",
            target_user="COMPANY",
            department="DPIIT",
            state="ALL",
            government_level="CENTRAL",
            benefits="Seed grant support up to ₹50 Lakhs",
            eligibility="DPIIT startups in innovative sectors",
            required_documents="Udyam Certificate, Pitch Deck, CIN Certificate",
            official_portal="https://www.startupindia.gov.in/",
            scheme_status="ACTIVE",
        )
        EligibilityRule.objects.create(
            scheme=self.msme_scheme,
            startup_required=True,
            turnover_limit=Decimal("100000000.00"),
            eligible_state="ALL",
            industry="Software",
        )

        # Scheme 2: Scheme with turnover ceiling lower than company's turnover
        self.restricted_scheme = GovernmentScheme.objects.create(
            scheme_name="Micro Artisan Credit Guarantee Scheme",
            scheme_type="Credit/Subsidy",
            target_user="COMPANY",
            department="Ministry of MSME",
            state="ALL",
            government_level="CENTRAL",
            benefits="Micro loan subsidy",
            eligibility="Micro enterprises with turnover under ₹50 Lakhs",
            scheme_status="ACTIVE",
        )
        EligibilityRule.objects.create(
            scheme=self.restricted_scheme,
            turnover_limit=Decimal("5000000.00"),  # 50 Lakhs (Company has 4.5 Cr)
        )

    # 10. Mandatory Eligibility Condition Failures
    def test_mandatory_eligibility_failure(self):
        eval_result = evaluate_company_scheme_eligibility(self.profile, self.restricted_scheme)
        self.assertFalse(eval_result["is_eligible"])
        self.assertEqual(eval_result["status"], "NOT_ELIGIBLE")
        self.assertTrue(any("exceeds" in u for u in eval_result["unmet_conditions"]))

    # 11. Missing Eligibility Verification Items
    def test_missing_eligibility_verification(self):
        # Create company without Udyam number
        unverified_profile = CompanyProfile.objects.create(
            user=AppUser.objects.create_user(username="unverified_co", password="pwd", user_type="company"),
            company_name="Unverified Co",
            msme_status=True,
            udyam_registration_number="",  # missing documentation
            company_status="ACTIVE",
            state="Tamil Nadu",
        )
        msme_rule_scheme = GovernmentScheme.objects.create(
            scheme_name="MSME Subsidy Scheme",
            target_user="COMPANY",
            scheme_status="ACTIVE",
        )
        EligibilityRule.objects.create(scheme=msme_rule_scheme, msme_required=True)

        eval_result = evaluate_company_scheme_eligibility(unverified_profile, msme_rule_scheme)
        self.assertEqual(eval_result["status"], "NEEDS_VERIFICATION")
        self.assertTrue(len(eval_result["verification_items"]) > 0)

    # 12. Recommendation Ranking and Match Score Calculation
    def test_recommendation_ranking_and_score(self):
        recs = generate_company_scheme_recommendations(self.profile, limit=10)
        self.assertTrue(len(recs) > 0)
        top = recs[0]
        self.assertGreaterEqual(top["match_score"], 70.0)
        self.assertIn("Startup India Tech Seed Fund", [r["scheme_name"] for r in recs])
        self.assertTrue(len(top["reasons"]) > 0)
        self.assertTrue("https://" in top["official_portal"])

    # 13. Official Source URL and Document Integrity
    def test_official_url_integrity(self):
        recs = generate_company_scheme_recommendations(self.profile, limit=5)
        for r in recs:
            self.assertTrue(r["official_portal"].startswith("http"))
            self.assertTrue(len(r["required_documents"]) > 0)

    # 14. Existing Student Scholarship Functionality Preservation
    def test_student_scholarship_recommendations_preserved(self):
        student_user = AppUser.objects.create_user(
            username="test_student_user",
            email="student@test.com",
            password="testpassword123",
            user_type="student",
        )
        student_profile = StudentProfile.objects.create(
            user=student_user,
            age=20,
            gender="Female",
            state="Tamil Nadu",
            education_level="UG",
            course="B.E. Computer Science",
            marks_or_cgpa=Decimal("88.5"),
            family_income=Decimal("150000.0"),
            category="OBC",
        )
        student_scheme = GovernmentScheme.objects.create(
            scheme_name="Central Higher Education Merit Scholarship",
            scheme_type="Scholarship",
            target_user="STUDENT",
            state="ALL",
            government_level="CENTRAL",
            scheme_status="ACTIVE",
        )
        EligibilityRule.objects.create(
            scheme=student_scheme,
            eligible_state="ALL",
            education_level="UG",
            minimum_marks=Decimal("75.0"),
            income_limit=Decimal("250000.0"),
        )
        student_recs = get_student_recommendations(student_user)
        self.assertTrue(len(student_recs) > 0)
        self.assertEqual(student_recs[0]["scheme"].id, student_scheme.id)
        self.assertGreaterEqual(student_recs[0]["score"], 75.0)
