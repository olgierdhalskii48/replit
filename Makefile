# Makefile for common dev tasks

.PHONY: help backend-run backend-test backend-lint backend-type frontend-dev frontend-build frontend-lint e2e migrate upgrade downgrade create-admin create-operator reset-password

help:
	@echo "Available targets:"
	@echo "  backend-run      - Run FastAPI backend (uvicorn)"
	@echo "  backend-test     - Run backend tests (pytest)"
	@echo "  backend-lint     - Run ruff and black --check"
	@echo "  backend-type     - Run mypy type checks"
	@echo "  migrate          - Create new Alembic migration (env var MSG='message')"
	@echo "  upgrade          - Apply migrations (alembic upgrade head)"
	@echo "  downgrade        - Downgrade one revision (alembic downgrade -1)"
	@echo "  frontend-dev     - Run Next.js dev server"
	@echo "  frontend-build   - Build frontend"
	@echo "  frontend-lint    - Lint frontend"
	@echo "  e2e              - Run Playwright E2E tests"
	@echo "  create-admin     - Create or update admin (EMAIL, PASSWORD)"
	@echo "  create-operator  - Create or update operator (EMAIL, PASSWORD)"
	@echo "  reset-password   - Reset password for user (EMAIL, NEW_PASSWORD)"

backend-run:
	uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

backend-test:
	pytest -q

backend-lint:
	ruff check .
	black --check .

backend-type:
	mypy .

migrate:
	@if [ -z "$(MSG)" ]; then echo "Usage: make migrate MSG=\"your message\""; exit 1; fi
	alembic revision -m "$(MSG)"

upgrade:
	alembic upgrade head

downgrade:
	alembic downgrade -1

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-lint:
	cd frontend && npm run lint

e2e:
	cd frontend && npx playwright install --with-deps && npm run build && nohup npm start >/dev/null 2>&1 & \
	bash -c 'for i in $$(seq 1 30); do curl -fsS http://localhost:5000/ >/dev/null && break || sleep 1; done' && \
	npm run test:e2e

create-admin:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then echo "Usage: make create-admin EMAIL=... PASSWORD=..."; exit 1; fi
	python manage.py create-admin --email "$(EMAIL)" --password "$(PASSWORD)"

create-operator:
	@if [ -z "$(EMAIL)" ] || [ -z "$(PASSWORD)" ]; then echo "Usage: make create-operator EMAIL=... PASSWORD=..."; exit 1; fi
	python manage.py create-operator --email "$(EMAIL)" --password "$(PASSWORD)"

reset-password:
	@if [ -z "$(EMAIL)" ] || [ -z "$(NEW_PASSWORD)" ]; then echo "Usage: make reset-password EMAIL=... NEW_PASSWORD=..."; exit 1; fi
	python manage.py reset-password --email "$(EMAIL)" --new-password "$(NEW_PASSWORD)"
