import os
import types
import pytest
from app.services.storage_service import SpacesStorageService


def test_spaces_storage_missing_env(monkeypatch):
    # Clear required envs
    for key in ["SPACES_ENDPOINT", "SPACES_REGION", "SPACES_BUCKET", "SPACES_KEY", "SPACES_SECRET"]:
        monkeypatch.delenv(key, raising=False)
    with pytest.raises(RuntimeError):
        SpacesStorageService()


def test_presigned_post_includes_sse_and_conditions(monkeypatch):
    # Set minimal envs
    monkeypatch.setenv("SPACES_ENDPOINT", "https://nyc3.digitaloceanspaces.com")
    monkeypatch.setenv("SPACES_REGION", "nyc3")
    monkeypatch.setenv("SPACES_BUCKET", "test-bucket")
    monkeypatch.setenv("SPACES_KEY", "KEY")
    monkeypatch.setenv("SPACES_SECRET", "SECRET")

    # Fake boto3 client
    class FakeS3Client:
        def generate_presigned_post(self, Bucket, Key, Fields, Conditions, ExpiresIn):
            # Assert the enforced policy bits are present
            assert Bucket == "test-bucket"
            assert Fields.get("acl") == "private"
            assert Fields.get("x-amz-server-side-encryption") == "AES256"
            # Content length condition present
            assert any(isinstance(c, list) and c[:2] == ["content-length-range", 0] for c in Conditions)
            # SSE condition present
            assert any(isinstance(c, dict) and c.get("x-amz-server-side-encryption") == "AES256" for c in Conditions)
            # Content-Type constraint present when content_type was provided
            assert any(isinstance(c, dict) and c.get("Content-Type") == "application/pdf" for c in Conditions)
            return {"url": "https://example.com", "fields": Fields}

        def generate_presigned_url(self, *args, **kwargs):  # not used
            return "https://example.com/get"

    # Patch the service to use our fake client
    service = SpacesStorageService.__new__(SpacesStorageService)
    service.endpoint_url = os.getenv("SPACES_ENDPOINT")
    service.region_name = os.getenv("SPACES_REGION")
    service.bucket_name = os.getenv("SPACES_BUCKET")
    service.s3 = FakeS3Client()

    resp = service.generate_presigned_post(
        key="uploads/case_1/test.pdf",
        content_type="application/pdf",
        max_size_bytes=10 * 1024 * 1024,
        expires_in=600,
        acl="private",
    )
    assert resp["url"].startswith("https://")
    assert resp["fields"]["x-amz-server-side-encryption"] == "AES256"
