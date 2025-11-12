Jasne, oto pełne tłumaczenie na język polski, z zachowaniem oryginalnych nazw technicznych, ścieżek i zmiennych.

---

# Standardy Bezpieczeństwa i Lista Kontrolna

Ten dokument opisuje podstawowe praktyki bezpieczeństwa przyjęte w projekcie i dostarcza listę kontrolną do oceny wdrożeń. Odwołuje się do konkretnych modułów/ścieżek, aby ułatwić weryfikację.

## Podstawowe Standardy

- OWASP ASVS v4.0 (pokrycie L1–L2 tam, gdzie ma to zastosowanie)
- Uwzględnienie OWASP Top 10 i API Security Top 10
- Konfiguracja zgodna z metodyką Dwunastu Czynników (sterowana zmiennymi środowiskowymi)
- Zasada Minimalnych Uprawnień dla ról i usług

## Uwierzytelnianie i Autoryzacja

- Uwierzytelnianie oparte na JWT zaimplementowane w `app/services/auth_service.py` przy użyciu `HS256` z `JWT_SECRET_KEY`.
- Tworzenie/weryfikacja tokenu: `AuthService.create_access_token()`, `AuthService.verify_token()`.
- Model ról w `app/models/user.py` za pomocą enum `UserRole` (`client`, `operator`, `admin`).
- Zabezpieczenia backendu (guards):
  - `require_admin()` i `require_operator_or_admin()` w `app/api/v1/endpoints/auth.py`.
- Zabezpieczenie middleware frontendu w `frontend/middleware.ts`, opcjonalne rygorystyczne sprawdzanie ról za pomocą `STRICT_ROLE_CHECK`.

Rekomendacje:
- Używaj silnego `JWT_SECRET_KEY` dla każdego środowiska.
- Regularnie rotuj klucze i przechowuj je w menedżerze sekretów dla środowisk innych niż deweloperskie.
- Rozważ użycie krótkożyciowych tokenów dostępu i wzorca z tokenem odświeżającym (refresh-token).

## Bezpieczeństwo Haseł

- Haszowanie za pomocą `passlib` (bcrypt) w `AuthService.get_password_hash()`.
- Weryfikacja za pomocą `AuthService.verify_password()`.

Rekomendacje:
- Wymuszaj politykę haseł w `app/api/v1/schemas/auth.py` (długość, złożoność, odrzucanie popularnych/naruszonych haseł).
- Ograniczaj liczbę prób logowania (już obecne dzięki zależności `rate_limiter`) i rozważ wykładnicze opóźnienie/blokadę konta.
- Opcjonalne 2FA (TOTP/e-mail) dla kont o wysokich uprawnieniach.

## Cykl Życia Konta i Inicjalizacja Danych (Seeding)

- Domyślna inicjalizacja kont admina/operatora przy starcie w `app/main.py` (`seed_default_users()`):
  - Wymusza rolę, `is_active`, `is_verified` i resetuje hasło do wartości z `.env`.

Rekomendacje:
- Ogranicz inicjalizację danych do środowisk deweloperskich i kontrolowanych; chroń zmienne środowiskowe w środowisku produkcyjnym.
- Loguj akcje inicjalizacji (już zaimplementowane) bez wypisywania sekretów.

## Transport i CORS

- CORS jest skonfigurowany w `app/main.py` przy użyciu `CORSMiddleware`.
- Nagłówki HSTS i CSP są stosowane przez `SecurityHeadersMiddleware`, gdy nie jest w trybie `DEV_MODE`.

Rekomendacje:
- Utrzymuj ścisłe definicje źródeł (origins) w środowisku produkcyjnym; unikaj symbolu wieloznacznego (`wildcard`) w produkcji.
- Dostosuj CSP, jeśli integrujesz zasoby stron trzecich.

## Ochrona Danych

- SQLAlchemy ORM w `app/models/`.
- Adres URL bazy danych z `DATABASE_URL` (zalecany Postgres). SQLite używane tylko do szybkiego rozwoju.

