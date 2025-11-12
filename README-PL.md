
---

# Serwis Prawny 21-9-2025

![Dependabot](https://img.shields.io/badge/Dependabot-enabled-brightgreen)![Snyk](https://img.shields.io/badge/Snyk-monitored-blue)
 
> Zobacz również: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) aby zapoznać się ze zwięzłym opisem projektu i szybkim startem.
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

## Dalsza Dokumentacja

- Zobacz `ARCHITECTURE.md` aby zapoznać się z ogólnym przeglądem systemu i diagramem.
- Zobacz `API_REFERENCE.md` aby uzyskać zwięzłe podsumowanie głównych endpointów (użyj Swagger/OpenAPI dla pełnych szczegółów).
- Zobacz `CONTRIBUTING.md` aby poznać zasady konfiguracji deweloperskiej, strategię gałęzi i standardy kodu.
- Zobacz `SECURITY.md` aby zapoznać się z politykami (CORS, JWT, sekrety, ochrona danych).
- Zobacz `DEPLOYMENT.md` aby uzyskać szczegóły dotyczące wdrożenia na środowiska stagingowe/produkcyjne przy użyciu Docker Compose + Traefik i migracji Alembic.
- Zobacz `OPERATIONS.md` aby zapoznać się z instrukcjami operacyjnymi: monitoring, rozwiązywanie problemów, kopie zapasowe, rotacja sekretów i lista kontrolna dyżurów (on-call).

## CI/CD i Ochrona Gałęzi

- Repozytorium zawiera przepływy pracy CI (workflows) w katalogu `.github/workflows/` dla backendu i frontendu (lint, sprawdzanie typów, testy), skany bezpieczeństwa oraz wdrożenia.
- Na chronionych gałęziach (np. `main`, `release/*`) wymagane jest, aby następujące testy zakończyły się powodzeniem przed scaleniem:
  - CI Backendu (ruff/black/mypy/pytest/bandit)
  - CI Frontendu (eslint/typecheck/jest/build)
  - Skan bezpieczeństwa (np. workflow Trivy lub Bandit)
  - Pakiet testów (tam, gdzie skonfigurowano)

Dodatkowo:
- Dependabot jest włączony za pomocą pliku `.github/dependabot.yml` w celu utrzymania aktualnych zależności Python i Node.
- Snyk (opcjonalnie) może być włączony w ustawieniach repozytorium do ciągłego monitorowania podatności.

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

## Pierwsze Kroki (Instrukcja Profesjonalna)

Ta instrukcja zawiera kompleksowe, zgodne ze standardami wytyczne dotyczące konfiguracji, uruchomienia i weryfikacji platformy lokalnie przy użyciu SQLite (szybki start) lub PostgreSQL (zalecane), a także Docker. Dokumentuje również stałe dane logowania administratora/operatora i dostęp oparty na rolach.

- Node.js 18+ i npm
- Python 3.11+
- Zalecane: PostgreSQL 14+ lub Docker Desktop

  ### 1) Skonfiguruj środowisko
  
  Utwórz plik `.env` w głównym katalogu projektu, kopiując `.env.example`, a następnie dostosuj wartości do swoich potrzeb.
  
  ```bash
  cp .env.example .env
  ```
  
  Kluczowe zmienne w `./.env` (zobacz `app/core/config.py` i `.env.example`):
  
  - `JWT_SECRET_KEY` — silny klucz tajny do podpisywania JWT
  - `ACCESS_TOKEN_EXPIRE_MINUTES` — czas życia tokena (np. `60`)
  - `DATABASE_URL` — jeśli nieustawione, backend używa SQLite `./sql_app.db`; dla Postgres: `postgresql://...`
  - `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`
  - `DEFAULT_OPERATOR_EMAIL`, `DEFAULT_OPERATOR_PASSWORD`
  - `SEED_DEFAULT_USERS` — tworzy/aktualizuje domyślnych użytkowników przy starcie (włącz w trybie deweloperskim)
  - `ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, `DOMAIN`, `WWW_DOMAIN`
  - `UPLOAD_MAX_MB`, `LOG_LEVEL`, `LOG_FORMAT`
  - `REDIS_URL` — do ograniczania zapytań i buforowania (opcjonalnie)
  - `ENABLE_HIBP_CHECK`, `HIBP_TIMEOUT`
  - `LOGIN_MAX_FAILED`, `LOGIN_LOCKOUT_SECONDS_BASE`, `LOGIN_LOCKOUT_MULTIPLIER`, `LOGIN_LOCKOUT_MAX_SECONDS`
  - `NEXT_PUBLIC_BACKEND_URL` — URL backendu dla frontendu
  - `STRICT_ROLE_CHECK` — wymusza sprawdzanie ról po stronie serwera w middleware
  - `DEV_MODE` — łagodzi rygorystyczne walidacje w trybie deweloperskim
  
Możesz je zmienić w pliku `.env`. Zostaną one zastosowane przy każdym uruchomieniu backendu.

  ### 2) Backend: instalacja i uruchomienie (FastAPI)
  
  ```bash
  python -m venv venv
  source venv/bin/activate  # Windows: .\venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```

