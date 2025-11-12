import time
from typing import Callable, Optional
from fastapi import HTTPException, Request, status

try:
    from redis.asyncio import Redis
except Exception:  # pragma: no cover
    Redis = None  # type: ignore


_redis_client: Optional[Redis] = None
from app.core.config import get_settings


def get_redis_client() -> Optional[Redis]:
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    settings = get_settings()
    url = settings.REDIS_URL
    if Redis is None:
        return None
    # If REDIS_URL is not configured, gracefully disable rate limiting (fail-open)
    if not url:
        return None
    _redis_client = Redis.from_url(url, encoding="utf-8", decode_responses=True)
    return _redis_client


def rate_limiter(scope: str, limit: int = 10, window_seconds: int = 60) -> Callable:
    """
    Simple fixed-window rate limiter using Redis INCR/EXPIRE per client IP and scope.

    - scope: logical bucket name, e.g. "auth_login", "auth_verify"
    - limit: max requests allowed in the window
    - window_seconds: window size in seconds
    """

    async def dependency(request: Request):
        client_ip = request.client.host if request.client else "unknown"
        key = f"rl:{scope}:{client_ip}:{int(time.time() // window_seconds)}"
        r = get_redis_client()
        if r is None:
            # If Redis not available, do not block requests.
            return
        try:
            current = await r.incr(key)
            if current == 1:
                await r.expire(key, window_seconds)
            if current > limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many requests. Please try again later.",
                )
        except HTTPException:
            raise
        except Exception:
            # Fail-open: in case of Redis issues, don't block
            return

    return dependency
