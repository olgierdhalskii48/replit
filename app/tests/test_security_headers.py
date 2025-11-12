from app.main import app
from starlette.testclient import TestClient


def test_security_headers_always_present():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    # Always-present hardening headers
    assert r.headers.get("X-Frame-Options") == "DENY"
    assert r.headers.get("X-Content-Type-Options") == "nosniff"
    assert r.headers.get("Referrer-Policy") == "no-referrer"
    assert r.headers.get("Permissions-Policy") is not None
    assert r.headers.get("Cross-Origin-Opener-Policy") == "same-origin"
