from datetime import timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.api.v1.schemas.user import TokenData
from app.core.security import SECRET_KEY, ALGORITHM, create_access_token as security_create_access_token, verify_password
from app.core.config import get_settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/users/token")

# Expose constant for tests to patch
ACCESS_TOKEN_EXPIRE_MINUTES = get_settings().ACCESS_TOKEN_EXPIRE_MINUTES

def authenticate_user(db: Session, email: str, password: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

# Backwards-compatible wrapper: tests call create_access_token(data={"sub": email}, expires_delta=...)
def create_access_token(*, data: dict, expires_delta: Optional[timedelta] = None) -> str:
    subject = str(data.get("sub")) if data else ""
    if not subject:
        raise ValueError("'sub' is required in data for create_access_token")
    return security_create_access_token(subject=subject, expires_delta=expires_delta)

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Enforce expiration verification explicitly
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM], options={"verify_exp": True})
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    # Accept both email and numeric id
    user = None
    try:
        user = db.query(User).filter(User.id == int(sub)).first()
    except Exception:
        user = None
    if user is None:
        user = db.query(User).filter(User.email == str(sub)).first()
    if user is None:
        raise credentials_exception
    return user

def get_current_active_user(current_user: User = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return current_user