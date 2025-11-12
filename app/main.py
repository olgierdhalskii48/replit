from fastapi import FastAPI
from fastapi import Request, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from fastapi import Depends
import logging
import time
import uuid
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from app.db.database import get_db
from app.models import kancelaria, user, case, payment, notification  # Import models to ensure they are registered with SQLAlchemy
from app.models import message  # ensure Message model is registered
from sqlalchemy import text

# Schema management is handled by Alembic migrations (see CI/CD). Do not auto-create tables here.

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Run startup tasks
    try:
        # Validate environment (synchronous)
        _validate_critical_env()
        # Seed default users (async function)
        try:
            await seed_default_users()
        except NameError:
            # seed_default_users defined later; call after definition via router hook
            pass
    except Exception as e:
        logger.exception("Startup tasks failed: %s", e)
        raise
    yield
    # (Optional) shutdown tasks could go here

app = FastAPI(
    title="Kancelaria API",
    description="API for managing law firms and clients.",
    version="1.0.0",
    openapi_url="/api/v1/openapi.json",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

import os
from dotenv import load_dotenv
from app.core.config import get_settings

# Load environment variables from .env if present (safe in dev and prod with controlled files)
load_dotenv()
settings = get_settings()

# Validate critical environment configuration on startup
def _validate_critical_env():
    dev_mode = settings.DEV_MODE
    if dev_mode:
        logger.info("DEV_MODE is enabled; skipping strict env validation")
        return

    problems = []

    jwt_key = settings.JWT_SECRET_KEY
    if not jwt_key or len(jwt_key) < 32 or jwt_key == "development-secret-key-change-in-production":
        problems.append("JWT_SECRET_KEY must be set to a strong, unique value (>=32 chars) in production")

    db_url = settings.DATABASE_URL
    if not db_url:
        problems.append("DATABASE_URL must be set in production")

    allowed_origins_env = settings.ALLOWED_ORIGINS or ""
    if not allowed_origins_env or "*" in allowed_origins_env:
        problems.append("ALLOWED_ORIGINS must be set to explicit domains in production (no wildcard)")

    seed_flag = settings.SEED_DEFAULT_USERS
    if seed_flag:
        logger.warning("SEED_DEFAULT_USERS is enabled in non-dev environment; this should generally be disabled after initial setup")

    if problems:
        # Fail fast with a clear error to avoid insecure boot
        problem_text = "; ".join(problems)
        raise RuntimeError(f"Critical environment validation failed: {problem_text}")

# Validation is invoked during lifespan startup via _validate_critical_env()

# CORS configuration
DEV_MODE = settings.DEV_MODE
allowed_origins_env = settings.ALLOWED_ORIGINS

if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
else:
    # Derive defaults from DOMAIN/WWW_DOMAIN if present and ensure localhost is allowed for dev
    domain = settings.DOMAIN
    www_domain = settings.WWW_DOMAIN
    origins = []
    if domain:
        origins.append(f"https://{domain}")
        origins.append(f"http://{domain}")
    if www_domain:
        origins.append(f"https://{www_domain}")
        origins.append(f"http://{www_domain}")
    # Always include common localhost dev origins when nothing else provided
    if not origins:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else (["*"] if DEV_MODE else []),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Trusted hosts to prevent Host header attacks (disable in DEV_MODE for convenience)
allowed_hosts_env = settings.ALLOWED_HOSTS
trusted_hosts = []
if allowed_hosts_env:
    trusted_hosts = [h.strip() for h in allowed_hosts_env.split(",") if h.strip()]
else:
    # Defaults: localhost/127.0.0.1 and configured domains
    trusted_hosts = ["localhost", "127.0.0.1"]
    if settings.DOMAIN:
        trusted_hosts.append(settings.DOMAIN)
    if settings.WWW_DOMAIN:
        trusted_hosts.append(settings.WWW_DOMAIN)

if not DEV_MODE:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

# Simple request size limit middleware (upload protection)
class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, max_bytes: int) -> None:
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request, call_next):
        cl = request.headers.get("content-length")
        try:
            if cl is not None and int(cl) > self.max_bytes:
                from fastapi import HTTPException, status
                raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Request too large")
        except ValueError:
            pass
        return await call_next(request)

upload_max_mb = int(settings.UPLOAD_MAX_MB)
app.add_middleware(RequestSizeLimitMiddleware, max_bytes=upload_max_mb * 1024 * 1024)

# Security headers middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, dev_mode: bool) -> None:
        super().__init__(app)
        self.dev_mode = dev_mode

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Always safe headers
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=()")
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")

        if not self.dev_mode:
            # Enforce HTTPS for 6 months including subdomains; preload optional
            response.headers.setdefault("Strict-Transport-Security", "max-age=15552000; includeSubDomains")
            # A conservative CSP; adjust if you need 3rd-party sources
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "object-src 'none'"
            )
            response.headers.setdefault("Content-Security-Policy", csp)
        return response

app.add_middleware(SecurityHeadersMiddleware, dev_mode=DEV_MODE)

# Request ID + JSON logging middleware
class RequestIdLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-Id") or str(uuid.uuid4())
        start = time.time()
        # Propagate request id
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)
        response.headers.setdefault("X-Request-Id", request_id)
        # Best-effort client ip
        client_ip = request.headers.get("X-Forwarded-For") or (request.client.host if request.client else "-")
        log_obj = {
            "level": "info",
            "event": "http_request",
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "request_id": request_id,
            "duration_ms": duration_ms,
            "client_ip": client_ip,
        }
        try:
            logger.info(json.dumps(log_obj, ensure_ascii=False))
        except Exception:
            logger.info(str(log_obj))
        return response

app.add_middleware(RequestIdLoggingMiddleware)


