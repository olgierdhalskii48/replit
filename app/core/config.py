from functools import lru_cache
from pydantic_settings import BaseSettings
from typing import List, Optional

# Centralized application settings
class Settings(BaseSettings):
    # Modes and general
    DEV_MODE: bool = False
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"  # json|console

    # Domains and CORS / Hosts
    DOMAIN: Optional[str] = None
    WWW_DOMAIN: Optional[str] = None
    ALLOWED_ORIGINS: Optional[str] = None  # comma-separated
    ALLOWED_HOSTS: Optional[str] = None    # comma-separated

    # Security / Auth
    JWT_SECRET_KEY: str = "development-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Uploads
    UPLOAD_MAX_MB: int = 50

    # HIBP password breach check
    ENABLE_HIBP_CHECK: bool = True
    HIBP_TIMEOUT: float = 3.0

    # Account lockout
    LOGIN_MAX_FAILED: int = 5
    LOGIN_LOCKOUT_SECONDS_BASE: int = 60
    LOGIN_LOCKOUT_MULTIPLIER: float = 2.0
    LOGIN_LOCKOUT_MAX_SECONDS: int = 3600

    # Rate limiting / Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Database
    DATABASE_URL: str = "sqlite:///./sql_app.db"

    # Seeding defaults
    SEED_DEFAULT_USERS: bool = False
    DEFAULT_ADMIN_EMAIL: Optional[str] = None
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None
    DEFAULT_OPERATOR_EMAIL: Optional[str] = None
    DEFAULT_OPERATOR_PASSWORD: Optional[str] = None

    # Misc feature limits
    MAX_FILES_PER_CASE: int = 10
    ALLOWED_FILE_TYPES: str = "pdf,jpg,jpeg,png,doc,docx"  # comma-separated

    @property
    def allowed_origins_list(self) -> List[str]:
        if self.ALLOWED_ORIGINS:
            return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        return []

    @property
    def allowed_hosts_list(self) -> List[str]:
        if self.ALLOWED_HOSTS:
            return [h.strip() for h in self.ALLOWED_HOSTS.split(",") if h.strip()]
        return []

    @property
    def allowed_file_types_list(self) -> List[str]:
        return [t.strip().lower() for t in self.ALLOWED_FILE_TYPES.split(",") if t.strip()]

@lru_cache()
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]