# Serwis Prawny 21-9-2025
 
> See also: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) for a concise project description and quick start.
## Opis projektu

**Serwis Prawny 21-9-2025** to kompleksowa platforma wspierająca cyfrową obsługę prawną – od generowania dokumentów, przez automatyzację procesów, aż po bezpośredni kontakt z ekspertami. Projekt dedykowany jest zarówno kancelariom, firmom, jak i klientom indywidualnym, zapewniając szybki dostęp do usług prawnych, dokumentacji oraz komunikacji.

Szczegółowy opis biznesowy i funkcjonalności znajdują się w pliku [OPIS.md](OPIS.md).

Repozytorium publiczne: [serwis_prawny21-9-2025](https://github.com/rrsartneoai/serwis_prawny21-9-2025)

## Architektura i Struktura

- **Monorepo**: frontend (`/frontend`), backend (`/app`), SDK (`/sdk`)
- **Języki**: TypeScript (frontend), Python (backend)
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, SQLAlchemy ORM, Pydantic, JWT
- **Baza danych**: PostgreSQL (zalecane), SQLite (dla szybkiego startu w dewelopmencie)
- **Integracje**: Supabase, Stripe, API AI (np. OpenAI)

### Struktura plików
```diff
serwis_prawny21-9-2025/
│
├── app/                        # Backend FastAPI
│   ├── main.py                 # Główna aplikacja FastAPI
│   ├── api/                    # Endpointy API
│   │   └── v1/
│   │       ├── endpoints/      # Logika endpointów
│   ├── components/             # Komponenty UI
│   ├── core/                   # Konfiguracje, bezpieczeństwo, JWT
│   ├── db/                     # Obsługa bazy danych (SQLAlchemy)
│   ├── models/                 # Modele danych
│   └── tests/                  # Testy jednostkowe
├── OPIS.md                     # Opis biznesowy
├── frontend/                   # Frontend Next.js + React + Tailwind
├── README.Docker.md            # Instrukcje dla Docker
├── SETUP-CROSSPLATFORM.md      # Instrukcje instalacji na różnych OS
│   ├── pages/                  # Strony aplikacji
│   ├── components/             # Komponenty UI
│   └── public/                 # Statyczne zasoby (logo, pliki)
│
├── requirements.txt            # Zależności backendu (Python)
├── README.md                   # Dokumentacja techniczna
├── OPIS.md                     # Opis biznesowy
├── openapi.yaml                # Specyfikacja OpenAPI (API backend)
├── README.Docker.md            # Instrukcje dla Docker
└── sdk/                        # Generowany SDK kliencki do API
    ├── python/
    └── js/

## Further Documentation

- See `ARCHITECTURE.md` for a high-level system overview and diagram.
- See `API_REFERENCE.md` for a concise summary of major endpoints (use Swagger/OpenAPI for full details).
- See `CONTRIBUTING.md` for dev setup, branch strategy, and code standards.
- See `SECURITY.md` for policies (CORS, JWT, secrets, data protection).
- See `DEPLOYMENT.md` for staging/production deployment details using Docker Compose + Traefik and Alembic migrations.
- See `OPERATIONS.md` for operational runbooks: monitoring, troubleshooting, backups, secrets rotation, and on-call checklist.

## CI/CD and Branch Protection

- This repository includes CI workflows under `.github/workflows/` for backend and frontend (lint, type-check, tests), security scans, and deploys.
- On protected branches (e.g., `main`, `release/*`), require the following checks to pass before merging:
  - Backend CI (ruff/black/mypy/pytest/bandit)
  - Frontend CI (eslint/typecheck/jest/build)
  - Security scan (e.g., Trivy or Bandit workflow)
  - Tests suite (where configured)

Additionally:
- Dependabot is enabled via `.github/dependabot.yml` to keep Python and Node dependencies up to date.
- Snyk (optional) can be enabled in the repository settings to continuously monitor for vulnerabilities.

---

## Główne funkcjonalności

1. **Automatyczne generowanie i obsługa dokumentów prawnych**
   - Kreator umów, pism, wniosków
   - Edycja, wersjonowanie oraz elektroniczne archiwum dokumentów

2. **System komunikacji z prawnikiem**
   - Bezpieczny chat tekstowy i wideo
   - Kalendarz spotkań, powiadomienia

3. **Panel użytkownika i kancelarii**
   - Zarządzanie sprawami, dokumentacją, kontaktami
   - Automatyczna klasyfikacja spraw (status, typ)

4. **Automatyzacja procesów prawnych**
   - Wykorzystanie AI (np. do analizy dokumentów i wsparcia merytorycznego)
   - Wyszukiwanie aktów prawnych i interpretacji

5. **Bezpieczeństwo i zgodność z RODO**
   - Szyfrowanie danych
   - Pełna zgodność z RODO, audyt bezpieczeństwa

---

## Architektura techniczna

- **Monorepo**: frontend (`/frontend`, Next.js), backend (`/app`, FastAPI), SDK (`/sdk`)
- **Języki**: TypeScript (frontend), Python (backend)
- **Frontend**: Next.js, React, Tailwind CSS, shadcn/ui, integracja z API
- **Backend**: FastAPI, SQLAlchemy ORM, Pydantic (walidacja), JWT (autoryzacja)
- **Baza danych**: SQLite (możliwość rozbudowy)
- **Integracje**: Supabase, Stripe (płatności), API AI (np. OpenAI), możliwość podłączenia z zewnętrznymi usługami prawnymi

---

## Najważniejsze pliki i katalogi

- `app/main.py` – uruchamia serwer API
- `app/api/v1/endpoints/` – główne endpointy (np. autoryzacja, sprawy, dokumenty)
- `app/models/` – definicje modeli danych
- `frontend/pages/` – strony aplikacji (np. dashboard, dokumenty, kontakt)
- `frontend/components/` – komponenty interfejsu użytkownika
- `sdk/python/`, `sdk/js/` – wygenerowane biblioteki klienckie do API

---

## Przykłady integracji i rozszerzeń

- **Integracja API**: Opisana w pliku `openapi.yaml` oraz na stronie `/frontend/app/dokumentacja-api/`
- **Przykłady kodu**: Dostępne w panelu dokumentacji (JS, Python, PHP)
- **Automatyzacja**: Możliwe wdrożenie AI do analizy dokumentów (np. OpenAI, HuggingFace)
- **Bezpieczne płatności**: Stripe, BLIK, faktury VAT


## Instalacja i uruchomienie

### Frontend

  ```bash
  git clone https://github.com/rrsartneoai/serwis_prawny21-9-2025.git
  cd serwis_prawny21-9-2025/frontend
  npm install
  npm run dev
  ```
Frontend działa domyślnie na porcie `5000`.

  ### Backend
  
  ```bash
  cd serwis_prawny21-9-2025/app
  python -m venv venv
  source venv/bin/activate   # (Windows: .\venv\Scripts\activate)
  pip install -r ../requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
  Backend FastAPI działa domyślnie na porcie `8000`.
  
  ---
  
  ## Dostęp do aplikacji
  
  - **Frontend:** http://localhost:5000
  - **Backend API:** http://localhost:8000
  - **Swagger:** http://localhost:8000/api/docs
  - **OpenAPI JSON:** http://localhost:8000/api/v1/openapi.json

---

## Licencja

Brak określonej licencji. W sprawie komercyjnego wykorzystania skontaktuj się z właścicielem repozytorium.

---

## Kontakt

Właściciel repozytorium: [rrsartneoai](https://github.com/rrsartneoai)

---

## Getting Started (Professional Runbook)

This runbook provides end-to-end, standards-aligned instructions to set up, run, and verify the platform locally using either SQLite (quick start) or PostgreSQL (recommended), as well as Docker. It also documents fixed admin/operator credentials and role-based access.

- Node.js 18+ and npm
- Python 3.11+
- Recommended: PostgreSQL 14+ or Docker Desktop

  ### 1) Configure environment
  
  Create a `.env` file in the project root by copying `.env.example` and then adjust values as needed.
  
  ```bash
  cp .env.example .env
  ```
  
  Key variables in `./.env` (see `app/core/config.py` and `.env.example`):
  
  - `JWT_SECRET_KEY` — strong secret for JWT signing
  - `ACCESS_TOKEN_EXPIRE_MINUTES` — token TTL (e.g., `60`)
  - `DATABASE_URL` — if unset, backend uses SQLite `./sql_app.db`; for Postgres: `postgresql://...`
  - `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`
  - `DEFAULT_OPERATOR_EMAIL`, `DEFAULT_OPERATOR_PASSWORD`
  - `SEED_DEFAULT_USERS` — seed/update default users on startup (enable in dev)
  - `ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, `DOMAIN`, `WWW_DOMAIN`
  - `UPLOAD_MAX_MB`, `LOG_LEVEL`, `LOG_FORMAT`
  - `REDIS_URL` — for rate limiting and caching (optional)
  - `ENABLE_HIBP_CHECK`, `HIBP_TIMEOUT`
  - `LOGIN_MAX_FAILED`, `LOGIN_LOCKOUT_SECONDS_BASE`, `LOGIN_LOCKOUT_MULTIPLIER`, `LOGIN_LOCKOUT_MAX_SECONDS`
  - `NEXT_PUBLIC_BACKEND_URL` — frontend -> backend URL
  - `STRICT_ROLE_CHECK` — enforce server-side role checks in middleware
  - `DEV_MODE` — relaxes strict validations in development
  
You can change them in `.env`. They will be enforced on each backend start.

  ### 2) Backend: install and run (FastAPI)
  
  ```bash
  python -m venv venv
  source venv/bin/activate  # Windows: .\venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

Verify:

- API root: http://localhost:8000/
- Health: http://localhost:8000/api/health

### 3) Frontend: install and run (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs on http://localhost:5000 (per `frontend/package.json`). The app’s login page is at `/logowanie`.

### 4) Login and role-based access

- Go to `http://localhost:5000/logowanie` and select “Email + Hasło”.
- Use the fixed credentials from `.env`.
- Admin area: `http://localhost:5000/admin` (requires `admin` role)
- Operator panel: `http://localhost:5000/panel-operatora` (requires `operator` or `admin`)

The middleware at `frontend/middleware.ts` enforces auth. You can enable strict server-side role checks by setting `STRICT_ROLE_CHECK=true` and ensuring `NEXT_PUBLIC_BACKEND_URL` points to the backend.

### 5) Docker (optional)

This repo contains `docker-compose.yml` and environment templates for multi-service runs.

Quick start (development):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Check service logs and ensure the backend has started and seeded accounts.

### 6) Testing and linting

- Backend tests (pytest):

  ```bash
  pytest -q
  ```

- Frontend tests (Jest/Playwright where available):

  ```bash
  cd frontend
  npm run test
  ```

- Linting:

  ```bash
  cd frontend
  npm run lint
  ```

### 7) Troubleshooting

- Ensure `.env` is present at repo root and that the backend loads `JWT_SECRET_KEY` and default credentials.
- Ensure the database is reachable. If using SQLite, `sql_app.db` will be created in project root.
- If the admin/operator users existed before, the startup hook now enforces role, `is_active`, `is_verified`, and password from `.env`.
- If the frontend cannot access protected pages, ensure a valid token cookie `auth-token` exists; log in again at `/logowanie`.
- To debug middleware strict checks, set `NEXT_PUBLIC_BACKEND_URL` to the backend URL (e.g., `http://localhost:8000`).

### 8) Security and compliance notes

- Never commit real secrets. `.env.example` contains placeholders only.
- Rotate credentials regularly in non-development environments.
- See `SECURITY.md` for a full checklist (CORS, JWT, password policy, data protection).

### 9) Key files

- Backend seeding and routes: `app/main.py`, `app/api/v1/endpoints/auth.py`
- Auth service and JWT: `app/services/auth_service.py`
- User/roles models: `app/models/user.py`
- Frontend auth state/API: `frontend/lib/auth.ts`, `frontend/lib/api/auth.ts`
- Frontend middleware (guards): `frontend/middleware.ts`

If you need deployment instructions (Netlify/Vercel/Container), or CI/CD setup, let us know and we’ll add a guide.

## Health Probes

- `GET /api/healthz` — liveness probe. Fast, always returns 200 if the process responds. Use it to check if the app is alive.
- `GET /api/readyz` — readiness probe. Returns 200 only when the backend can reach its dependencies (e.g., DB). Returns 503 otherwise.

Docker Compose (backend) uses the readiness probe as a healthcheck, for example:

```yaml
services:
  backend:
    # ...
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8000/api/readyz || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 5
```
