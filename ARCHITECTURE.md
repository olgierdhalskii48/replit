# Architecture Overview

This document describes the high-level architecture of Serwis Prawny 21-9-2025, including its monorepo layout, primary services, and data flow.

## Monorepo Structure

- `app/` — FastAPI backend (REST API, business logic, DB access, authentication)
- `frontend/` — Next.js frontend (UI, auth middleware, operator/admin panels)
- `sdk/` — Generated client SDKs (Python/JS) for consuming the API

## Services and Components

- Backend (FastAPI)
  - Routers under `app/api/v1/endpoints/` (auth, users, cases, operator, payments, notifications, documents, admin, messages, templates, analysis)
  - SQLAlchemy models under `app/models/`
  - Settings and security under `app/core/`
  - Health probes: `/api/healthz`, `/api/readyz`
- Frontend (Next.js)
  - Auth middleware `frontend/middleware.ts` for protecting routes
  - Admin/Operator dashboards
- Database
  - SQLite (dev default) or PostgreSQL (recommended)
- Notifications and AI
  - In-app notifications
  - AI document analysis service hooks (`app/services/ai_document_analysis_service.py`)

## Data Flow (Mermaid)

```mermaid
flowchart LR
  subgraph Frontend[Next.js Frontend]
    UI[Pages/Components]
    MW[Auth Middleware]
  end
  subgraph Backend[FastAPI Backend]
    API[(Routers /api/v1/...)]
    Svc[Services]
    Sec[Security/JWT]
    DB[(SQLAlchemy Models)]
  end
  UI -- HTTPS/JSON --> API
  MW -- Cookies/JWT --> API
  API -- Business Calls --> Svc
  API -- RBAC/JWT --> Sec
  API -- ORM --> DB
  Svc -- AI/Notifications --> Ext[(External Providers)]
```

## Key URLs

- Swagger UI: `http://localhost:8000/api/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`
- Liveness: `GET /api/healthz`
- Readiness: `GET /api/readyz`

## Security Notes

- JWT-based auth with role enforcement (client/operator/admin)
- CORS/Hosts controlled via env (`ALLOWED_ORIGINS`, `ALLOWED_HOSTS`)
- Request size limits and security headers middleware

## Deployability

- Dockerfiles and Compose files for local and multi-service environments
- Healthchecks wired to readiness probe

## Data Model (ER Diagram)

```mermaid
erDiagram
  USER ||--o{ CASE : creates
  USER ||--o{ NOTIFICATION : receives
  USER ||--o{ PAYMENT : makes
  USER ||--o{ VERIFICATION_CODE : has
  USER {
    int id PK
    string email
    string role "CLIENT|OPERATOR|ADMIN"
    bool is_active
    bool is_verified
  }

  CASE ||--o{ DOCUMENT : has
  CASE ||--o| ANALYSIS : has
  CASE ||--o{ LEGAL_DOCUMENT : proposes
  CASE ||--o{ PAYMENT : relates
  CASE {
    int id PK
    int user_id FK
    int operator_id FK "nullable"
    string title
    string status "enum"
    datetime created_at
  }

  DOCUMENT {
    int id PK
    int case_id FK
    string filename
    string original_filename
    string file_type "pdf|image|doc"
    int file_size
    string file_path
  }

  ANALYSIS {
    int id PK
    int case_id FK
    int operator_id FK
    text content
    float confidence_score
    bool is_preview
  }

  LEGAL_DOCUMENT {
    int id PK
    int case_id FK
    int operator_id FK
    string document_name
    string document_type
    text content
    float price
    bool is_purchased
    bool is_preview
  }

  PAYMENT {
    int id PK
    int user_id FK
    int case_id FK
    float amount
    string status "enum"
    datetime paid_at
  }

  NOTIFICATION {
    int id PK
    int user_id FK
    int case_id FK "nullable"
    string type "IN_APP|EMAIL|SMS"
    string status "SENT|READ"
    string subject
    text content
  }

  VERIFICATION_CODE {
    int id PK
    int user_id FK
    string code
    string code_type
    datetime expires_at
    bool is_used
  }
```
