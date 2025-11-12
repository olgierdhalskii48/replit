# API Reference (High-Level)

This is a concise reference to major API areas. For full, interactive docs use Swagger UI or OpenAPI JSON.

- Swagger UI: `http://localhost:8000/api/docs`
- OpenAPI JSON: `http://localhost:8000/api/v1/openapi.json`

## Auth

- `POST /api/v1/token` — obtain access token (password flow)
- `POST /api/v1/auth/login` — login (if implemented)
- `POST /api/v1/auth/register` — register (if implemented)
- `GET  /api/v1/users/me` — current user profile

## Cases

- `POST /api/v1/cases` — create case; multipart form with optional files
- `GET  /api/v1/cases` — list current user’s cases
- `GET  /api/v1/cases/{case_id}` — get case
- `PUT  /api/v1/cases/{case_id}` — update case
- `DELETE /api/v1/cases/{case_id}` — delete case
- Files:
  - `GET    /api/v1/cases/{case_id}/documents/{document_id}/download`
  - `GET    /api/v1/cases/{case_id}/documents/{document_id}/preview`
  - `DELETE /api/v1/cases/{case_id}/documents/{document_id}`
  - `PATCH  /api/v1/cases/{case_id}/documents/{document_id}` (rename metadata)

## Operator

- `GET  /api/v1/operator/cases` — operator/admin dashboard list
- `GET  /api/v1/operator/cases/{case_id}` — operator case detail
- `POST /api/v1/operator/cases/{case_id}/assign` — assign to current operator
- `PUT  /api/v1/operator/cases/{case_id}/status` — update status
- `POST /api/v1/operator/cases/{case_id}/analysis` — create analysis
- `POST /api/v1/operator/cases/{case_id}/legal-documents` — add draft legal document
- `POST /api/v1/operator/cases/{case_id}/messages` — notify client/admin
- `GET  /api/v1/operator/stats` — counts per day (cases, analyses, templates, payments, revenue)
- AI helpers:
  - `POST /api/v1/operator/cases/{case_id}/analyze-ai` — auto-generate analysis
  - `GET  /api/v1/operator/cases/{case_id}/documents-summary` — summary of docs

## Health

- `GET /api/healthz` — liveness
- `GET /api/readyz` — readiness
- `GET /api/health` — simple health

## Notes

- Most endpoints require a valid JWT in Authorization header (Bearer) or cookie, and role-based permissions (client/operator/admin).
- See `app/main.py` for router mounts and `app/api/v1/endpoints/` for exact behavior.
