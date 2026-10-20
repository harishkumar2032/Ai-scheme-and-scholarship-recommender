from decimal import Decimal

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from companies.models import CompanyProfile
from schemes.models import GovernmentScheme, EligibilityRule
from students.models import StudentProfile


def _as_decimal(value):
    if value in (None, "", "None"):
        return Decimal("0")
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def _normalize(value):
    if value is None:
        return ""
    return str(value).strip().lower()


def _scheme_rule_for_user(scheme, user_type):
    rules = list(scheme.eligibility_rules.all())
    if not rules:
        return None
    if user_type == "student":
        return rules[0]
    return rules[0]


def _has_disability(value):
    if not value:
        return False
    return str(value).strip().lower() not in ("none", "no", "false", "0", "")


def _state_matches(user_state, rule_state):
    norm_rule = _normalize(rule_state).replace("_", " ")
    if not norm_rule or norm_rule in ("all", "all india"):
        return True
    norm_user = _normalize(user_state).replace("_", " ")
    return norm_user == norm_rule


def student_scheme_eligible(profile, scheme):
    rules = list(scheme.eligibility_rules.all())
    if not rules:
        return True, ["No explicit restrictive eligibility rule defined; verified as broadly accessible."]

    reasons = []
    passed = True

    for rule in rules:
        if rule.min_age is not None and (profile.age is None or profile.age < rule.min_age):
            passed = False
            reasons.append(f"Age must be at least {rule.min_age}.")
        if rule.max_age is not None and (profile.age is None or profile.age > rule.max_age):
            passed = False
            reasons.append(f"Age must be at most {rule.max_age}.")
        if rule.income_limit is not None and (profile.family_income is None or profile.family_income > rule.income_limit):
            passed = False
            reasons.append(f"Family income must be within ₹{rule.income_limit}.")
        if rule.minimum_marks is not None and (profile.marks_or_cgpa is None or profile.marks_or_cgpa < rule.minimum_marks):
            passed = False
            reasons.append(f"Marks or CGPA must be at least {rule.minimum_marks}.")
        if rule.education_level and _normalize(profile.education_level) != _normalize(rule.education_level):
            passed = False
            reasons.append(f"Education level must match {rule.education_level}.")
        if rule.course and _normalize(profile.course) != _normalize(rule.course):
            passed = False
            reasons.append(f"Course must match {rule.course}.")
        if rule.eligible_state and not _state_matches(profile.state, rule.eligible_state):
            passed = False
            reasons.append(f"State must match {rule.eligible_state}.")
        if rule.eligible_category and rule.eligible_category.strip().lower() not in ("all", "general", ""):
            if _normalize(profile.category) != _normalize(rule.eligible_category):
                passed = False
                reasons.append(f"Category must match {rule.eligible_category}.")
        if rule.gender and _normalize(profile.gender) != _normalize(rule.gender):
            passed = False
            reasons.append(f"Gender must match {rule.gender}.")
        if rule.disability_required and not _has_disability(profile.disability_status):
            passed = False
            reasons.append("Disability support is required for this scheme.")
        if rule.rural_urban and _normalize(profile.rural_urban) != _normalize(rule.rural_urban):
            passed = False
            reasons.append(f"Residence type must match {rule.rural_urban}.")

    return passed, reasons or ["Profile meets the reported eligibility conditions."]


def company_scheme_eligible(profile, scheme):
    rules = list(scheme.eligibility_rules.all())
    if not rules:
        return True, ["No explicit restrictive eligibility rule defined; open to qualifying enterprises."]

    reasons = []
    passed = True

    for rule in rules:
        if rule.msme_required and not profile.msme_status:
            passed = False
            reasons.append("MSME status is required for this scheme.")
        if rule.startup_required and not profile.startup_status:
            passed = False
            reasons.append("Startup status is required for this scheme.")
        if rule.turnover_limit is not None and (profile.annual_turnover is None or profile.annual_turnover > rule.turnover_limit):
            passed = False
            reasons.append(f"Annual turnover must be within ₹{rule.turnover_limit}.")
        if rule.employee_limit is not None and (profile.employee_count is None or profile.employee_count > rule.employee_limit):
            passed = False
            reasons.append(f"Employee count must be at most {rule.employee_limit}.")
        if rule.company_type and _normalize(profile.company_type) != _normalize(rule.company_type):
            passed = False
            reasons.append(f"Company type must match {rule.company_type}.")
        if rule.industry and _normalize(profile.industry) != _normalize(rule.industry):
            passed = False
            reasons.append(f"Industry must match {rule.industry}.")
        if rule.eligible_state and not _state_matches(profile.state, rule.eligible_state):
            passed = False
            reasons.append(f"State must match {rule.eligible_state}.")

    return passed, reasons or ["Company profile satisfies the recorded eligibility requirements."]


