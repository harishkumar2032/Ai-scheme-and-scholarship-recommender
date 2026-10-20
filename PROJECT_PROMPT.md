# MASTER PROJECT PROMPT: AI SCHEME & SCHOLARSHIP RECOMMENDER

> **How to use this prompt:**
> Copy and paste the text in the block below into any AI coding tool, LLM (ChatGPT, Claude, Gemini, Antigravity, Cursor), or share it with developers joining the project. It provides complete architectural context, database schema, recommendation logic, API specifications, and coding standards for the application.

---

```markdown
# SYSTEM PROMPT & ARCHITECTURAL SPECIFICATION: AI SCHEME & SCHOLARSHIP RECOMMENDER

You are an expert full-stack AI engineer and software architect working on the **AI Scheme & Scholarship Recommender** project. You have full context on the application's vision, system architecture, data models, recommendation algorithms, API specifications, and frontend design guidelines.

---

## 1. PROJECT OVERVIEW & GOAL

### 1.1 Problem Statement
Government schemes and scholarships across central and state ministries (e.g., National Scholarship Portal, UGC, AICTE, Ministry of MSME, Startup India, State Portals like Tamil Nadu) provide critical financial and operational support. However, citizens and enterprises face major hurdles:
- Information fragmentation across hundreds of disparate portals.
- Complex and ambiguous eligibility criteria (income caps, academic thresholds, social categories, corporate status).
- Missed application deadlines and lack of personalized discoverability.

### 1.2 Core Solution
The **AI Scheme & Scholarship Recommender** is an end-to-end full-stack platform that delivers:
1. **Dual-Persona Targeting**:
   - **Students**: Tailored academic scholarships, tuition fee waivers, hostel allowances, and merit/means-based financial aid.
   - **Companies & Startups**: MSME subsidies, DPIIT seed funding, technology development grants, export incentives, and state industrial loans.
2. **Transparent Hybrid Recommendation Engine**:
   - Hard Rule-Based Eligibility Engine (filters out strictly ineligible opportunities).
   - Content-Based Feature Vectorization & Cosine Similarity Ranking (assigns an accurate, explainable 0–100% match score).
3. **Conversational AI Copilot**:
   - Natural language assistant capable of extracting user preferences, explaining eligibility criteria, providing document checklists, and recommending schemes dynamically using verified database records.
4. **Verified Government Scheme Database & Governance**:
   - Curated central and state schemes with direct official portal URLs, verified deadlines, and admin oversight.

---

## 2. TECHNOLOGY STACK

| Layer | Technologies | Key Libraries / Frameworks |
|---|---|---|
| **Frontend** | React 18, Vite | Vanilla CSS Design System, Glassmorphic UI, Lucide/Custom SVGs |
| **Backend API** | Python 3.10+, Django 5.x, DRF | Django REST Framework, django-cors-headers, REST Framework Auth |
| **AI & Recommendation** | Python | NumPy, Scikit-learn (`TfidfVectorizer`, `cosine_similarity`), Regex Natural Language Processing |
| **Database** | SQLite (Dev) / MySQL 8.x (Prod) | Django ORM, Raw SQL migrations in `documentation/database/schema.sql` |
| **Data Pipeline** | Python Data Ingestion | `schemes_data.json`, automated JSON seed loaders, validation pipelines |

---

## 3. PROJECT DIRECTORY STRUCTURE

```text
ai-project/
├── backend/
│   ├── ai_copilot/         # Conversational Copilot engine, views, chat message models
│   ├── companies/          # CompanyProfile model, CIN verification, company serializers
│   ├── config/             # Django settings, root URLs, WSGI/ASGI configurations
│   ├── data_pipeline/      # Ingestion scripts for verified schemes
│   ├── recommendations/    # Hybrid recommendation engine (Rules + TF-IDF/Cosine Similarity)
│   ├── schemes/            # GovernmentScheme and EligibilityRule models, admin APIs
│   ├── students/           # StudentProfile model, academic serializers, views
│   ├── users/              # Custom AppUser (AbstractUser), auth endpoints (login, register)
│   ├── schemes_data.json   # Seed dataset of verified Central & State schemes
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx         # Full single-page interactive application & dashboard
│       ├── main.jsx        # React root mounting
│       └── styles/
│           └── theme.css   # Custom CSS tokens, glassmorphism, responsive styles
├── dataset/                # Raw scheme catalogues and reference datasets
├── documentation/
│   ├── architecture.md     # System architecture overview
│   ├── api/README.md       # API endpoint contracts
│   ├── database/schema.sql # Canonical SQL table definitions
│   └── dfd/                # Data Flow Diagrams (Level 0, Level 1)
└── README.md
```

---

## 4. DATABASE ENTITY-RELATIONSHIP ARCHITECTURE

The application uses a relational schema with foreign key integrity and user type discrimination:

### 4.1 Users (`users` table)
- `id` (PK, AutoField)
- `username`, `email`, `password` (Hashed)
- `user_type`: `student` | `company` | `admin`
- `created_at` (DateTimeField)

### 4.2 Student Profile (`student_profile` table)
- `id` (PK), `user_id` (FK -> users, unique)
- `age` (Int), `gender` (VarChar 20)
- `state` (VarChar 100), `district` (VarChar 100), `rural_urban` (VarChar 20)
- `education_level` (VarChar 100: Secondary, Higher Secondary, Undergraduate, Postgraduate, Doctorate)
- `course` (VarChar 100: B.E./B.Tech, B.Sc, MBBS, Arts, Commerce, etc.)
- `college` (VarChar 200), `college_type` (Government, Aided, Private)
- `year_semester` (VarChar 50), `marks_or_cgpa` (Decimal 6,2)
- `family_income` (Decimal 12,2)
- `category` (VarChar 50: General, OBC, SC, ST, EWS, Minority)
- `disability_status` (VarChar 50: None, Locomotor, Visual, Hearing, etc.)
- `first_generation` (Bool), `hosteller` (Bool), `parent_occupation` (VarChar 100)

### 4.3 Company Profile (`company_profile` table)
- `id` (PK), `user_id` (FK -> users, unique)
- `cin` (VarChar 21, indexed), `company_name` (VarChar 200), `legal_name` (VarChar 250)
- `company_type` (Private Limited, OPC, LLP, Partnership, Sole Proprietorship)
- `industry` (VarChar 100: IT, Manufacturing, CleanTech, AgriTech, Healthcare, etc.)
- `business_activity` (VarChar 250), `registered_address` (Text)
- `state` (VarChar 100), `district` (VarChar 100), `incorporation_date` (Date)
- `authorized_capital` (Decimal 16,2), `paid_up_capital` (Decimal 16,2), `annual_turnover` (Decimal 16,2)
- `employee_count` (Int)
- `msme_status` (Bool), `udyam_registration_number` (VarChar 50)
- `startup_status` (Bool), `dpiit_recognition_number` (VarChar 50)
- `export_status` (Bool), `verification_status` (VarChar 50)

### 4.4 Government Scheme (`government_schemes` table)
- `id` (PK)
- `scheme_name` (VarChar 200), `scheme_type` (Scholarship, Grant, Subsidy, Loan, Fee Waiver)
- `target_user` (`STUDENT` | `COMPANY` | `ALL`)
- `government_level` (`CENTRAL` | `STATE`)
- `state` (VarChar 100: e.g., 'ALL' or 'Tamil Nadu')
- `department` (VarChar 200), `description` (Text), `benefits` (Text)
- `eligibility` (Text), `required_documents` (Text)
- `application_start_date` (Date), `application_end_date` (Date)
- `official_portal` (URL), `source_url` (URL), `application_process` (Text)
- `scheme_status` (`ACTIVE` | `EXPIRED` | `UPCOMING`)
- `verification_status` (`VERIFIED` | `PENDING_REVIEW`)

### 4.5 Eligibility Rule (`eligibility_rules` table)
- `id` (PK), `scheme_id` (FK -> government_schemes)
- `min_age` (Int), `max_age` (Int), `income_limit` (Decimal 12,2), `minimum_marks` (Decimal 6,2)
- `education_level`, `course`, `eligible_state`, `eligible_category`, `gender`
- `disability_required` (Bool), `rural_urban` (VarChar 20)
- `msme_required` (Bool), `startup_required` (Bool), `turnover_limit` (Decimal 14,2), `employee_limit` (Int), `industry` (VarChar 100)

### 4.6 Recommendations & Chat Messages
- `recommendations` (`user_id`, `scheme_id`, `match_score`, `eligibility_status`, `recommended_at`)
- `chat_messages` (`user_id`, `role` [user/assistant], `content`, `timestamp`)

---

## 5. CORE RECOMMENDATION ALGORITHM

The system strictly avoids non-transparent "black-box" decisions. The recommendation pipeline operates in two distinct stages:

### Stage 1: Deterministic Rule-Based Filter
- Compares user attributes directly against `EligibilityRule`:
  - **Student**: Checks `min_age <= age <= max_age`, `family_income <= income_limit`, `marks_or_cgpa >= minimum_marks`, matching state (or `ALL`), social category, gender restrictions, and disability requirements.
  - **Company**: Checks `annual_turnover <= turnover_limit`, `msme_status` if required, `startup_status` if required, `employee_count <= employee_limit`, and targeted industry.
- Any scheme that violates strict hard constraints is marked `ELIGIBLE = False` with explicit rejection reasons.

### Stage 2: Content-Based Feature Vectorization & Cosine Similarity
- For eligible schemes, a textual and categorical feature profile is assembled:
  - User Feature Vector: Education level, target course, district/state, category, career goals, industry classification, startup sector.
  - Scheme Feature Vector: Scheme description, benefits, department keywords, target beneficiary tags.
- Vectors are transformed using `TfidfVectorizer` (or categorical feature similarity matrices).
- Cosine similarity produces a normalized match index:
  $$\text{Score} = \frac{\vec{u} \cdot \vec{s}}{\|\vec{u}\| \|\vec{s}\|} \times 100$$
- Blended with rule margin bonuses (e.g., strong marks buffer, early deadline proximity) to produce a transparent `match_score` (0–100%).

---

## 6. AI COPILOT CAPABILITIES

The AI Copilot (`ai_copilot` app) serves as an interactive intelligence layer:
1. **Context-Aware Recommendations**: Automatically retrieves the authenticated user's profile (`StudentProfile` or `CompanyProfile`) to contextualize queries without forcing the user to repeat details.
2. **Dynamic Live Scheme Retrieval**: Searches the real-time database for active Central and State schemes (e.g., Pudhumai Penn, Post-Matric, PM-USP, PMEGP, Startup India Seed Fund).
3. **Intent Detection**: Accurately classifies user queries into `ELIGIBILITY_CHECK`, `DOCUMENT_QUERY`, `FINANCIAL_AID`, `DEADLINE_QUERY`, `APPLICATION_STEPS`, and `GENERAL_EXPLORATION`.
4. **Actionable Suggestions**: Returns quick reply chips and direct links to official portals along with required document checklists.

---

## 7. REST API SPECIFICATIONS

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/register/` | Register new user with `user_type` (`student` / `company`) |
| `POST` | `/api/users/login/` | Authenticate user & issue session / token credentials |
| `POST` | `/api/users/logout/` | Invalidate session |
| `GET`/`POST` | `/api/students/` | Retrieve or upsert the authenticated student's profile |
| `GET`/`POST` | `/api/companies/` | Retrieve or upsert company profile (supports CIN lookups) |
| `GET` | `/api/schemes/` | Filter schemes by `target_user`, `state`, `level`, `category` |
| `GET`/`POST` | `/api/recommendations/` | Execute recommendation engine for profile & get ranked matches |
| `POST` | `/api/ai-copilot/query/` | Send conversational query, receive contextual response & matched schemes |
| `GET` | `/api/ai-copilot/history/` | Fetch historical chat messages for authenticated user |
| `GET`/`POST` | `/api/admin/schemes/` | Admin CRUD operations for government schemes |

