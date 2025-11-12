import os
import time
from typing import Optional, Tuple
from fastapi import HTTPException, status, Request

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None  # type: ignore

from app.middleware.rate_limit import get_redis_client

# Environment-configurable lockout parameters
MAX_FAILED = int(os.getenv("LOGIN_MAX_FAILED", "5"))
BASE_LOCKOUT_SECONDS = int(os.getenv("LOGIN_LOCKOUT_SECONDS_BASE", "60"))
LOCKOUT_MULTIPLIER = float(os.getenv("LOGIN_LOCKOUT_MULTIPLIER", "2"))
MAX_LOCKOUT_SECONDS = int(os.getenv("LOGIN_LOCKOUT_MAX_SECONDS", "3600"))


def _keys(scope: str, identifier: str) -> Tuple[str, str]:
    """
    Returns (fail_count_key, lock_key) for given scope and identifier.
    Identifier can be an email, phone, or IP. Scope typically "auth_login".
    """
    safe_id = identifier.replace(" ", "_").lower()
    return (f"lock:{scope}:fail:{safe_id}", f"lock:{scope}:lock:{safe_id}")


async def get_client_identifier(request: Request, email_or_phone: Optional[str]) -> str:
    ip = request.client.host if request.client else "unknown"
    return email_or_phone or ip


async def is_locked(scope: str, identifier: str) -> bool:
    r: Optional[Redis] = get_redis_client()
    if r is None:
        return False
    _, lock_key = _keys(scope, identifier)
    try:
        ttl = await r.ttl(lock_key)
        return bool(ttl and ttl > 0)
    except Exception:
        # Fail-open if Redis not reachable
        return False


async def remaining_lock_seconds(scope: str, identifier: str) -> int:
    r: Optional[Redis] = get_redis_client()
    if r is None:
        return 0
    _, lock_key = _keys(scope, identifier)
    try:
        ttl = await r.ttl(lock_key)
        return int(ttl if ttl and ttl > 0 else 0)
    except Exception:
        return 0


async def record_failure(scope: str, identifier: str) -> None:
    r: Optional[Redis] = get_redis_client()
    if r is None:
        return
    fail_key, lock_key = _keys(scope, identifier)
    # Increment failure count in a sliding window of 1 day
    try:
        current = await r.incr(fail_key)
        if current == 1:
            await r.expire(fail_key, 24 * 3600)

        if current >= MAX_FAILED:
            over = current - MAX_FAILED
            lock_seconds = int(min(MAX_LOCKOUT_SECONDS, BASE_LOCKOUT_SECONDS * (LOCKOUT_MULTIPLIER ** over)))
            await r.set(lock_key, "1", ex=lock_seconds)
    except Exception:
        return


async def reset_failures(scope: str, identifier: str) -> None:
    r: Optional[Redis] = get_redis_client()
    if r is None:
        return
    fail_key, lock_key = _keys(scope, identifier)
    # Reset counters and lock
    try:
        await r.delete(fail_key)
        await r.delete(lock_key)
    except Exception:
        return
