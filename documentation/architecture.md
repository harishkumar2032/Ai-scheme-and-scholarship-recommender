# System architecture

## 1. High-level architecture

The application is designed around a hybrid recommendation flow:

- User profile data is collected from manual forms or conversational AI prompts.
- A rule engine removes clearly ineligible schemes based on mandatory constraints.
- A content-based matching layer compares profile features against scheme metadata.
- Cosine similarity creates a ranking score for the final recommendation set.
- Results are explained to the user with clear rationale and official source verification.

## 2. Component layout

```text
User
├── Student Profile
│   └── Education, income, district, category, disability, etc.
├── Company Profile
│   └── CIN, industry, turnover, employee count, MSME, startup, etc.
└── Admin Management

React Frontend
├── Landing page
├── Auth flows
├── Dashboard views
├── Scheme search and filters
├── AI Copilot glass panel
└── Recommendation cards and details

Django REST API
├── Users
├── Students
├── Companies
├── Schemes
├── Recommendations
├── AI Copilot
└── Data pipeline

MySQL
├── Users
├── Student_Profile
├── Company_Profile
├── Government_Schemes
├── Eligibility_Rules
├── Recommendations
└── Verification metadata

Python AI Layer
├── Eligibility rule engine
├── Feature extraction
├── Content-based matching
├── Cosine similarity
└── Ranking and explanation generator
```

## 3. Design principles

- Keep AI as a conversational layer, not the sole decision engine.
- Treat the recommendation score as a match indicator, not a government guarantee.
- Store source URLs and verification metadata for every scheme.
- Separate eligibility filtering from ranking to preserve transparency.
- Keep business logic in the backend and keep the frontend presentation-driven.

## 4. Layer boundaries

- Frontend: UI, routing, form handling, result display
- API: schema validation, authentication, business orchestration
- Data layer: MySQL persistence and structured scheme records
- AI layer: recommendation math and extraction logic
- Data pipeline: collection, validation, and administration of official sources