Rekomendacje:
- Stosuj migracje za pomocą Alembic dla spójności schematu.
- Twórz kopie zapasowe/przywracaj i stosuj szyfrowanie w spoczynku (na poziomie bazy danych) dla każdego środowiska.
- Zdefiniuj i wdróż polityki retencji danych (zobacz `IMPROVEMENTS.md`).

## Bezpieczne Praktyki Programistyczne

- Scentralizowana obsługa błędów i walidacja danych wejściowych za pomocą schematów Pydantic (np. `app/api/v1/schemas/*.py`).

Rekomendacje:
- Dodaj globalne procedury obsługi wyjątków, aby zwracać ustandaryzowane odpowiedzi o błędach.
- Dodaj skanowanie zależności (Dependabot, Snyk) i analizę statyczną (bandit, mypy, ruff, eslint).

## Bezpieczeństwo Operacyjne

Rekomendacje:
- Używaj CI/CD z chronionymi gałęziami i wymaganymi testami.
- Wymuszaj tokeny o minimalnych uprawnieniach i sekrety specyficzne dla danego środowiska.
- Prowadź logi audytowe dla zdarzeń uwierzytelniania/autoryzacji.

## Lista Kontrolna

- [ ] Plik `.env` jest dostarczony dla docelowego środowiska; sekrety nie są umieszczane w repozytorium.
- [ ] `JWT_SECRET_KEY` jest silny i unikalny dla każdego środowiska.
- [ ] Domyślne dane logowania admina/operatora są ustawione celowo lub wyłączone w środowisku produkcyjnym.
- [ ] HTTPS jest wymuszany na brzegu sieci (edge); HSTS jest włączone w produkcji.
- [ ] CORS jest ograniczony do znanych domen w środowisku produkcyjnym.
- [ ] Baza danych jest chroniona silnymi danymi uwierzytelniającymi; dostęp sieciowy jest ograniczony.
- [ ] Migracje zostały pomyślnie zastosowane; nie ma tworzenia tabel w czasie działania aplikacji.
- [ ] Testy (jednostkowe/integracyjne) przechodzą pomyślnie w CI.
- [ ] Linting/analiza statyczna jest skonfigurowana i wymuszana.
- [ ] Kopie zapasowe i polityki retencji są udokumentowane i wdrożone.

---

## Dodatek: Wzmacnianie Bezpieczeństwa (Security Hardening)

Ten dodatek konsoliduje konkretne kroki wzmacniające bezpieczeństwo oraz miejsca ich implementacji w kodzie.

### Zabezpieczenia Czasu Działania Backendu

- **Globalna obsługa wyjątków (problem+json)**
  - Plik: `app/main.py`
  - Procedury obsługi: `http_exception_handler()` i `unhandled_exception_handler()` zwracają ustandaryzowany JSON z polami `type/title/status/detail/instance`.

- **CORS i Zaufane Hosty**
  - Plik: `app/main.py`
  - Zmienne środowiskowe: `ALLOWED_ORIGINS` (CSV), `DEV_MODE` (rozluźnia w trybie deweloperskim), `ALLOWED_HOSTS`.
  - Middleware: `CORSMiddleware`, `TrustedHostMiddleware` (włączone, gdy `DEV_MODE=false`).

- **Nagłówki Bezpieczeństwa (HSTS, CSP, COOP, X-Frame-Options)**
  - Plik: `app/main.py` → `SecurityHeadersMiddleware`.
  - HSTS aktywne tylko poza trybem deweloperskim (`DEV_MODE=false`). CSP jest konserwatywne; dostosuj, jeśli integrujesz strony trzecie.

- **ID Żądania + Strukturalne Logowanie JSON**
  - Plik: `app/main.py` → `RequestIdLoggingMiddleware`.
  - Dodaje `X-Request-Id` i loguje JSON z polami `method, path, status, duration_ms, client_ip`.

- **Ograniczenie Rozmiaru Żądania**
  - Plik: `app/main.py` → `RequestSizeLimitMiddleware`.
  - Zmienna środowiskowa: `UPLOAD_MAX_MB` (domyślnie 50MB).

- **Sondy Kondycji (Health Probes)**
  - Żywotność (Liveness): `GET /api/healthz` (zawsze 200)
  - Gotowość (Readiness): `GET /api/readyz` (503 w przypadku awarii bazy danych)
  - Healthchecki dla Compose skonfigurowane w: `docker-compose*.yml`.

