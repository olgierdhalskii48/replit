# Operations Guide

This guide provides operational runbooks for monitoring, troubleshooting, backups, and emergency procedures for the Serwis Prawny platform.

## Monitoring and Health

- Endpoints:
  - Liveness: `GET /api/healthz` — returns 200 if process is alive.
  - Readiness: `GET /api/readyz` — returns 200 if DB connectivity is OK; 503 otherwise.
- Docker healthchecks:
  - Backend services in Compose files use `/api/readyz` to report `healthy`.
- Logs:
  - Backend logs are structured JSON lines containing: `method`, `path`, `status`, `request_id`, `duration_ms`, and `client_ip`.
  - Request correlation: header `X-Request-Id` is propagated; include it in support requests.

## Routine Operations

- Start/Stop services:
  - Local dev:
    - Backend: `make backend-run`
    - Frontend: `cd frontend && npm run dev`
  - Compose:
    - Staging: `docker compose -f docker-compose.staging.yml up -d --build`
    - Prod: `docker compose -f docker-compose.yml up -d --build`
- Apply DB migrations:
  - `alembic upgrade head` (or `make upgrade`)
- Create migrations:
  - `alembic revision --autogenerate -m "<message>"` (or `make migrate MSG="<message>"`)

## Backups and Restoration (PostgreSQL)

- Backups:
  - Snapshot volume (recommended via hosting provider) or `pg_dump` cron job.
  - Example manual backup:
    ```bash
    PGPASSWORD=<password> pg_dump -h <host> -U <user> -F c -b -v -f backup.dump <dbname>
    ```
- Restore:
  ```bash
  PGPASSWORD=<password> pg_restore -h <host> -U <user> -d <dbname> -v backup.dump
  ```
- Verify:
  - Run readiness probe and a simple login to confirm app health.

## Secrets Management

- Never commit real secrets. Use environment variables provided out-of-band or secret managers.
- Rotate periodically:
  - `JWT_SECRET_KEY`
  - DB credentials
  - Any third-party API keys (SMS/Email/Payments)
- After rotation, restart services and verify `/api/readyz`.

## Incident Response

- High error rates or 5xx responses:
  - Check `/api/readyz` for DB issues.
  - Inspect logs for repeated exceptions (traceback) and long `duration_ms` outliers.
- Authentication incidents:
  - Verify `DEFAULT_ADMIN_*` and `DEFAULT_OPERATOR_*` in `.env`.
  - Restart backend to re-seed accounts; check login.
- Traffic spikes:
  - Scale replicas (if orchestrated) or add rate limiting at Traefik; consider caching for read-heavy endpoints.

## On-call Checklist

- [ ] Readiness probe returns 200.
- [ ] Admin login works; role-guarded pages secured.
- [ ] Error rates within baseline in logs; no recurring tracebacks.
- [ ] Database size and performance within thresholds.
- [ ] Backups completed successfully and tested periodically.

## Change Management

- Use PRs with CI gates (lint, typecheck, tests) enabled.
- Tag releases and record changes (Changelog optional).
- Run migrations before switching traffic to new versions.
