

Pełnozakresowa (full-stack) platforma usług prawnych umożliwiająca cyfrowe procesy prawne: generowanie dokumentów, obsługę spraw, analizę wspomaganą przez AI, bezpieczną współpracę między klientem a operatorem oraz płatności. Zbudowana w architekturze monorepo z frontendem w Next.js, backendem w FastAPI i generowanymi zestawami SDK.

- **Repozytorium**: `rrsartneoai/serwis_prawny21-9-2025`
- **Frontend**: Next.js + React + Tailwind + shadcn/ui (`frontend/`)
- **Backend**: FastAPI + SQLAlchemy + Pydantic + JWT (`app/`)
- **Baza danych**: SQLite (deweloperska) lub PostgreSQL (zalecana)
- **Integracje**: Supabase, Stripe, dostawcy AI (np. OpenAI)
- **Docker**: `docker-compose.*.yml` do uruchamiania wielu usług

## Kluczowe Funkcjonalności

- **Zarządzanie sprawami**: tworzenie, aktualizacja, listowanie, usuwanie spraw (`app/api/v1/endpoints/cases.py`)
- **Przesyłanie plików**: PDF, DOC/DOCX, obrazy z walidacją oraz limitami rozmiaru i typu
- **Portal operatora**: przydzielanie spraw, analiza AI, wersje robocze dokumentów, aktualizacje statusu (`app/api/v1/endpoints/operator.py`)
- **Powiadomienia**: powiadomienia w aplikacji o zdarzeniach (gotowa analiza/dokumenty)
- **Uwierzytelnianie i bezpieczeństwo**: JWT, dostęp oparty na rolach (admin/operator/klient), proces weryfikacji (`app/services/auth_service.py`)
- **Endpointy sprawdzające stan (Health endpoints)**: sondy żywotności (liveness) i gotowości (readiness) dla celów operacyjnych
- **Gotowość do CI**: linting, testy, skany bezpieczeństwa (zgodnie z `README.md`)

## Stos Technologiczny

- Backend: FastAPI, SQLAlchemy ORM, Pydantic, `python-jose`, Passlib
- Frontend: Next.js, React, Tailwind CSS, shadcn/ui
- Baza danych: SQLite / PostgreSQL
- Narzędzia: Pytest, Ruff/Black/Mypy, Jest/Playwright (tam, gdzie dostępne)
- Konteneryzacja: Docker, Docker Compose

## Struktura Repozytorium

```text
serwis_prawny21-9-2025/
├── app/                      # Backend FastAPI
│   ├── main.py               # Punkt wejściowy aplikacji, hooki startowe (seeding)
│   ├── api/v1/endpoints/     # Endpointy REST (np. sprawy, operator)
│   ├── core/                 # Konfiguracja, bezpieczeństwo, JWT (`config.py`)
│   ├── db/                   # Sesja bazy danych i Base
│   ├── models/               # Modele SQLAlchemy (użytkownik, sprawa, itp.)
│   └── tests/                # Konfiguracja Pytest i fixtures (`conftest.py`)
├── frontend/                 # Aplikacja Next.js
├── sdk/                      # Wygenerowane klienckie SDK (python/js)
├── requirements.txt          # Zależności backendu
├── pyproject.toml            # Metadane projektu
├── docker-compose*.yml       # Konfiguracje Compose
└── Dockerfile.backend        # Dockerfile backendu
```

## Najważniejsze Elementy Backendu

