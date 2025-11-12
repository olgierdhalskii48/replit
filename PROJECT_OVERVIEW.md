# Project Overview: Serwis Prawny 

A full-stack legal services platform enabling digital legal workflows: document generation, case handling, AI-assisted analysis, secure client-operator collaboration, and payments. Built as a monorepo with a Next.js frontend, FastAPI backend, and generated SDKs.

- **Repository**: `rrsartneoai/serwis_prawny21-9-2025`
- **Frontend**: Next.js + React + Tailwind + shadcn/ui (`frontend/`)
- **Backend**: FastAPI + SQLAlchemy + Pydantic + JWT (`app/`)
- **Database**: SQLite (dev) or PostgreSQL (recommended)
- **Integrations**: Supabase, Stripe, AI providers (e.g., OpenAI)
- **Docker**: `docker-compose.*.yml` for multi-service runs

## Key Features

- **Case management**: create, update, list, delete cases (`app/api/v1/endpoints/cases.py`)
- **File uploads**: PDFs, DOC/DOCX, images with validation and size/type limits
- **Operator portal**: case assignment, AI analysis, document drafts, status updates (`app/api/v1/endpoints/operator.py`)
- **Notifications**: in-app notifications for events (analysis/documents ready)
- **Auth & security**: JWT, role-based access (admin/operator/client), verification flow (`app/services/auth_service.py`)
- **Health endpoints**: liveness and readiness probes for ops
- **CI ready**: linting, tests, security scans (per `README.md`)

## Tech Stack

- Backend: FastAPI, SQLAlchemy ORM, Pydantic, `python-jose`, Passlib
- Frontend: Next.js, React, Tailwind CSS, shadcn/ui
- DB: SQLite / PostgreSQL
- Tooling: Pytest, Ruff/Black/Mypy, Jest/Playwright (where present)
- Containerization: Docker, Docker Compose

## Repository Structure

```text
serwis_prawny21-9-2025/
├── app/                      # FastAPI backend
│   ├── main.py               # App entrypoint, startup hooks (seeding)
│   ├── api/v1/endpoints/     # REST endpoints (e.g., cases, operator)
│   ├── core/                 # Config, security, JWT (`config.py`)
│   ├── db/                   # Database session and Base
│   ├── models/               # SQLAlchemy models (user, case, etc.)
│   └── tests/                # Pytest setup and fixtures (`conftest.py`)
├── frontend/                 # Next.js app
├── sdk/                      # Generated client SDKs (python/js)
├── requirements.txt          # Backend deps
├── pyproject.toml            # Project metadata
├── docker-compose*.yml       # Compose setups
└── Dockerfile.backend        # Backend Dockerfile
```

## Backend Highlights

- **Settings**: centralized via `pydantic-settings` (`app/core/config.py`)
  - Important vars: `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`, `SEED_DEFAULT_USERS`, default admin/operator creds, CORS/hosts.
- **Auth service** (`app/services/auth_service.py`):
  - Password hashing/verify, JWT creation/verification, verification codes, Google OAuth scaffolding, email/SMS verification stubs.
- **Cases API** (`app/api/v1/endpoints/cases.py`):
  - POST `/api/v1/cases` – create case with file uploads (type/size checks, 10MB/file, 5 files)
  - GET `/api/v1/cases` – list current user’s cases (requires verified user)
  - GET/PUT/DELETE `/api/v1/cases/{id}` – retrieve/update/delete case
  - Files: download/preview/rename/delete operations
- **Operator API** (`app/api/v1/endpoints/operator.py`):
  - GET `/api/v1/operator/cases` – operator/admin view with client info and related data
  - POST `/cases/{id}/analysis` – create analysis, send notification, update status
  - POST `/cases/{id}/legal-documents` – add draft legal document, notify client
  - PUT `/cases/{id}/status`, POST `/cases/{id}/assign`
  - Messaging to client/admin, stats for dashboard, AI analysis trigger, documents summary

## Health Probes

- GET `/api/healthz` – liveness
- GET `/api/readyz` – readiness (DB reachable), used in Docker healthchecks

## Setup

- Prereqs: Node 18+, Python 3.11+, PostgreSQL 14+ (optional), Docker (optional)
- Environment:
  - Copy `.env.example` to `.env` (repo root)
  - Set `JWT_SECRET_KEY`, token TTL, default users, and `DATABASE_URL` (e.g., `postgresql://...` or keep SQLite)

## Run Locally

- Backend (FastAPI):
  ```bash
  python -m venv venv
  source venv/bin/activate  # Windows: .\venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
  - API root: http://localhost:8000/
  - Swagger: http://localhost:8000/api/docs
- Frontend (Next.js):
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  - Dev server: http://localhost:5000

## Docker (Optional)

- Dev:
  ```bash
  docker compose -f docker-compose.dev.yml up --build
  ```
- The backend service uses `/api/readyz` as healthcheck.

## Testing

- Backend (pytest):
  ```bash
  pytest -q
  ```
  - `app/tests/conftest.py` sets up in-memory SQLite and overrides dependencies
- Frontend:
  ```bash
  cd frontend
  npm run test
  ```

## Security

- JWT-based auth, role checks in middleware and backend guards
- Verification flows (email/SMS) stubs in services
- Do not commit real secrets; rotate credentials in non-dev
- CORS/hosts configurable in `Settings` (`app/core/config.py`)

## API Examples

- Create case (multipart form, auth required):
  - `POST /api/v1/cases`
  - Fields: `title` (required), `description`, `client_notes`, `client_context`, `metadata` (JSON/text), `package_type` (`basic|standard|premium|express`), `package_price`, `files[]`
- Operator actions (operator or admin token required):
  - `POST /api/v1/operator/cases/{id}/analysis`
  - `POST /api/v1/operator/cases/{id}/legal-documents`
  - `PUT  /api/v1/operator/cases/{id}/status`
  - `POST /api/v1/operator/cases/{id}/assign`
  - `GET  /api/v1/operator/cases` with optional filters

## Roadmap (suggested)

- Payments integration (Stripe) full flow and webhooks
- Real email/SMS providers integration
- Rich editor/templates for legal docs
- Advanced audit logs and GDPR tooling
- Expanded SDKs and example apps