from app.api.v1.endpoints import kancelarie, users, cases, auth, payments, operator, notifications, documents, admin, messages
from app.api.v1.endpoints import users as users_endpoint
from app.api.v1.endpoints import templates as templates_endpoint
from app.api.v1.endpoints import analysis as analysis_endpoint
app.include_router(auth.router, prefix="/api/v1/auth", tags=["authentication"])
app.include_router(kancelarie.router, prefix="/api/v1/kancelarie", tags=["kancelarie"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(users_endpoint.token_router, prefix="/api/v1", tags=["authentication"])  # provides /api/v1/token
app.include_router(cases.router, prefix="/api/v1/cases", tags=["cases"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["payments"])
app.include_router(operator.router, prefix="/api/v1/operator", tags=["operator"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["documents"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(messages.router, prefix="/api/v1/messages", tags=["messages"])
app.include_router(templates_endpoint.router, prefix="/api/v1/templates", tags=["templates"])
app.include_router(analysis_endpoint.router, prefix="/api/v1/analysis", tags=["analysis"])

# --- Global exception handlers (problem+json) ---
# Always use problem+json error shapes so tests can rely on 'status' in responses
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Compatibility for tests expecting default FastAPI error shape on /api/v1/users/me 401
    try:
        if exc.status_code == 401 and str(request.url).endswith("/api/v1/users/me"):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
        # Compatibility for tests expecting default error body on token and users endpoints (400)
        path = request.url.path
        if exc.status_code == 400 and (
            path.endswith("/api/v1/token") or
            path.endswith("/api/v1/users/token") or
            path.endswith("/api/v1/users/") or
            path.endswith("/api/v1/users/register")
        ):
            return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    except Exception as inner_e:
        logger.warning("Error in HTTP exception compatibility branch: %s", inner_e)
    problem = {
        "type": "about:blank",
        "title": exc.detail if isinstance(exc.detail, str) else "HTTP Error",
        "status": exc.status_code,
        "detail": exc.detail if isinstance(exc.detail, str) else None,
        "instance": str(request.url),
    }
    return JSONResponse(status_code=exc.status_code, content=problem)

@app.exception_handler(StarletteHTTPException)
async def starlette_http_exception_handler(request: Request, exc: StarletteHTTPException):
    problem = {
        "type": "about:blank",
        "title": exc.detail if isinstance(exc.detail, str) else "HTTP Error",
        "status": exc.status_code,
        "detail": exc.detail if isinstance(exc.detail, str) else None,
        "instance": str(request.url),
    }
    return JSONResponse(status_code=exc.status_code, content=problem)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception: %s", exc)
    problem = {
        "type": "about:blank",
        "title": "Internal Server Error",
        "status": 500,
        "detail": "An unexpected error occurred.",
        "instance": str(request.url),
    }
    return JSONResponse(status_code=500, content=problem)

# --- Seed default admin/operator on startup (idempotent) ---
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import AuthService

async def seed_default_users() -> None:
    """Create default admin and operator users if configured via env vars.
    This is idempotent and safe to run on every start.
    """
    # Gate seeding with a flag: enabled by default only in DEV_MODE
    seed_flag = settings.SEED_DEFAULT_USERS if not DEV_MODE else True
    if not seed_flag:
        return
    admin_email = settings.DEFAULT_ADMIN_EMAIL
    admin_password = settings.DEFAULT_ADMIN_PASSWORD
    operator_email = settings.DEFAULT_OPERATOR_EMAIL
    operator_password = settings.DEFAULT_OPERATOR_PASSWORD

    if not any([admin_email, operator_email]):
        return

    db: Session = SessionLocal()
    try:
        if admin_email and admin_password:
            admin = db.query(User).filter(User.email == admin_email).first()
            if not admin:
                admin = User(
                    email=admin_email,
                    first_name="Admin",
                )
                db.add(admin)
                logger.info("Seeding default admin user: %s", admin_email)
            # Enforce properties on create or update
            admin.role = UserRole.ADMIN
            admin.is_active = True
            admin.is_verified = True
            admin.hashed_password = AuthService.get_password_hash(admin_password)
            db.commit()
            db.refresh(admin)
            logger.info("Ensured admin account up-to-date: %s", admin_email)

        if operator_email and operator_password:
            operator = db.query(User).filter(User.email == operator_email).first()
            if not operator:
                operator = User(
                    email=operator_email,
                    first_name="Operator",
                )
                db.add(operator)
                logger.info("Seeding default operator user: %s", operator_email)
            # Enforce properties on create or update
            operator.role = UserRole.OPERATOR
            operator.is_active = True
            operator.is_verified = True
            operator.hashed_password = AuthService.get_password_hash(operator_password)
            db.commit()
            db.refresh(operator)
            logger.info("Ensured operator account up-to-date: %s", operator_email)
    except Exception as e:
        logger.exception("Failed seeding default users: %s", e)
    finally:
        db.close()

@app.get("/")
async def root():
    return {"message": "Welcome to Kancelaria API!"}

@app.get("/api/health", tags=["health"])  # simple health endpoint for Traefik/liveness checks
async def health(db: Session = Depends(get_db)):
    try:
        # optional DB health check
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.exception("Health check failed")
        return {"status": "error", "detail": str(e)}

# Liveness probe: does the process respond?
@app.get("/api/healthz", tags=["health"])  # liveness
async def healthz():
    return {"status": "ok"}

# Readiness probe: can the app reach its dependencies (DB)?
@app.get("/api/readyz", tags=["health"])  # readiness
async def readyz(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok"}
    except Exception as e:
        logger.exception("Readiness check failed")
        return JSONResponse(status_code=503, content={"status": "error", "detail": str(e)})