- **Ustawienia**: scentralizowane za pomocą `pydantic-settings` (`app/core/config.py`)
  - Ważne zmienne: `JWT_SECRET_KEY`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`, `SEED_DEFAULT_USERS`, domyślne dane logowania admina/operatora, CORS/hosty.
- **Usługa uwierzytelniania** (`app/services/auth_service.py`):
  - Haszowanie/weryfikacja haseł, tworzenie/weryfikacja JWT, kody weryfikacyjne, szkielet Google OAuth, zaślepki weryfikacji e-mail/SMS.
- **API Spraw** (`app/api/v1/endpoints/cases.py`):
  - POST `/api/v1/cases` – tworzenie sprawy z przesyłaniem plików (sprawdzanie typu/rozmiaru, 10MB/plik, 5 plików)
  - GET `/api/v1/cases` – listowanie spraw bieżącego użytkownika (wymaga zweryfikowanego użytkownika)
  - GET/PUT/DELETE `/api/v1/cases/{id}` – pobieranie/aktualizacja/usuwanie sprawy
  - Pliki: operacje pobierania/podglądu/zmiany nazwy/usuwania
- **API Operatora** (`app/api/v1/endpoints/operator.py`):
  - GET `/api/v1/operator/cases` – widok dla operatora/admina z informacjami o kliencie i powiązanymi danymi
  - POST `/cases/{id}/analysis` – tworzenie analizy, wysyłanie powiadomienia, aktualizacja statusu
  - POST `/cases/{id}/legal-documents` – dodawanie wersji roboczej dokumentu prawnego, powiadamianie klienta
  - PUT `/cases/{id}/status`, POST `/cases/{id}/assign`
  - Wysyłanie wiadomości do klienta/admina, statystyki dla pulpitu, wyzwalanie analizy AI, podsumowanie dokumentów

## Sondy Kondycji (Health Probes)

- GET `/api/healthz` – żywotność (liveness)
- GET `/api/readyz` – gotowość (readiness) (osiągalność bazy danych), używane w healthcheckach Dockera

## Konfiguracja

- Wymagania wstępne: Node 18+, Python 3.11+, PostgreSQL 14+ (opcjonalnie), Docker (opcjonalnie)
- Środowisko:
  - Skopiuj `.env.example` do `.env` (w głównym katalogu repozytorium)
  - Ustaw `JWT_SECRET_KEY`, czas życia tokena, domyślnych użytkowników i `DATABASE_URL` (np. `postgresql://...` lub zachowaj SQLite)

## Uruchomienie Lokalne

- Backend (FastAPI):
  ```bash
  python -m venv venv
  source venv/bin/activate  # Windows: .\venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
  ```
  - Główny adres API: http://localhost:8000/
  - Swagger: http://localhost:8000/api/docs
- Frontend (Next.js):
  ```bash
  cd frontend
  npm install
  npm run dev
  ```  - Serwer deweloperski: http://localhost:5000

## Docker (Opcjonalnie)

- Dewelopersko:
  ```bash
  docker compose -f docker-compose.dev.yml up --build
  ```
- Usługa backendu używa `/api/readyz` jako healthcheck.

## Testowanie

- Backend (pytest):
  ```bash
  pytest -q
  ```
  - `app/tests/conftest.py` konfiguruje bazę danych SQLite w pamięci i nadpisuje zależności
- Frontend:
  ```bash
  cd frontend
  npm run test
  ```

## Bezpieczeństwo

- Uwierzytelnianie oparte na JWT, sprawdzanie ról w middleware i zabezpieczeniach backendu
- Szkielety procesów weryfikacji (e-mail/SMS) w usługach
- Nie umieszczaj w repozytorium prawdziwych kluczy i haseł; zmieniaj dane uwierzytelniające w środowiskach innych niż deweloperskie
- CORS/hosty konfigurowalne w `Settings` (`app/core/config.py`)

## Przykłady Użycia API

- Tworzenie sprawy (formularz multipart, wymagane uwierzytelnienie):
  - `POST /api/v1/cases`
  - Pola: `title` (wymagane), `description`, `client_notes`, `client_context`, `metadata` (JSON/tekst), `package_type` (`basic|standard|premium|express`), `package_price`, `files[]`
- Akcje operatora (wymagany token operatora lub admina):
  - `POST /api/v1/operator/cases/{id}/analysis`
  - `POST /api/v1/operator/cases/{id}/legal-documents`
  - `PUT  /api/v1/operator/cases/{id}/status`
  - `POST /api/v1/operator/cases/{id}/assign`
  - `GET  /api/v1/operator/cases` z opcjonalnymi filtrami

## Plan Rozwoju (sugerowany)

- Pełna integracja płatności (Stripe) i webhooków
- Integracja z rzeczywistymi dostawcami e-mail/SMS
- Zaawansowany edytor/szablony dla dokumentów prawnych
- Zaawansowane logi audytowe i narzędzia RODO
- Rozbudowane SDK i przykładowe aplikacje