Weryfikacja:

- Główny adres API: http://localhost:8000/
- Status (Health): http://localhost:8000/api/health

### 3) Frontend: instalacja i uruchomienie (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Serwer deweloperski frontendu działa na http://localhost:5000 (zgodnie z `frontend/package.json`). Strona logowania aplikacji znajduje się pod adresem `/logowanie`.

### 4) Logowanie i dostęp oparty na rolach

- Przejdź do `http://localhost:5000/logowanie` i wybierz „Email + Hasło”.
- Użyj stałych danych logowania z pliku `.env`.
- Panel administratora: `http://localhost:5000/admin` (wymaga roli `admin`)
- Panel operatora: `http://localhost:5000/panel-operatora` (wymaga roli `operator` lub `admin`)

Middleware w `frontend/middleware.ts` wymusza uwierzytelnianie. Możesz włączyć rygorystyczne sprawdzanie ról po stronie serwera, ustawiając `STRICT_ROLE_CHECK=true` i upewniając się, że `NEXT_PUBLIC_BACKEND_URL` wskazuje na backend.

### 5) Docker (opcjonalnie)

Repozytorium zawiera plik `docker-compose.yml` i szablony środowiskowe do uruchamiania wielu usług.

Szybki start (deweloperski):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Sprawdź logi usług i upewnij się, że backend uruchomił się i utworzył konta.

### 6) Testowanie i linting

- Testy backendu (pytest):

  ```bash
  pytest -q
  ```

- Testy frontendu (Jest/Playwright, jeśli dostępne):

  ```bash
  cd frontend
  npm run test
  ```

- Linting:

  ```bash
  cd frontend
  npm run lint
  ```

### 7) Rozwiązywanie problemów

- Upewnij się, że plik `.env` znajduje się w głównym katalogu repozytorium i że backend wczytuje `JWT_SECRET_KEY` oraz domyślne dane logowania.
- Upewnij się, że baza danych jest osiągalna. Jeśli używasz SQLite, plik `sql_app.db` zostanie utworzony w głównym katalogu projektu.
- Jeśli użytkownicy admin/operator istnieli wcześniej, skrypt startowy teraz wymusza rolę, `is_active`, `is_verified` i hasło z `.env`.
- Jeśli frontend nie ma dostępu do chronionych stron, upewnij się, że istnieje prawidłowe ciasteczko z tokenem `auth-token`; zaloguj się ponownie na `/logowanie`.
- Aby debugować rygorystyczne sprawdzanie w middleware, ustaw `NEXT_PUBLIC_BACKEND_URL` na adres URL backendu (np. `http://localhost:8000`).

### 8) Uwagi dotyczące bezpieczeństwa i zgodności

- Nigdy nie umieszczaj w repozytorium prawdziwych kluczy i haseł. `.env.example` zawiera tylko symbole zastępcze.
- Regularnie zmieniaj dane uwierzytelniające w środowiskach innych niż deweloperskie.
- Zobacz `SECURITY.md` aby zapoznać się z pełną listą kontrolną (CORS, JWT, polityka haseł, ochrona danych).

### 9) Kluczowe pliki

- Inicjalizacja danych i trasy backendu: `app/main.py`, `app/api/v1/endpoints/auth.py`
- Usługa uwierzytelniania i JWT: `app/services/auth_service.py`
- Modele użytkowników/ról: `app/models/user.py`
- Stan uwierzytelniania/API frontendu: `frontend/lib/auth.ts`, `frontend/lib/api/auth.ts`
- Middleware frontendu (strażnicy): `frontend/middleware.ts`

Jeśli potrzebujesz instrukcji wdrożenia (Netlify/Vercel/Kontenery) lub konfiguracji CI/CD, daj nam znać, a dodamy odpowiedni przewodnik.

## Sondy Kondycji (Health Probes)

- `GET /api/healthz` — sonda żywotności (liveness probe). Szybka, zawsze zwraca 200, jeśli proces odpowiada. Użyj jej, aby sprawdzić, czy aplikacja działa.
- `GET /api/readyz` — sonda gotowości (readiness probe). Zwraca 200 tylko wtedy, gdy backend może połączyć się ze swoimi zależnościami (np. bazą danych). W przeciwnym razie zwraca 503.

Docker Compose (backend) używa sondy gotowości jako `healthcheck`, na przykład:

```yaml
services:
  backend:
    # ...
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8000/api/readyz || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 5```