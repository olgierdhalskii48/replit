# Docker Setup for Legal Services Platform

This document provides comprehensive instructions for running the Legal Services Platform using Docker containers.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## What changed (Traefik + HTTPS)

The stack now includes a Traefik reverse proxy that:

- Terminates HTTPS with free Let's Encrypt certificates automatically.
- Routes traffic to `frontend` and `backend` based on domain and path.
- Redirects all HTTP traffic (port 80) to HTTPS (port 443).

Make sure DNS `A` records for your domain(s) point to the server public IP before starting.

## Quick Start

### Production Environment

1. **Start the application:**
   ```bash
   chmod +x docker-scripts/*.sh
   ./docker-scripts/start-prod.sh
   ```

2. **Access the application:**
   - Frontend (HTTPS): https://<your-domain>
   - Backend API (HTTPS): https://<your-domain>/api
   - API Documentation (if exposed): https://<your-domain>/api/docs

### Development Environment

1. **Start development environment:**
   ```bash
   ./docker-scripts/start-dev.sh
   ```

2. **Access the application:**
   - Frontend: http://localhost:3001
   - Backend API: http://localhost:8001
   - Database: localhost:5433

## Manual Commands

### Build Containers
```bash
# Build all containers
./docker-scripts/build.sh

# Build specific container
docker build -f Dockerfile.backend -t legal-services-backend .
docker build -f frontend/Dockerfile -t legal-services-frontend ./frontend
```

### Start Services
```bash
# Production (with Traefik HTTPS)
docker compose up -d

# Development
docker-compose -f docker-compose.dev.yml up -d

# With rebuild
docker-compose up --build -d
```

### Stop Services
```bash
# Stop all services
./docker-scripts/stop.sh

# Or manually
docker-compose down
docker-compose -f docker-compose.dev.yml down
```

## Container Architecture

### Backend (FastAPI)
- **Port:** 8000 (internal; exposed via Traefik at /api)
- **Database:** PostgreSQL
- **Features:**
  - JWT Authentication
  - File Upload (PDF processing)
  - RESTful API
  - Auto-reload in development

### Frontend (Next.js)
- **Port:** 5000 (prod internal, HTTPS via Traefik) / 3001 (dev)
- **Features:**
  - Server-side rendering
  - Static optimization
  - Hot reload in development
  - Standalone output for optimization

### Database (PostgreSQL)
- **Port:** 5432 (prod bound to 127.0.0.1 only) / 5433 (dev)
- **Features:**
  - Data persistence
  - UUID extensions
  - Encrypted storage

## Environment Variables

Copy and modify environment files:
```bash
# Production
cp .env.example .env

# Development
# For dev you can also use `.env` if needed
```

Required variables for HTTPS routing and certificates:

```env
DOMAIN=serwisprawny2025.pl
WWW_DOMAIN=www.serwisprawny2025.pl
LETSENCRYPT_EMAIL=you@example.com
```

Ensure DNS for `DOMAIN` and optionally `WWW_DOMAIN` points to your server IP before starting, otherwise Let's Encrypt issuance will fail.

## Volume Management

### Data Persistence
- **Database:** `postgres_data` volume
- **Uploads:** `./uploads` directory mounted

### Development Volumes
- **Frontend:** Live code reload
- **Backend:** Live code reload
- **Node modules:** Optimized with named volumes

## Database Backups

### Manual Backup

```bash
# Ensure scripts are executable (one-time)
chmod +x docker-scripts/*.sh

# Create compressed SQL backup (defaults: DB=legal_services, USER=postgres)
./docker-scripts/db-backup.sh [DB_NAME] [DB_USER]

# Examples
./docker-scripts/db-backup.sh               # uses legal_services / postgres
./docker-scripts/db-backup.sh mydb app_user # custom DB and user
```

Backups are saved to `~/db_backups` by default. You can override with `BACKUP_DIR=/path`.

### Manual Restore

```bash
# Restore from a .sql.gz backup into an existing database
./docker-scripts/db-restore.sh <PATH_TO_BACKUP.sql.gz> [DB_NAME] [DB_USER]

# Example
./docker-scripts/db-restore.sh ~/db_backups/backup-legal_services-2025-09-24-010000.sql.gz
```

### Automated Nightly Backups (cron)

1. Create backups directory (if not exists):
   ```bash
   mkdir -p $HOME/db_backups
   ```

2. Edit user crontab:
   ```bash
   crontab -e
   ```

3. Add a daily backup at 02:30 (keeps last 14 backups by default):
   ```cron
   30 2 * * * BACKUP_DIR=$HOME/db_backups /bin/bash $HOME/serwisprawny/docker-scripts/db-backup.sh legal_services postgres >> $HOME/db_backups/cron.log 2>&1
   ```

Notes:
- Backups are performed via the running `postgres` container defined in `docker-compose.yml`.
- Ensure the stack is up when the cron runs.
- Adjust `REPO_DIR` path (`serwisprawny`) if different on your server.

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   ```bash
   # Check running services
   docker ps
   lsof -i :5000 -i :8000
   ```

2. **Database connection issues:**
   ```bash
   # Check database health
   docker-compose exec postgres pg_isready -U postgres
   ```

3. **Container build issues:**
   ```bash
   # Clean rebuild
   docker-compose down -v
   docker-compose build --no-cache
   ```

4. **TLS certificate issuance fails:**
   - Confirm `DOMAIN`/`WWW_DOMAIN` resolve to this server public IP (use `dig`/`nslookup`).
   - Ensure ports 80 and 443 are open in firewall and not used by other services.
   - Check Traefik logs: `docker compose logs -f traefik`.

### Logs and Debugging
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker compose logs -f traefik

# Execute commands in containers
docker-compose exec backend bash
docker-compose exec frontend sh
```

### Reset Everything
```bash
# WARNING: This removes all data
docker-compose down -v
docker system prune -a
```

## Production Deployment

For production deployment:

1. **Update environment variables** in `.env`
2. **Configure DNS and HTTPS** using Traefik (automatic Let's Encrypt)
3. **Set up monitoring** and logging
4. **Configure backups** for database
5. **Use Docker Swarm** or Kubernetes for orchestration

## Development Workflow

1. **Start development environment**
2. **Make changes** to code (live reload enabled)
3. **Run tests** inside containers
4. **Build and test production** images before deployment

This Docker setup provides a complete, production-ready containerization of your Legal Services Platform.