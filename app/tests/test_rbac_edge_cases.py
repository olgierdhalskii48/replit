import os
from fastapi.testclient import TestClient
from datetime import timedelta

# Ensure dev mode for tests
os.environ.setdefault("DEV_MODE", "true")

from app.main import app
from app.models.user import User, UserRole, AuthProvider
from app.services.auth_service import AuthService
from app.db.database import SessionLocal


def auth_headers_for(user: User):
    token = AuthService.create_access_token(data={"sub": str(user.id)}, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


def test_unverified_user_cannot_access_verified_endpoints(db_session):
    """User with is_verified=False should be blocked by get_verified_user dependency."""
    # Create unverified client user
    user = User(
        email="edge_unverified@test.com",
        hashed_password=AuthService.get_password_hash("Client#12345"),
        role=UserRole.CLIENT,
        auth_provider=AuthProvider.EMAIL,
        is_verified=False,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    client = TestClient(app, raise_server_exceptions=False)
    headers = auth_headers_for(user)

    # Any endpoint using get_verified_user should reject unverified users, e.g., list cases
    resp = client.get("/api/v1/cases", headers=headers)
    assert resp.status_code == 401
    body = resp.json()
    assert body.get("status") == 401
    assert "verified" in (body.get("detail") or "").lower()


def test_inactive_user_blocked_on_operator_routes(db_session):
    """Inactive operator should be rejected on require_operator-protected endpoints."""
    user = User(
        email="edge_inactive_operator@test.com",
        hashed_password=AuthService.get_password_hash("Operator#12345"),
        role=UserRole.OPERATOR,
        auth_provider=AuthProvider.EMAIL,
        is_verified=True,
        is_active=False,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    client = TestClient(app, raise_server_exceptions=False)
    headers = auth_headers_for(user)

    resp = client.get("/api/v1/operator/cases", headers=headers)
    assert resp.status_code in (401, 403)


def test_client_cannot_access_operator_routes(db_session):
    """Client attempting operator endpoints should be forbidden."""
    user = User(
        email="edge_client_try_operator@test.com",
        hashed_password=AuthService.get_password_hash("Client#12345"),
        role=UserRole.CLIENT,
        auth_provider=AuthProvider.EMAIL,
        is_verified=True,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    client = TestClient(app, raise_server_exceptions=False)
    headers = auth_headers_for(user)

    resp = client.get("/api/v1/operator/cases", headers=headers)
    assert resp.status_code in (401, 403)
