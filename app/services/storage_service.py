import os
from typing import Dict, Optional
import boto3
from botocore.client import Config


class SpacesStorageService:
    """
    S3-compatible storage service for DigitalOcean Spaces.
    Provides presigned URLs for secure direct uploads from the browser.
    """

    def __init__(self) -> None:
        self.endpoint_url = os.getenv("SPACES_ENDPOINT")  # e.g. https://nyc3.digitaloceanspaces.com
        self.region_name = os.getenv("SPACES_REGION", "nyc3")
        self.bucket_name = os.getenv("SPACES_BUCKET")
        key = os.getenv("SPACES_KEY")
        secret = os.getenv("SPACES_SECRET")
        if not all([self.endpoint_url, self.bucket_name, key, secret]):
            raise RuntimeError("Spaces configuration is incomplete. Set SPACES_ENDPOINT, SPACES_BUCKET, SPACES_KEY, SPACES_SECRET")

        session = boto3.session.Session()
        self.s3 = session.client(
            "s3",
            region_name=self.region_name,
            endpoint_url=self.endpoint_url,
            aws_access_key_id=key,
            aws_secret_access_key=secret,
            config=Config(s3={"addressing_style": "virtual"}),
        )

    def generate_presigned_post(
        self,
        key: str,
        content_type: Optional[str] = None,
        max_size_bytes: int = 50 * 1024 * 1024,
        expires_in: int = 3600,
        acl: str = "private",
    ) -> Dict:
        """
        Generate a presigned POST policy to allow direct browser upload to Spaces.
        """
        conditions = [["content-length-range", 0, max_size_bytes]]
        fields = {"acl": acl}

        # Enforce server-side encryption where supported by Spaces (SSE-S3 AES256)
        fields["x-amz-server-side-encryption"] = "AES256"
        conditions.append({"x-amz-server-side-encryption": "AES256"})

        if content_type:
            fields["Content-Type"] = content_type
            conditions.append({"Content-Type": content_type})

        response = self.s3.generate_presigned_post(
            Bucket=self.bucket_name,
            Key=key,
            Fields=fields,
            Conditions=conditions,
            ExpiresIn=expires_in,
        )
        response["bucket"] = self.bucket_name
        response["key"] = key
        return response

    def generate_presigned_get(self, key: str, expires_in: int = 3600) -> str:
        return self.s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket_name, "Key": key},
            ExpiresIn=expires_in,
        )
