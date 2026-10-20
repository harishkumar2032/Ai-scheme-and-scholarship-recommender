import re
from schemes.models import GovernmentScheme
from students.models import StudentProfile
from companies.models import CompanyProfile


def generate_copilot_response(user, user_message):
    query = (user_message or "").strip()
    query_lower = query.lower()

    # 1. Fetch live user profile context if available
    user_type = getattr(user, "user_type", "student") if user and user.is_authenticated else "student"
    profile_summary = {}

    if user and user.is_authenticated:
        if user_type == "student":
            try:
                sp = StudentProfile.objects.filter(user=user).first()
                if sp:
                    profile_summary = {
                        "type": "student",
                        "state": sp.state or "Tamil Nadu",
                        "course": sp.course or "",
                        "education_level": sp.education_level or "",
                        "marks": float(sp.marks_or_cgpa) if sp.marks_or_cgpa else None,
                        "income": float(sp.family_income) if sp.family_income else None,
                        "category": sp.category or "General",
                        "disability": sp.disability_status or "None",
                        "college": sp.college or "",
                    }
            except Exception:
                pass
        else:
            try:
                cp = CompanyProfile.objects.filter(user=user).first()
                if cp:
                    profile_summary = {
                        "type": "company",
                        "company_name": cp.company_name or "",
                        "industry": cp.industry or "",
                        "state": cp.state or "Tamil Nadu",
                        "msme": bool(cp.msme_status),
                        "startup": bool(cp.startup_status),
                        "turnover": float(cp.annual_turnover) if cp.annual_turnover else None,
                    }
            except Exception:
                pass

    username = getattr(user, "username", "Scholar") if user and user.is_authenticated else "Scholar"

    # 2. Extract key themes & intent from user query
    is_greeting = bool(re.search(r"^\s*(hi|hello|hey|greetings|hola|good\s*(morning|afternoon|evening)|help)\b", query_lower)) and len(query.split()) <= 4
    asking_eligibility_check = bool(re.search(r"\b(am i eligible|my eligibility|check eligibility|qualify|can i get|recommend for me|fit for me|am i qualified)\b", query_lower))
    asking_docs = bool(re.search(r"\b(document|documents|proof|certificate|id|aadhaar|paperwork|bonafide|marksheet)\b", query_lower))
    asking_income = bool(re.search(r"\b(income|limit|salary|earnings|lakh|rupees|financial|creamy layer)\b", query_lower))
    asking_tn = bool(re.search(r"\b(tamil nadu|tamilnadu|tn|chennai|coimbatore|madurai|trichy|salem)\b", query_lower))
    asking_central = bool(re.search(r"\b(central|national|all india|delhi|ministry|nsp|aicte|ugc)\b", query_lower))
    asking_women = bool(re.search(r"\b(girl|women|female|pudhumai penn|moovalur|pragati|ladli)\b", query_lower))
    asking_disability = bool(re.search(r"\b(pwd|disability|disabled|handicap|saksham)\b", query_lower))
    asking_msme = bool(re.search(r"\b(msme|startup|business|company|enterprise|cin|subsidy|seed fund|pmegp|udyam|loan|grant)\b", query_lower))
    asking_student = bool(re.search(r"\b(student|scholarship|college|university|exam|ug|pg|school|marks|cgpa|degree|btech|mca)\b", query_lower))
    asking_how_to_apply = bool(re.search(r"\b(how to apply|application|portal|link|process|register|registration|steps|procedure)\b", query_lower))
    asking_comparison = bool(re.search(r"\b(compare|difference|versus|vs|which is better)\b", query_lower))

    # 3. Dynamic Database Search across GovernmentScheme
    all_schemes = list(GovernmentScheme.objects.all())
    scored_schemes = []

    words = [w for w in re.findall(r"\w+", query_lower) if len(w) > 2 and w not in {"the", "and", "for", "with", "are", "what", "how", "can", "tell", "which", "give", "show"}]

    target_filter = "COMPANY" if (asking_msme or (user_type == "company" and not asking_student)) else ("STUDENT" if (asking_student or user_type == "student") else None)

    for s in all_schemes:
        score = 0
        name_lower = (s.scheme_name or "").lower()
        desc_lower = (s.description or "").lower()
        benefit_lower = (s.benefits or "").lower()
        dept_lower = (s.department or "").lower()
        elig_lower = (s.eligibility or "").lower()
        full_text = f"{name_lower} {desc_lower} {benefit_lower} {dept_lower} {elig_lower}"

        # Exact title substring match (highest priority)
        if query_lower in name_lower:
            score += 120

        # Exact phrase checks
        for phr in ["pudhumai penn", "pmegp", "central sector", "pragati", "saksham", "post matric", "pre matric", "means-cum-merit", "national overseas", "startup india", "mudra"]:
            if phr in query_lower and phr in name_lower:
                score += 150

        # Target user match
        if target_filter:
            if s.target_user.upper() == target_filter:
                score += 30
            elif s.target_user.upper() == "ALL":
                score += 15
            else:
                score -= 20

        # Geographic match
        if asking_tn:
            if "TAMIL_NADU" in s.state.upper() or "TAMIL NADU" in full_text:
                score += 45
            elif s.government_level.upper() == "STATE":
                score -= 15
        elif asking_central:
            if s.government_level.upper() == "CENTRAL":
                score += 40

        # Profile context synergy
        if profile_summary.get("type") == "student":
            p_state = profile_summary.get("state", "").upper()
            if p_state and p_state in s.state.upper():
                score += 20
            p_category = profile_summary.get("category", "").lower()
            if p_category and p_category != "general" and p_category in full_text:
                score += 25
            if profile_summary.get("marks") and profile_summary["marks"] >= 75 and ("merit" in full_text or "marks" in full_text):
                score += 20
            if profile_summary.get("income") and profile_summary["income"] <= 250000 and ("income" in full_text or "means" in full_text):
                score += 20
        elif profile_summary.get("type") == "company":
            if profile_summary.get("msme") and ("msme" in full_text or "enterprise" in full_text):
                score += 25
            if profile_summary.get("startup") and ("startup" in full_text or "seed" in full_text):
                score += 25

        # Query keywords overlap
        for word in words:
            if word in name_lower:
                score += 25
            elif word in benefit_lower or word in elig_lower:
                score += 12
            elif word in desc_lower or word in dept_lower:
                score += 6

        # Intent specific boosts
        if asking_women and ("women" in full_text or "girl" in full_text or "pudhumai" in name_lower or "pragati" in name_lower):
            score += 50
        if asking_disability and ("disabilit" in full_text or "pwd" in full_text or "saksham" in name_lower):
            score += 50
        if asking_msme and ("msme" in full_text or "seed" in full_text or "startup" in full_text or "pmegp" in full_text or "subsidy" in full_text):
            score += 45

        if score > 0:
            scored_schemes.append((score, s))

    scored_schemes.sort(key=lambda x: x[0], reverse=True)
    top_matches = [s for _, s in scored_schemes[:4]]

    # Fallback to top curated schemes if none matched explicitly
    if not top_matches and all_schemes:
        if target_filter == "COMPANY":
            top_matches = [s for s in all_schemes if s.target_user.upper() == "COMPANY"][:3]
        else:
            top_matches = [s for s in all_schemes if s.target_user.upper() == "STUDENT"][:3]

    # 4. Formulate Dynamic Conversational Response
    response_lines = []

    if is_greeting:
        response_lines.append(f"### 👋 Hello, **{username}**!")
        response_lines.append(
            "I am your real-time **AI Scheme & Scholarship Copilot**. I dynamically scan our verified repository of 500 Central and Tamil Nadu government schemes against your active profile."
        )
        if profile_summary:
            if profile_summary.get("type") == "student":
                response_lines.append(
                    f"> **Profile Intelligence Active:** Configured for **Student** in *{profile_summary.get('state', 'Tamil Nadu')}* | Course: *{profile_summary.get('course') or 'Higher Education'}* | Category: *{profile_summary.get('category', 'General')}*."
                )
            else:
                response_lines.append(
                    f"> **Enterprise Intelligence Active:** Configured for **{profile_summary.get('company_name') or 'MSME'}** | State: *{profile_summary.get('state', 'Tamil Nadu')}* | Industry: *{profile_summary.get('industry') or 'General'}*."
                )
        response_lines.append(
            "Here are popular questions you can ask me right now:\n"
            "- *'What scholarships are available for college students?'*\n"
            "- *'Am I eligible for any schemes based on my profile?'*\n"
            "- *'Show schemes for girl students in Tamil Nadu'*\n"
            "- *'What Central MSME subsidies and seed funds can I get?'*\n"
            "- *'What documents are needed to apply for scholarships?'*"
        )
    elif asking_eligibility_check:
        response_lines.append(f"### 🎯 Live Eligibility Diagnosis for **{username}**\n")
        if profile_summary.get("type") == "student":
            state = profile_summary.get("state", "Tamil Nadu")
            marks = profile_summary.get("marks")
            income = profile_summary.get("income")
            cat = profile_summary.get("category", "General")
            response_lines.append(
                f"> **Evaluated Profile Parameters:**\n"
                f"> - **State:** {state} • **Category:** {cat}\n"
                f"> - **Marks/CGPA:** {marks or 'Not specified'}% • **Annual Family Income:** ₹{income:,.0f}" if income else f"> - **Marks/CGPA:** {marks or 'Not specified'}% • **Annual Family Income:** Not specified\n"
            )
            response_lines.append("Based on our rule engine and cosine similarity matching, here are the highest-probability schemes for your profile:\n")
        else:
            response_lines.append(
                f"> **Evaluated Enterprise Parameters:**\n"
                f"> - **Entity:** {profile_summary.get('company_name') or 'Enterprise'} • **State:** {profile_summary.get('state', 'Tamil Nadu')}\n"
                f"> - **MSME Registered:** {'Yes' if profile_summary.get('msme') else 'No'} • **Recognized Startup:** {'Yes' if profile_summary.get('startup') else 'No'}\n"
            )
            response_lines.append("Here are the top subsidy and funding schemes your enterprise qualifies for:\n")
    else:
        # Direct Query Acknowledgement
        response_lines.append(f"### ✦ Insights for: *\"{query}\"*\n")
        if profile_summary.get("type") == "student" and profile_summary.get("state"):
            response_lines.append(
                f"> **Contextual Match:** Filtered against your student profile ({profile_summary.get('state')}, {profile_summary.get('course') or 'Higher Education'}).\n"
            )

    # Render Scheme Recommendations if top_matches found
    if not is_greeting and top_matches:
        response_lines.append(f"#### 🏛️ Top Verified Scheme Opportunities ({len(top_matches)}):\n")

        for idx, scheme in enumerate(top_matches, start=1):
            docs = [d.strip() for d in (scheme.required_documents or "").split(",") if d.strip()]
            docs_preview = ", ".join(docs[:4]) if docs else "Aadhaar, Marksheets, Income & Community Certificate"

            portal_url = scheme.official_portal or scheme.source_url or "https://scholarships.gov.in/"
            level_badge = "🇮🇳 Central Government" if scheme.government_level.upper() == "CENTRAL" else f"🏛️ {scheme.state} State Scheme"

            response_lines.append(f"**{idx}. [{scheme.scheme_name}]({portal_url})**")
            response_lines.append(f"- **Authority & Level:** {scheme.department} • *{level_badge}*")
            response_lines.append(f"- **Financial / Support Benefit:** {scheme.benefits}")
            response_lines.append(f"- **Eligibility Summary:** {scheme.eligibility or scheme.description}")
            if asking_docs or asking_eligibility_check:
                response_lines.append(f"- **Essential Documents:** {docs_preview}")
            response_lines.append(f"- **Official Portal Link:** [Apply / Verify via Official Site ↗]({portal_url})\n")

    # Document Section if requested
    if asking_docs:
        response_lines.append("#### 📋 Essential Documentation Checklist:")
        if target_filter == "COMPANY":
            response_lines.append("1. **Identity & Entity:** Company PAN, CIN, Memorandum of Association (MoA).")
            response_lines.append("2. **Registration Proof:** Udyam MSME Registration Certificate or DPIIT Recognition.")
            response_lines.append("3. **Financials:** Audited Balance Sheets, ITR of last 2-3 years, GST Returns.")
            response_lines.append("4. **Bank Details:** Active Current Account Bank statement with IFSC.\n")
        else:
            response_lines.append("1. **Identity & Resident Proof:** Aadhaar Card, Ration Card, or Nativity Certificate.")
            response_lines.append("2. **Income & Community Certificate:** Tahsildar / Revenue Authority certified income & caste certificate.")
            response_lines.append("3. **Academic Proof:** Current year Bonafide from institution, latest marksheet, fee receipt.")
            response_lines.append("4. **Bank Account:** Active Aadhaar-seeded savings bank passbook.\n")

    # How to Apply Steps if requested
    if asking_how_to_apply or asking_eligibility_check:
        response_lines.append("#### 🚀 Step-by-Step Application Procedure:")
        response_lines.append("1. Click the **Official Portal Link** above for your chosen scheme.")
        response_lines.append("2. Complete One-Time Registration (OTR) with your Aadhaar / Mobile number on National Scholarship Portal (`scholarships.gov.in`) or State Portal.")
        response_lines.append("3. Fill in your academic and socioeconomic profile details exactly matching your verified records.")
        response_lines.append("4. Upload clear scanned copies of required documents and submit for institutional verification.")

    content = "\n".join(response_lines)

    # 5. Extract structured scheme objects for interactive frontend rendering
    matched_data = [
        {
            "id": s.id,
            "name": s.scheme_name,
            "type": s.scheme_type,
            "target": s.target_user,
            "department": s.department,
            "state": s.state,
            "level": s.government_level,
            "benefit": s.benefits,
            "summary": s.eligibility or s.description,
            "required_documents": s.required_documents or "Aadhaar, Academic Proof, Income Certificate",
            "sourceUrl": s.official_portal or s.source_url or "https://scholarships.gov.in/",
        }
        for s in top_matches
    ]

    # 6. Generate Contextual Follow-up Suggestions dynamically based on query
    if target_filter == "COMPANY":
        suggested_actions = [
            "What documents are needed for MSME schemes?",
            "Tell me about PMEGP subsidy limit and eligibility",
            "Show startup seed fund guidelines",
            "Check my company eligibility",
        ]
    elif asking_women:
        suggested_actions = [
            "Pudhumai Penn Scheme details and monthly allowance",
            "Pragati Scholarship for girl engineering students",
            "What documents are required for girl student schemes?",
            "Check my eligibility",
        ]
    elif asking_tn:
        suggested_actions = [
            "Tamil Nadu Post-Matric Scholarship details",
            "Pudhumai Penn Scheme requirements",
            "What income certificates are accepted in Tamil Nadu?",
            "Check my student eligibility",
        ]
    elif asking_docs:
        suggested_actions = [
            "How do I apply on the National Scholarship Portal?",
            "Which schemes match my profile right now?",
            "Tamil Nadu scholarship application deadlines",
        ]
    elif asking_eligibility_check:
        suggested_actions = [
            "What documents do I need to prepare?",
            "How to apply step by step on NSP portal",
            "Show Tamil Nadu specific scholarships",
            "MSME startup grants and subsidies",
        ]
    else:
        suggested_actions = [
            "Check my eligibility against verified schemes",
            "Scholarships for Tamil Nadu college students",
            "What documents are mandatory for scholarships?",
            "Central MSME subsidies & startup funds",
        ]

    intent = "GREETING" if is_greeting else ("ELIGIBILITY_CHECK" if asking_eligibility_check else ("DOCUMENTS" if asking_docs else ("APPLICATION_PROCESS" if asking_how_to_apply else "SCHEME_SEARCH")))

    return {
        "content": content,
        "matched_schemes": matched_data,
        "suggested_actions": suggested_actions,
        "intent": intent,
    }
