import os
import json
import pytest
from fastapi.testclient import TestClient


def test_limits_endpoint(client: TestClient):
    r = client.get("/api/v1/documents/limits")
    assert r.status_code == 200
    data = r.json()
    assert "max_file_size_mb" in data
    assert "max_files_per_case" in data
    assert isinstance(data["allowed_file_types"], list)


def test_presign_returns_503_when_spaces_not_configured(monkeypatch, client: TestClient, db_session):
    # Ensure required envs are missing
    for key in ["SPACES_ENDPOINT", "SPACES_BUCKET", "SPACES_KEY", "SPACES_SECRET"]:
        monkeypatch.delenv(key, raising=False)

    # Create a case for the test user
    from app.models.case import Case
    from app.models.user import User

    user = db_session.query(User).filter_by(email="test@example.com").first()
    case = Case(title="t", user_id=user.id)
    db_session.add(case)
    db_session.commit()
    db_session.refresh(case)

    payload = {"filename": "doc.pdf", "content_type": "application/pdf"}
    r = client.post(f"/api/v1/documents/presign/{case.id}", json=payload)
    assert r.status_code == 503
    assert "Storage not configured" in r.json().get("detail", "")
