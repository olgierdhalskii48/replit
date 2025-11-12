
---

# Przegląd Architektury

Ten dokument opisuje architekturę wysokiego poziomu Serwisu Prawnego, w tym jego układ monorepo, główne usługi i przepływ danych.

## Struktura Monorepo

- `app/` — Backend FastAPI (API REST, logika biznesowa, dostęp do bazy danych, uwierzytelnianie)
- `frontend/` — Frontend Next.js (interfejs użytkownika, middleware uwierzytelniania, panele operatora/administratora)
- `sdk/` — Wygenerowane klienckie SDK (Python/JS) do konsumpcji API

## Usługi i Komponenty

- **Backend (FastAPI)**
  - Routery w `app/api/v1/endpoints/` (auth, users, cases, operator, payments, notifications, documents, admin, messages, templates, analysis)
  - Modele SQLAlchemy w `app/models/`
  - Ustawienia i bezpieczeństwo w `app/core/`
  - Sondy kondycji (Health probes): `/api/healthz`, `/api/readyz`
- **Frontend (Next.js)**
  - Middleware uwierzytelniania `frontend/middleware.ts` do ochrony tras (routes)
  - Pulpity administratora/operatora
- **Baza danych**
  - SQLite (domyślnie w trybie deweloperskim) lub PostgreSQL (zalecane)
- **Powiadomienia i AI**
  - Powiadomienia w aplikacji
  - Hooki usługi analizy dokumentów AI (`app/services/ai_document_analysis_service.py`)

## Przepływ Danych (Mermaid)

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

## Kluczowe Adresy URL

- Interfejs Swagger: `http://localhost:8000/api/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`
- Żywotność (Liveness): `GET /api/healthz`
- Gotowość (Readiness): `GET /api/readyz`

## Uwagi Dotyczące Bezpieczeństwa

- Uwierzytelnianie oparte na JWT z egzekwowaniem ról (client/operator/admin)
- Kontrola CORS/Hostów za pomocą zmiennych środowiskowych (`ALLOWED_ORIGINS`, `ALLOWED_HOSTS`)
- Limity rozmiaru żądań i middleware z nagłówkami bezpieczeństwa

## Wdrażalność

- Pliki Dockerfile i Compose dla środowisk lokalnych i wielousługowych
- Healthchecki podłączone do sondy gotowości (readiness probe)

## Model Danych (Diagram ER)

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