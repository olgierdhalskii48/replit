#!/usr/bin/env bash
set -euo pipefail

# Simple PostgreSQL restore via Docker
# Usage:
#   ./docker-scripts/db-restore.sh <PATH_TO_BACKUP.sql.gz> [DB_NAME] [DB_USER]
# Env:
#   COMPOSE_CMD (default: docker compose)
#   SERVICE (postgres service name in compose, default: postgres)
# Notes:
#   - Target database must already exist.
#   - This will overwrite data in the target database.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <PATH_TO_BACKUP.sql.gz> [DB_NAME] [DB_USER]" >&2
  exit 1
fi

BACKUP_FILE="$1"
DB_NAME="${2:-legal_services}"
DB_USER="${3:-postgres}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"
SERVICE="${SERVICE:-postgres}"

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

CID=$(${COMPOSE_CMD} ps -q "${SERVICE}")
if [[ -z "${CID}" ]]; then
  echo "Error: Could not find running container for service '${SERVICE}'. Is the stack up?" >&2
  exit 1
fi

echo "Restoring '${BACKUP_FILE}' into DB='${DB_NAME}' as user='${DB_USER}' ..."
# We stream the decompressed SQL into psql inside the container
# shellcheck disable=SC2002
cat "${BACKUP_FILE}" | gunzip -c | docker exec -i "${CID}" psql -U "${DB_USER}" "${DB_NAME}"

echo "Restore completed."
