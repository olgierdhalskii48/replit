#!/usr/bin/env bash
set -euo pipefail

# Simple PostgreSQL backup via Docker
# Usage:
#   ./docker-scripts/db-backup.sh [DB_NAME] [DB_USER]
# Env:
#   BACKUP_DIR (default: $HOME/db_backups)
#   COMPOSE_CMD (default: docker compose)
#   SERVICE (postgres service name in compose, default: postgres)

DB_NAME="${1:-legal_services}"
DB_USER="${2:-postgres}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/db_backups}"
COMPOSE_CMD="${COMPOSE_CMD:-docker compose}"
SERVICE="${SERVICE:-postgres}"

mkdir -p "${BACKUP_DIR}"
TIMESTAMP=$(date +%F-%H%M%S)
OUT_FILE="${BACKUP_DIR}/backup-${DB_NAME}-${TIMESTAMP}.sql.gz"

# Resolve container id for the service
CID=$(${COMPOSE_CMD} ps -q "${SERVICE}")
if [[ -z "${CID}" ]]; then
  echo "Error: Could not find running container for service '${SERVICE}'. Is the stack up?" >&2
  exit 1
fi

# Perform backup
echo "Creating backup to ${OUT_FILE} ..."
docker exec -t "${CID}" pg_dump -U "${DB_USER}" "${DB_NAME}" | gzip > "${OUT_FILE}"

# Optional retention: keep last 14 backups for this DB
ls -1t "${BACKUP_DIR}"/backup-${DB_NAME}-*.sql.gz | tail -n +15 | xargs -r rm -f

echo "Backup created: ${OUT_FILE}"
