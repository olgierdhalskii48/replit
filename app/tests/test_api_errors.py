from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app, raise_server_exceptions=False)


def assert_problem_json(resp, expected_status: int):
    assert resp.status_code == expected_status
    body = resp.json()
    # RFC 7807 fields
    assert isinstance(body, dict)
    assert "type" in body
    assert "title" in body
    assert "status" in body
    assert "instance" in body
    assert body["status"] == expected_status


def test_problem_json_on_404():
    # Non-existent route should return problem+json via global HTTPException handler
    resp = client.get("/api/v1/does-not-exist-xyz")
    # Starlette returns title "Not Found"; our handler wraps as problem+json
    assert_problem_json(resp, 404)


def test_problem_json_on_unhandled_exception(monkeypatch):
    # Force an unhandled exception by monkeypatching a simple route dynamically
    from fastapi import APIRouter

    router = APIRouter()

    @router.get("/boom")
    def boom():  # noqa: ANN001
        raise RuntimeError("boom")

    app.include_router(router, prefix="/test-problem-json")

    resp = client.get("/test-problem-json/boom")
    # Our unhandled exception handler should respond with 500 problem+json
    assert_problem_json(resp, 500)
