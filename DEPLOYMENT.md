# Deployment Guide

This guide describes how to deploy the Serwis Prawny platform to development, staging, and production using Docker Compose + Traefik and environment variables.

## Environments and Domains

- Staging: `STAGING_DOMAIN`, `STAGING_WWW_DOMAIN`, `STAGING_LETSENCRYPT_EMAIL`
- Production: `DOMAIN`, `WWW_DOMAIN`, `LETSENCRYPT_EMAIL`

Certificates are provisioned by Traefik’s built-in Let's Encrypt integration. DNS records should point to the host(s) running Traefik.

## Services Overview

- Backend (FastAPI): exposed internally at port 8000; routed externally via Traefik under `/api`
- Frontend (Next.js): exposed internally at port 5000; routed externally via Traefik
- Postgres: default DB for staging/production
- Redis: optional, used for rate limiting/caching
- Traefik: reverse proxy, TLS termination, security headers

## Health Probes

- Liveness: `GET /api/healthz` (200 when process is alive)
- Readiness: `GET /api/readyz` (200 when DB OK; 503 on failure)

## Configuration

Copy `.env.example` to `.env` and set the following at minimum:

  - JWT:
    - `JWT_SECRET_KEY` (strong random value)
    - `ACCESS_TOKEN_EXPIRE_MINUTES` (e.g., `60`)
- Fixed users:
  - `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`
  - `DEFAULT_OPERATOR_EMAIL`, `DEFAULT_OPERATOR_PASSWORD`
- Backend DB:
  - `DATABASE_URL` (e.g., `postgresql://user:pass@host:5432/dbname`)
  - `STRICT_ROLE_CHECK` (typically `true` outside dev)
  - `NEXT_PUBLIC_BACKEND_URL` (e.g., `https://your-domain/api`)

## Database Migrations (Alembic)

Alembic is configured in the repo with `alembic/` and `alembic.ini`.

- Create initial migration (autogenerate):

```bash
alembic revision --autogenerate -m "initial schema"
```

- Apply migrations:

```bash
alembic upgrade head
```

- Alternatively via Makefile:

```bash
make migrate MSG="initial schema"
make upgrade
```

Ensure the `DATABASE_URL` is set and reachable before applying migrations.

### Run Alembic via Docker Compose

If you are running the backend in Docker, you can execute Alembic commands inside the backend container. Examples:

```bash
# Staging
docker compose -f docker-compose.staging.yml exec backend alembic upgrade head

# Production
docker compose -f docker-compose.yml exec backend alembic upgrade head

# Create a new revision (ensure models are up-to-date in the image)
docker compose -f docker-compose.staging.yml exec backend alembic revision --autogenerate -m "add new table"
```

## Deploy with Docker Compose

- Staging:

```bash
docker compose -f docker-compose.staging.yml up -d --build
```

- Production:

```bash
docker compose -f docker-compose.yml up -d --build
```

Check backend health:

```bash
docker ps
# backend should report (healthy)
```

## Traefik TLS and Security Headers

Traefik is configured to:
- Redirect HTTP to HTTPS
- Issue certificates via Let's Encrypt (configure email)
- Enforce security headers (HSTS, CSP, X-Frame-Options, etc.)

Adjust CSP if you integrate third-party resources.

## Rollback

- To roll back to the previous image tag, re-deploy with the prior tag.
- For DB schema rollbacks:

```bash
alembic downgrade -1
```

Ensure that your application build is compatible with the downgraded schema before rolling back.

## User Management

Use the built-in CLI `manage.py` (loads `.env` automatically) for creating/updating users and resetting passwords.

```bash
# Create or update an admin user
python manage.py create-admin --email admin@example.com --password 'Strong#Pass123'

# Create or update an operator user
python manage.py create-operator --email operator@example.com --password 'Strong#Pass123'

# Reset password for an existing user
python manage.py reset-password --email admin@example.com --new-password 'New#Pass123'
```

In production, prefer this CLI over auto-seeding. Auto-seeding is gated by `SEED_DEFAULT_USERS` and is enabled by default only when `DEV_MODE=true`.
Recommended flow for production:

1. Set `SEED_DEFAULT_USERS=false` in `.env`.
2. Deploy the app.
3. Run the `manage.py` commands above to create admin/operator accounts as needed.
4. Keep `ALLOWED_ORIGINS` restricted to your domains and ensure `DATABASE_URL` points to production DB.
