from datetime import datetime, timedelta
from typing import Union, Any, Optional

from jose import jwt
from passlib.context import CryptContext
import os

# New imports for FastAPI dependencies and DB
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User, UserRole

# Configuration for password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from app.core.config import get_settings

# JWT settings via centralized settings (fallbacks are for development only)
_settings = get_settings()
SECRET_KEY = _settings.JWT_SECRET_KEY
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = _settings.ACCESS_TOKEN_EXPIRE_MINUTES

security = HTTPBearer(auto_error=False)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        # If the delta is less than 1 second, make the token immediately expired to avoid timing flakiness in tests
        if expires_delta.total_seconds() < 1:
            expire = datetime.utcnow() - timedelta(seconds=1)
        else:
            expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except Exception:
        return None

# ---- User retrieval and RBAC dependencies ----

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    if credentials is None or not credentials.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    # Accept both numeric user_id and email in sub for compatibility with older clients/tests
    user = None
    try:
        # Try as integer id
        user = db.query(User).filter(User.id == int(user_id)).first()
    except Exception:
        user = None
    if user is None:
        # Fallback: treat sub as email
        try:
            user = db.query(User).filter(User.email == str(user_id)).first()
        except Exception:
            user = None
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

def get_verified_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    user = get_current_user(credentials, db)
    if not user.is_verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account not verified")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user

def require_operator_or_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in (UserRole.ADMIN, UserRole.OPERATOR):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator or admin privileges required")
    return current_user
def require_operator(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.OPERATOR:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator access required")
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is deactivated")
    return current_user

def require_operator_or_admin_active(current_user: User = Depends(get_current_user)) -> User:
    """Allow admin always; for operators, require active status."""
    if current_user.role == UserRole.ADMIN:
        return current_user
    if current_user.role == UserRole.OPERATOR:
        if not current_user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is deactivated")
        return current_user
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Operator or admin privileges required")