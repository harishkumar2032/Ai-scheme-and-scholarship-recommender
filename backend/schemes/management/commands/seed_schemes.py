import json
import os
from pathlib import Path
from django.core.management.base import BaseCommand
from schemes.models import EligibilityRule, GovernmentScheme


def infer_eligibility_rules(item):
    if "eligibility_rules" in item and isinstance(item["eligibility_rules"], dict) and item["eligibility_rules"]:
        return item["eligibility_rules"]

    scheme_name = item.get("scheme_name", "")
    name_lower = scheme_name.lower()
    desc_lower = item.get("description", "").lower()
    dept_lower = item.get("department", "").lower()
    target_user = (item.get("target_user") or "").upper()
    state = (item.get("state") or "").strip()
    scheme_type = item.get("scheme_type", "")
    type_lower = scheme_type.lower()

    rules = {}

    # State matching
    if state and state.upper() not in ("ALL", "CENTRAL", "ALL INDIA", ""):
        rules["eligible_state"] = state
    else:
        rules["eligible_state"] = ""

    if target_user == "STUDENT":
        # Disability
        if "disabilit" in name_lower or "differently abled" in name_lower or "disabilit" in desc_lower:
            rules["disability_required"] = True

        # Gender
        if "girl" in name_lower or "pudhumai penn" in name_lower or "begum hazrat mahal" in name_lower or "pragati" in name_lower:
            rules["gender"] = "Female"
        elif "tamil pudhalvan" in name_lower:
            rules["gender"] = "Male"

        # Category
        if "st students" in name_lower or "for st" in name_lower or "tribal" in name_lower:
            rules["eligible_category"] = "ST"
        elif "sc students" in name_lower or "for sc" in name_lower or "adi dravidar" in name_lower:
            rules["eligible_category"] = "SC"
        elif "obc, ebc" in name_lower or "for obc" in name_lower or "bc/mbc/dnc" in name_lower:
            rules["eligible_category"] = "OBC"
        elif "minorities" in name_lower or "minority" in name_lower or "maulana azad" in name_lower or "minority" in dept_lower:
            rules["eligible_category"] = "Minority"

        # Education level
        if "pre-matric" in name_lower or "pre matric" in name_lower or "in schools" in name_lower:
            rules["education_level"] = "School"
            rules["max_age"] = 18
        elif "doctoral" in name_lower or "fellowship" in name_lower or "research" in desc_lower:
            rules["min_age"] = 20
        elif "college" in name_lower or "university" in name_lower or "higher education" in name_lower:
            rules["min_age"] = 17
            rules["max_age"] = 32

    elif target_user == "COMPANY":
        # MSME
        if "msme" in type_lower or "msme" in name_lower or "mse" in name_lower or "pmegp" in name_lower or "micro" in name_lower or "artisan" in type_lower:
            rules["msme_required"] = True
            rules["turnover_limit"] = 500000000  # 50 Cr
            rules["employee_limit"] = 250

        # Startup
        if "startup" in type_lower or "startup" in name_lower or "tide" in name_lower or "samridh" in name_lower or "seed" in name_lower or "idex" in name_lower or "aditi" in name_lower:
            rules["startup_required"] = True
            rules["turnover_limit"] = 250000000  # 25 Cr
            rules["employee_limit"] = 100

        # Industry
        if "biotech" in type_lower or "birac" in dept_lower:
            rules["industry"] = "Biotechnology"
        elif "defence" in type_lower or "defence" in dept_lower or "drdo" in dept_lower:
            rules["industry"] = "Defence"
        elif "food processing" in type_lower or "food processing" in dept_lower:
            rules["industry"] = "Food Processing"
        elif "semiconductor" in type_lower or "chips" in name_lower:
            rules["industry"] = "Semiconductor"
        elif "agritech" in type_lower or "agriculture" in dept_lower or "livestock" in name_lower:
            rules["industry"] = "Agriculture"
        elif "technology" in type_lower or "meity" in dept_lower or "software" in name_lower or "ai" in type_lower:
            rules["industry"] = "Software"

    return rules


class Command(BaseCommand):
    help = "Seed the government scheme database with all verified/review scheme records."

    def handle(self, *args, **options):
        # Locate schemes.json in dataset folder or backend folder
        candidates = [
            Path(__file__).resolve().parents[4] / "dataset" / "schemes.json",
            Path(__file__).resolve().parents[3] / "dataset" / "schemes.json",
            Path(__file__).resolve().parents[2] / "dataset" / "schemes.json",
            Path.cwd() / "dataset" / "schemes.json",
            Path.cwd().parent / "dataset" / "schemes.json",
        ]

        json_path = None
        for p in candidates:
            if p.exists():
                json_path = p
                break

        if not json_path:
            self.stderr.write(self.style.ERROR(f"Could not find schemes.json in any expected path. Looked at: {[str(c) for c in candidates]}"))
            return

        with open(json_path, "r", encoding="utf-8") as f:
            schemes_list = json.load(f)

        created_count = 0
        updated_count = 0

        for item in schemes_list:
            scheme_id = item.get("scheme_id")
            scheme_name = item.get("scheme_name", "").strip()

            defaults = {
                "scheme_type": item.get("scheme_type", ""),
                "target_user": item.get("target_user", "").upper(),
                "government_level": item.get("government_level", ""),
                "state": item.get("state", "ALL"),
                "department": item.get("department", ""),
                "description": item.get("description", ""),
                "benefits": item.get("benefits", ""),
                "eligibility": item.get("eligibility_summary") or item.get("eligibility", ""),
                "required_documents": item.get("required_documents") or "Aadhaar / Identity Proof, Category/Income Certificate if applicable, Educational / Registration Proof",
                "official_portal": item.get("official_portal") or item.get("source_url", ""),
                "source_url": item.get("source_url", ""),
                "application_process": item.get("application_process") or f"Apply online through the official portal ({item.get('source_url', '')}).",
                "scheme_status": item.get("scheme_status", "ACTIVE"),
                "verification_status": item.get("verification_status", "VERIFIED"),
                "last_verified_date": item.get("last_verified_date") or None,
            }

            if scheme_id:
                scheme, created = GovernmentScheme.objects.update_or_create(
                    id=scheme_id,
                    defaults={"scheme_name": scheme_name, **defaults},
                )
            else:
                scheme, created = GovernmentScheme.objects.update_or_create(
                    scheme_name=scheme_name,
                    defaults=defaults,
                )

            if created:
                created_count += 1
            else:
                updated_count += 1

            # Populate eligibility rule
            rule_data = infer_eligibility_rules(item)
            valid_rule_fields = {
                "min_age", "max_age", "income_limit", "minimum_marks",
                "education_level", "course", "eligible_state", "eligible_category",
                "gender", "disability_required", "rural_urban",
                "msme_required", "startup_required", "turnover_limit",
                "employee_limit", "company_type", "industry"
            }
            filtered_rules = {k: v for k, v in rule_data.items() if k in valid_rule_fields}
            EligibilityRule.objects.filter(scheme=scheme).delete()
            EligibilityRule.objects.create(scheme=scheme, **filtered_rules)

        total = GovernmentScheme.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded schemes: {created_count} created, {updated_count} updated. Total schemes in database: {total}."
            )
        )
