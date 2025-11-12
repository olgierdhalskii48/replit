# Contributing Guide

Thank you for your interest in contributing to Serwis Prawny 21-9-2025! This guide explains how to set up your environment, coding standards, branch strategy, and how to run checks locally.

## Development Setup

- Backend
  - Python 3.11+
  - Create venv and install deps:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: .\venv\Scripts\activate
    pip install -r requirements.txt
    ```
  - Run:
    ```bash
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
- Frontend
  - Node.js 18+
  - Install and run:
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

## Environment

- Copy `.env.example` to `.env` and adjust as needed.
- Key backend variables (see `app/core/config.py`):
  - `JWT_SECRET_KEY` (required in non-dev)
  - `ACCESS_TOKEN_EXPIRE_MINUTES`
  - `DATABASE_URL` (defaults to SQLite if unset)
  - `SEED_DEFAULT_USERS`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `DEFAULT_OPERATOR_EMAIL`, `DEFAULT_OPERATOR_PASSWORD`
  - `ALLOWED_ORIGINS`, `ALLOWED_HOSTS`, `DOMAIN`, `WWW_DOMAIN`

## Branch Strategy

- Default branch: `main`
- Use feature branches: `feature/<short-desc>`
- Bugfix branches: `fix/<short-desc>`
- Release branches: `release/<version>`

## Commit Style

- Conventional commits recommended:
  - `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`, `refactor: ...`, `test: ...`

## Code Style & Linting

- Backend:
  - Ruff/Black/Mypy (where configured)
  - Run tests:
    ```bash
    pytest -q
    ```
- Frontend:
  - ESLint / TS type-check / Jest/Playwright (where configured)
  - Commands:
    ```bash
    cd frontend
    npm run lint
    npm run test
    ```

## API Documentation

- Swagger UI: `http://localhost:8000/api/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`
- High-level reference: `API_REFERENCE.md`

## Pull Requests

- Ensure tests pass locally.
- Update docs if you change public endpoints or env vars.
- Add screenshots/gifs for UI changes where helpful.
- Link related issues in the PR description.

## Security

- Do not commit real secrets. Use `.env` locally and secret stores in CI.
- See `SECURITY.md` for policies (CORS, JWT, password policy, data protection).
