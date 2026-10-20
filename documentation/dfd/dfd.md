# Data flow diagram

## Level 0

```text
Student ───────────────▶ AI SCHEME & SCHOLARSHIP RECOMMENDER ───────────────▶ Student
Company ──────────────▶                                                   │
Admin ─────────────────▶                                                   ▼
                                                                           Recommended Schemes

Student ◀────────────── Recommended Schemes
Company ◀────────────── Recommended Schemes
Admin ◀─────────────── Management Status
```

## Level 1

```text
Student / Company
        ▼
1.0 Profile Management
        ▼
User & Profile Database
        ▼
2.0 Eligibility Rule Engine
        ▼
Scheme Database
        ▼
3.0 AI Recommendation
        ▼
4.0 Scheme Ranking
        ▼
5.0 Scheme Details & Official Portal
        ▼
Recommended Schemes
```

```text
Admin
  ▼
6.0 Scheme Management
  ▼
Scheme Database
```