def _student_vector(profile, scheme):
    age = float(profile.age or 0)
    family_income = float(profile.family_income or 0)
    marks = float(profile.marks_or_cgpa or 0)
    rule = scheme.eligibility_rules.first()

    state_match = 1.0 if rule and rule.eligible_state and _state_matches(profile.state, rule.eligible_state) else 0.5
    course_match = 1.0 if rule and rule.course and _normalize(profile.course) == _normalize(rule.course) else 0.5
    education_match = 1.0 if rule and rule.education_level and _normalize(profile.education_level) == _normalize(rule.education_level) else 0.5
    category_match = 1.0 if rule and rule.eligible_category and _normalize(profile.category) == _normalize(rule.eligible_category) else 0.5
    disability_match = 1.0 if _has_disability(profile.disability_status) else 0.0
    rural_match = 1.0 if rule and rule.rural_urban and _normalize(profile.rural_urban) == _normalize(rule.rural_urban) else 0.5

    user_vector = np.array([
        age / 100.0,
        family_income / 100000.0,
        marks / 100.0,
        1.0 if profile.first_generation else 0.0,
        1.0 if profile.hosteller else 0.0,
        disability_match,
        rural_match,
        state_match,
        course_match,
        education_match,
        category_match,
    ], dtype=float)

    scheme_vector = np.array([
        1.0 if rule and rule.min_age is not None else 0.5,
        1.0 if rule and rule.income_limit is not None else 0.5,
        1.0 if rule and rule.minimum_marks is not None else 0.5,
        1.0 if rule and rule.rural_urban else 0.5,
        1.0 if rule and rule.eligible_state else 0.5,
        1.0 if rule and rule.course else 0.5,
        1.0 if rule and rule.education_level else 0.5,
        1.0 if rule and rule.eligible_category else 0.5,
        1.0 if rule and rule.disability_required else 0.0,
        1.0 if rule and rule.eligible_state else 0.5,
        1.0 if rule and rule.min_age is not None else 0.5,
    ], dtype=float)

    return user_vector, scheme_vector


def _company_vector(profile, scheme):
    rule = scheme.eligibility_rules.first()
    turnover = float(profile.annual_turnover or 0)
    employees = float(profile.employee_count or 0)

    msme_match = 1.0 if rule and rule.msme_required and profile.msme_status else 0.5
    startup_match = 1.0 if rule and rule.startup_required and profile.startup_status else 0.5
    turnover_match = 1.0 if rule and rule.turnover_limit and turnover <= float(rule.turnover_limit) else 0.5
    employee_match = 1.0 if rule and rule.employee_limit and employees <= float(rule.employee_limit) else 0.5
    industry_match = 1.0 if rule and rule.industry and _normalize(profile.industry) == _normalize(rule.industry) else 0.5
    company_match = 1.0 if rule and rule.company_type and _normalize(profile.company_type) == _normalize(rule.company_type) else 0.5
    state_match = 1.0 if rule and rule.eligible_state and _state_matches(profile.state, rule.eligible_state) else 0.5

    user_vector = np.array([
        turnover / 1000000.0,
        employees / 100.0,
        1.0 if profile.msme_status else 0.0,
        1.0 if profile.startup_status else 0.0,
        1.0 if profile.export_status else 0.0,
        msme_match,
        startup_match,
        turnover_match,
        employee_match,
        state_match,
    ], dtype=float)

    scheme_vector = np.array([
        1.0 if rule and rule.turnover_limit else 0.5,
        1.0 if rule and rule.employee_limit else 0.5,
        1.0 if rule and rule.msme_required else 0.5,
        1.0 if rule and rule.startup_required else 0.5,
        1.0 if rule and rule.eligible_state else 0.5,
        1.0 if rule and rule.msme_required else 0.5,
        1.0 if rule and rule.startup_required else 0.5,
        1.0 if rule and rule.turnover_limit else 0.5,
        1.0 if rule and rule.employee_limit else 0.5,
        1.0 if rule and rule.eligible_state else 0.5,
    ], dtype=float)

    return user_vector, scheme_vector


def calculate_similarity_score(profile, scheme):
    if isinstance(profile, StudentProfile):
        user_vector, scheme_vector = _student_vector(profile, scheme)
    elif isinstance(profile, CompanyProfile):
        user_vector, scheme_vector = _company_vector(profile, scheme)
    else:
        return 0.0

    if np.allclose(user_vector, 0) or np.allclose(scheme_vector, 0):
        return 75.0

    similarity = cosine_similarity(user_vector.reshape(1, -1), scheme_vector.reshape(1, -1))[0][0]
    score = float(max(0.0, min(1.0, similarity))) * 100.0
    if score < 50.0:
        score = 75.0
    return score


def get_student_recommendations(user):
    profile = StudentProfile.objects.filter(user=user).first()
    if not profile:
        return []

    results = []
    schemes = GovernmentScheme.objects.filter(
        target_user__in=["Student", "student", "STUDENT", "Both", "both", "ALL", "all"]
    ).exclude(scheme_status__iexact="EXPIRED")

    for scheme in schemes:
        eligible, reasons = student_scheme_eligible(profile, scheme)
        if not eligible:
            continue
        score = calculate_similarity_score(profile, scheme)
        results.append({
            "scheme": scheme,
            "score": round(score, 2),
            "reasons": reasons,
        })

    return sorted(results, key=lambda item: item["score"], reverse=True)


def get_company_recommendations(user):
    profile = CompanyProfile.objects.filter(user=user).first()
    if not profile:
        return []

    from companies.services.company_recommendation import generate_company_scheme_recommendations
    recs = generate_company_scheme_recommendations(profile, limit=50)
    results = []
    for item in recs:
        scheme_id = item["scheme_id"]
        scheme = GovernmentScheme.objects.filter(id=scheme_id).first()
        if scheme:
            results.append({
                "scheme": scheme,
                "score": item["match_score"],
                "reasons": item["reasons"],
                "eligibility_status": item.get("eligibility_status", "ELIGIBLE"),
                "eligibility_status_label": item.get("eligibility_status_label", "Eligible"),
                "relevance_explanation": item.get("relevance_explanation", ""),
                "unmet_conditions": item.get("unmet_conditions", []),
                "verification_items": item.get("verification_items", []),
            })
    return results


def generate_user_recommendations(user):
    if user.user_type == "student":
        return get_student_recommendations(user)
    if user.user_type == "company":
        return get_company_recommendations(user)
    return []

