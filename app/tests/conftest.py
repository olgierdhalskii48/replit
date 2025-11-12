import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import os
os.environ.setdefault("DEV_MODE", "true")
os.environ.setdefault("SEED_DEFAULT_USERS", "false")
from app.main import app
from app.db.database import Base, get_db
# Import all models to ensure tables are created
from app.models.user import User, UserRole
from app.models.case import Case
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.kancelaria import Kancelaria

# Use an in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def db_session_fixture():
    """
    Fixture that provides a test database session.
    All tables are created before tests run and dropped after tests complete.
    """
    Base.metadata.create_all(bind=engine)  # Create tables
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)  # Drop tables


@pytest.fixture(name="client")
def client_fixture(db_session, request):
    """
    Fixture that provides a test client for the FastAPI application.
    It overrides the get_db dependency to use the test database session.
    """

    def override_get_db():
        yield db_session

    # Ensure common test users exist and override auth dependency
    fixture_user = db_session.query(User).filter_by(email="fixture_user@example.com").first()
    if not fixture_user:
        fixture_user = User(email="fixture_user@example.com", hashed_password="x", is_active=True, role=UserRole.CLIENT)
        db_session.add(fixture_user)
        db_session.commit()
        db_session.refresh(fixture_user)

    # Ensure the fixture user is verified; this is the authenticated user returned by overrides
    if not getattr(fixture_user, "is_verified", False):
        fixture_user.is_verified = True
        db_session.commit()

    # Choose authenticated user depending on test file
    auth_user = fixture_user
    if request and hasattr(request, 'node') and hasattr(request.node, 'fspath'):
        path = str(request.node.fspath)
        if path.endswith("test_documents_endpoints.py"):
            # Use the test user created by the autouse override for documents tests
            auth_user = db_session.query(User).filter_by(email="test@example.com").first() or fixture_user
            if not getattr(auth_user, "is_verified", False):
                auth_user.is_verified = True
                db_session.commit()

    from fastapi import HTTPException, status
    from app.core.security import get_verified_user as real_get_verified_user
    def override_get_verified_user():
        # Simulate real behavior: block unverified
        if not getattr(auth_user, "is_verified", False):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not verified")
        return auth_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[real_get_verified_user] = override_get_verified_user
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Apply dependency override globally for any TestClient used outside the 'client' fixture
@pytest.fixture(autouse=True)
def _override_db_dependency(db_session, request):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db

    # Ensure test@example.com exists only for documents endpoints tests
    if request and hasattr(request, 'node') and hasattr(request.node, 'fspath'):
        path = str(request.node.fspath)
        if path.endswith("test_documents_endpoints.py"):
            existing = db_session.query(User).filter_by(email="test@example.com").first()
            if not existing:
                u = User(email="test@example.com", hashed_password="x", is_active=True, role=UserRole.CLIENT, is_verified=True)
                db_session.add(u)
                db_session.commit()

    yield
    app.dependency_overrides.clear()