### Kontrole Uwierzytelniania i Autoryzacji (AuthN/AuthZ)

- **Scentralizowane RBAC i zależności użytkownika**
  - Plik: `app/core/security.py`
  - Funkcje: `get_current_user`, `get_verified_user`, `require_admin`, `require_operator_or_admin`.

- **Silna polityka haseł**
  - Plik: `app/api/v1/schemas/auth.py`
  - Funkcja pomocnicza: `validate_password_strength()` wymusza ≥12 znaków + małą/wielką literę/cyfrę/znak specjalny.
  - Wymuszane w endpoincie zmiany hasła: `app/api/v1/endpoints/auth.py`.

- **Inicjalizacja i zarządzanie użytkownikami**
  - Zmienna środowiskowa: `SEED_DEFAULT_USERS` kontroluje automatyczną inicjalizację (domyślnie true tylko w trybie deweloperskim). Używaj CLI w produkcji.
  - CLI: `manage.py` (Typer) → `create-admin`, `create-operator`, `reset-password` (wczytuje `.env`).

### Łańcuch Dostaw i CI

- **Skanowanie i aktualizacje zależności**
  - Dependabot: `.github/dependabot.yml` (GitHub Actions, pip, npm).
  - Skan bezpieczeństwa: Krok z Bandit w `.github/workflows/backend-ci.yml`.

- **Analiza statyczna i testy**
  - Python: ruff, black, mypy, pytest w Backend CI.
  - Frontend: typecheck, lint, build, Playwright E2E.

### Konfiguracja i Sekrety

- **Ładowanie środowiska**
  - Plik: `app/main.py` wczytuje `.env` za pomocą `python-dotenv`.
  - Upewnij się, że plik `.env` nie jest umieszczany w repozytorium z prawdziwymi sekretami.

- **Krytyczne zmienne środowiskowe**
  - `JWT_SECRET_KEY` (unikalny dla każdego środowiska)
  - `DATABASE_URL` z silnymi danymi uwierzytelniającymi
  - `ALLOWED_ORIGINS` ograniczone w produkcji
  - `DEV_MODE=false` w produkcji; `SEED_DEFAULT_USERS=false` po początkowej konfiguracji

### Operacyjne

- **Kopie zapasowe i przywracanie**
  - Zobacz `OPERATIONS.md` dla przykładów `pg_dump/pg_restore` i instrukcji (runbooks).

- **Monitoring**
  - Używaj sondy gotowości (readiness probe) i logów (`X-Request-Id`) do monitorowania stanu i śledzenia.

- **Zadania archiwizacyjne**
  - Zaimplementuj zadania archiwizacyjne (np. Celery/Beat lub prosty cron) dla starych artefaktów.

- **Zaległości w funkcjach (Feature backlog)**
  - Opcje SSO (Azure AD/Google Workspace) dla operatorów/administratorów.
  - Podłączani dostawcy SMS/e-mail z mechanizmami sprawdzania stanu.

## Odniesienia do Plików i Modułów

- Uruchomienie i inicjalizacja backendu: `app/main.py`
- Endpointy i zabezpieczenia uwierzytelniania: `app/api/v1/endpoints/auth.py`
- Endpointy administratora: `app/api/v1/endpoints/admin.py`
- Endpointy operatora: `app/api/v1/endpoints/operator.py`
- Modele: `app/models/*.py`
- Usługa uwierzytelniania (haszowanie/JWT): `app/services/auth_service.py`
- API i magazyn uwierzytelniania frontendu: `frontend/lib/api/auth.ts`, `frontend/lib/auth.ts`
- Zabezpieczenia tras frontendu: `frontend/middleware.ts`

## Standardy i Odniesienia

- OWASP ASVS v4.0 (poziomy 1–2) dla bezpieczeństwa aplikacji webowych
- OWASP Top 10, API Security Top 10
- Conventional Commits, Semantic Versioning
- Metodyka Dwunastu Czynników (Twelve-Factor App) dla konfiguracji i jednorazowości