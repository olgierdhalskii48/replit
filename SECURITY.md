# Security Standards and Checklist

This document outlines baseline security practices adopted by the project and provides a checklist to evaluate deployments. It references specific modules/paths to aid verification.

## Baseline Standards

- OWASP ASVS v4.0 (L1–L2 coverage where applicable)
- OWASP Top 10 & API Security Top 10 considerations
- Twelve-Factor App configuration (env-driven)
- Principle of Least Privilege for roles and services

## Authentication and Authorization

- JWT-based auth implemented in `app/services/auth_service.py` using `HS256` with `JWT_SECRET_KEY`.
- Token creation/verification: `AuthService.create_access_token()`, `AuthService.verify_token()`.
- Role model in `app/models/user.py` via `UserRole` enum (`client`, `operator`, `admin`).
- Backend guards:
  - `require_admin()` and `require_operator_or_admin()` in `app/api/v1/endpoints/auth.py`.
- Frontend middleware guard in `frontend/middleware.ts`, optional strict role check via `STRICT_ROLE_CHECK`.

Recommendations:
- Use a strong `JWT_SECRET_KEY` per environment.
- Rotate secrets regularly and store in secret manager for non-dev.
- Consider short-lived access tokens and refresh-token pattern.

## Password Security

- Hashing with `passlib` (bcrypt) in `AuthService.get_password_hash()`.
- Verification with `AuthService.verify_password()`.

Recommendations:
- Enforce password policy at `app/api/v1/schemas/auth.py` (length, complexity, deny common/breached passwords).
- Rate-limit logins (already present via `rate_limiter` dependency) and consider exponential backoff/lockout.
- Optional 2FA (TOTP/email) for high-privilege accounts.

## Account Lifecycle & Seeding

- Default admin/operator seeding at startup in `app/main.py` (`seed_default_users()`):
  - Enforces role, `is_active`, `is_verified`, and resets password to `.env` values.

Recommendations:
- Restrict seeding to dev and controlled environments; protect env vars in prod.
- Log seeding actions (already done) without printing secrets.

## Transport & CORS

- CORS is configured in `app/main.py` using `CORSMiddleware`.
- HSTS and CSP headers applied by `SecurityHeadersMiddleware` when not in `DEV_MODE`.

Recommendations:
- Keep strict origins in production; avoid wildcard in prod.
- Adjust CSP if integrating third-party resources.

## Data Protection

- SQLAlchemy ORM in `app/models/`.
- Database URL from `DATABASE_URL` (Postgres recommended). SQLite used for quick dev only.

Recommendations:
- Apply migrations with Alembic for schema consistency.
- Backup/restore and encryption-at-rest (DB-level) per environment.
- Define and implement data retention policies (see `IMPROVEMENTS.md`).

## Secure Coding Practices

- Centralized error handling and input validation via Pydantic schemas (e.g., `app/api/v1/schemas/*.py`).

Recommendations:
- Add global exception handlers to return standardized error responses.
- Add dependency scanning (Dependabot, Snyk) and static analysis (bandit, mypy, ruff, eslint).

## Operational Security

Recommendations:
- Use CI/CD with protected branches and required checks.
- Enforce least-privilege tokens and per-environment secrets.
- Audit logs for authentication/authorization events.

## Checklist

- [ ] `.env` provided for the target environment; secrets are not committed.
- [ ] `JWT_SECRET_KEY` is strong and unique per environment.
- [ ] Admin/operator defaults are set intentionally or disabled in production.
- [ ] HTTPS enforced at the edge; HSTS enabled in production.
- [ ] CORS restricted to known domains in production.
- [ ] Database is protected with strong credentials; network access restricted.
- [ ] Migrations applied successfully; no runtime table creation.
- [ ] Tests (unit/integration) passing in CI.
- [ ] Linting/static analysis configured and enforced.
- [ ] Backups and retention policies documented and implemented.

---

## Security Hardening Appendix

This appendix consolidates concrete hardening steps and where they are implemented in the codebase.

### Backend Runtime Protections

- **Global exception handling (problem+json)**
  - File: `app/main.py`
  - Handlers: `http_exception_handler()` and `unhandled_exception_handler()` return standardized JSON with `type/title/status/detail/instance`.

