# Improvements Roadmap (Prioritized)

This document outlines prioritized recommendations to enhance quality, security, performance, and maintainability. Each item references relevant files or areas to help implementation.

## Priority: High

- **Authentication hardening**
  - Enforce password policy (min length, complexity, breach checks) in `app/api/v1/schemas/auth.py` and `app/services/auth_service.py`.
  - Add account lockout/backoff after repeated failures in `app/api/v1/endpoints/auth.py` (augment existing `rate_limiter`).
  - Optionally enable 2FA (TOTP/email) on top of SMS/email code flow.

- **Role enforcement and policy**
  - Centralize RBAC rules and reuse them across endpoints. Today we use dependencies like `require_admin()` in `app/api/v1/endpoints/auth.py`. Extract shared policies under `app/core/security.py`.
  - Add unit tests for role boundaries in `app/tests/test_rbac.py` and integration tests for admin/operator paths.

- **Database migrations and schema lifecycle**
  - Adopt and enforce Alembic migrations end-to-end (ensure all models in `app/models/` are covered). Provide `make migrate` scripts.
  - Add a migration policy in README: no auto-create tables in runtime.

- **CI/CD and quality gates**
  - Add GitHub Actions workflows for:
    - Python: black/ruff/mypy, pytest, bandit
    - Node: eslint, typecheck, jest
    - Build Docker images on tags
  - Enforce required checks on protected branches.

- **Secrets and configuration**
  - Move secrets to a dedicated secret store for non-dev (e.g., GitHub Environments, Vault). Ensure `.env.example` stays accurate.
  - Validate critical envs on startup with clear errors (JWT, DB URLs).

- **Comprehensive docs**
  - Keep `README.md` focused; add `DEPLOYMENT.md` and `OPERATIONS.md` with runbooks for staging/prod.

## Priority: Medium

- **Observability**
  - Structured logging (JSON) across backend, correlation IDs, request logging middleware.
  - Add OpenTelemetry tracing and basic metrics. Export to Prometheus + Grafana.

- **Testing**
  - Increase backend test coverage: services, endpoints, error cases.
  - Frontend: expand unit tests and add Playwright e2e smoke suite for critical flows (login, admin navigation, operator panel).

- **Error handling and DX**
  - Standardize API errors (problem+json). Add global exception handlers in FastAPI.
  - Frontend: error boundaries and toast normalization.

- **Performance**
  - Add DB indices for frequent queries (users by email/phone, cases by status). Review via query analysis.
  - Introduce caching for read-heavy endpoints if needed.

- **Security improvements**
  - CSRF protection for state-changing endpoints when used from browser contexts.
  - Integrate dependency scanners (Snyk, Dependabot) and schedule audits.

## Priority: Low

- **UX and Accessibility**
  - Audit with axe; improve keyboard navigation, focus management, color contrast.
  - Internationalization pass and content QA.

- **Data lifecycle**
  - Define retention and deletion policies for `cases`, `messages`, and `documents`.
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
