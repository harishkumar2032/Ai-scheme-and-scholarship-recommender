# AI Scheme & Scholarship Recommender

A premium full-stack academic project for intelligent discovery of government schemes and scholarships for students and companies.

## Product vision

This platform combines a structured recommendation engine, AI-assisted guidance, and verified government scheme records. The system is designed to help students and companies discover relevant public schemes while keeping the recommendation process transparent and explainable.

## Architecture at a glance

- Frontend: React + Vite
- Backend: Django + Django REST Framework
- Database: MySQL
- Recommendation stack: Rule-based eligibility engine + content-based filtering + cosine similarity
- AI layer: conversational profile extraction and explanation layer over verified scheme data

## Core workflow

1. User enters profile details or converses with the AI Copilot.
2. Profile is validated and stored in the user database.
3. The rule engine filters non-eligible schemes.
4. A content-based model compares profile features with scheme metadata.
5. Cosine similarity ranks the remaining schemes.
6. Results are displayed with rationale, deadlines, and official links.

## Solution structure

- `frontend/` — React UI and design system
- `backend/` — Django project and service apps
- `dataset/` — data and synthetic reference samples
- `documentation/` — DFD, schema, and API references

## Getting started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

## Project phases

1. Architecture and database planning
2. Authentication and user management
3. Student and company profiles
4. Scheme database and admin governance
5. Eligibility engine and ranking logic
6. Recommendation dashboard
7. AI Copilot and pipeline automation
8. Testing, polish, and deployment preparation
"# Ai-scheme-and-scholarship-recommender" 