- **CORS and Trusted Hosts**
  - File: `app/main.py`
  - Env: `ALLOWED_ORIGINS` (CSV), `DEV_MODE` (loosens in dev), `ALLOWED_HOSTS`.
  - Middleware: `CORSMiddleware`, `TrustedHostMiddleware` (enabled when `DEV_MODE=false`).

- **Security Headers (HSTS, CSP, COOP, X-Frame-Options)**
  - File: `app/main.py` → `SecurityHeadersMiddleware`.
  - HSTS only active outside dev (`DEV_MODE=false`). CSP is conservative; adjust if integrating 3rd parties.

- **Request ID + Structured JSON Logging**
  - File: `app/main.py` → `RequestIdLoggingMiddleware`.
  - Adds `X-Request-Id` and logs JSON with `method, path, status, duration_ms, client_ip`.

- **Request size limiting**
  - File: `app/main.py` → `RequestSizeLimitMiddleware`.
  - Env: `UPLOAD_MAX_MB` (default 50MB).

- **Health Probes**
  - Liveness: `GET /api/healthz` (always 200)
  - Readiness: `GET /api/readyz` (503 on DB failure)
  - Compose healthchecks configured in: `docker-compose*.yml`.

### AuthN/AuthZ Controls

- **Centralized RBAC & user dependencies**
  - File: `app/core/security.py`
  - Functions: `get_current_user`, `get_verified_user`, `require_admin`, `require_operator_or_admin`.

- **Strong password policy**
  - File: `app/api/v1/schemas/auth.py`
  - Helper: `validate_password_strength()` enforces ≥12 chars + lower/upper/digit/special.
  - Enforced in change-password endpoint: `app/api/v1/endpoints/auth.py`.

- **Seed and user management**
  - Env: `SEED_DEFAULT_USERS` gates auto-seeding (defaults true only in dev). Use CLI in prod.
  - CLI: `manage.py` (Typer) → `create-admin`, `create-operator`, `reset-password` (loads `.env`).

### Supply Chain and CI

- **Dependency scanning & updates**
  - Dependabot: `.github/dependabot.yml` (GitHub Actions, pip, npm).
  - Security scan: Bandit step in `.github/workflows/backend-ci.yml`.

- **Static analysis & tests**
  - Python: ruff, black, mypy, pytest in Backend CI.
  - Frontend: typecheck, lint, build, Playwright E2E.

### Configuration & Secrets

- **Environment loading**
  - File: `app/main.py` loads `.env` via `python-dotenv`.
  - Ensure `.env` not committed with real secrets.

- **Critical envs**
  - `JWT_SECRET_KEY` (unique per env)
  - `DATABASE_URL` with strong credentials
  - `ALLOWED_ORIGINS` restricted in prod
  - `DEV_MODE=false` in prod; `SEED_DEFAULT_USERS=false` after initial setup

### Operational

- **Backups & restores**
  - See `OPERATIONS.md` for `pg_dump/pg_restore` examples and runbooks.

- **Monitoring**
  - Use readiness probe and logs (`X-Request-Id`) for health and traceability.

- **Archival jobs**
  - Implement archival jobs (e.g., Celery/Beat or simple cron) for old artifacts.

- **Feature backlog**
  - SSO options (Azure AD/Google Workspace) for operators/admins.
  - Pluggable SMS/email providers with health checks.

## File and Module References

- Backend startup and seeding: `app/main.py`
- Auth endpoints and guards: `app/api/v1/endpoints/auth.py`
- Admin endpoints: `app/api/v1/endpoints/admin.py`
- Operator endpoints: `app/api/v1/endpoints/operator.py`
- Models: `app/models/*.py`
- Auth service (hashing/JWT): `app/services/auth_service.py`
- Frontend auth API and store: `frontend/lib/api/auth.ts`, `frontend/lib/auth.ts`
- Frontend route guards: `frontend/middleware.ts`

## Standards and References

- OWASP ASVS v4.0 (levels 1–2) for web app security
- OWASP Top 10, API Security Top 10
- Conventional Commits, Semantic Versioning
- Twelve-Factor App for config and disposability