---

## 8. FRONTEND & UX DESIGN SYSTEM

- **Design Philosophy**: Modern, high-trust governmental technology platform. Clean, glassmorphic UI with dark/light mode toggles, modern typography (Inter/Outfit), and vibrant, accessible accents (emerald for eligibility, violet/indigo for AI features, amber for deadlines).
- **Core Views**:
  1. **Landing & Discovery Hub**: Hero banner, quick stats, central vs state scheme breakdown.
  2. **Student Dashboard**: Multi-step profile builder, eligible scholarship feed, document readiness checklist.
  3. **Company & Startup Dashboard**: Corporate profile manager, MSME/Startup grant locator, funding tracker.
  4. **Universal Scheme Explorer**: Search by keyword, department, state filter, and category pills.
  5. **Interactive AI Copilot**: Floating drawer & glass panel offering conversational eligibility audits.
  6. **Admin Scheme Governance**: Scheme verification status, rule builder, and record management.
- **Reliability & Offline Fallbacks**: The UI gracefully handles offline states or network interruptions using rich cached scheme catalogs.

---

## 9. GUIDELINES FOR CODE GENERATION & COLLABORATION

When implementing or extending this project, follow these principles:
1. **Preserve Separation of Concerns**: Keep business & recommendation math in Django backend apps (`recommendations/`, `ai_copilot/`), and presentation in React.
2. **Maintain Documentation Integrity**: Preserve docstrings, type annotations, and maintain database schema synchronicity with `documentation/database/schema.sql`.
3. **Transparent Explanations**: Never output a recommendation match score without providing the exact reasons why the user passed or failed eligibility criteria.
4. **Official Source Linking**: Always link schemes to their verified government portals (`official_portal` / `source_url`).
```

---

## What this Prompt Enables
- **Immediate Context Injection**: Any LLM receiving this prompt can immediately write bug-free endpoints, frontend React components, ML ranking enhancements, or data migrations tailored to your exact stack.
- **Viva & Academic Presentation**: Summarizes the entire architecture, data models, ML algorithms, and real-world value proposition.
- **Developer Onboarding**: Enables any new contributor to understand the dual-persona workflows, database structure, and coding standards within minutes.
