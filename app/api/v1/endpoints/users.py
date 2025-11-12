from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.api.v1.schemas.user import UserCreate, UserInDB, Token
from app.core.security import get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, create_access_token
from app.core.auth import authenticate_user
from app.core.security import get_current_user as security_get_current_user
from app.core.auth import get_current_user as auth_get_current_user
from app.security.password_policy import validate_password_strength, is_password_breached_hibp
from app.core.config import get_settings
from app.security.account_lockout import (
    is_locked,
    record_failure,
    reset_failures,
    get_client_identifier,
    remaining_lock_seconds,
)
from app.middleware.rate_limit import rate_limiter

router = APIRouter()
token_router = APIRouter()

@router.post("/", response_model=UserInDB)
async def create_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    settings = get_settings()
    # Enforce strong password in non-dev contexts only
    if not settings.DEV_MODE:
        validate_password_strength(user.password)
        if await is_password_breached_hibp(user.password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This password appears in known breaches. Choose a different one.")
    hashed = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED, dependencies=[Depends(rate_limiter("auth_register", limit=10, window_seconds=60))])
async def register_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    settings = get_settings()
    if not settings.DEV_MODE:
        validate_password_strength(user.password)
        if await is_password_breached_hibp(user.password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This password appears in known breaches. Choose a different one.")
    hashed_password = get_password_hash(user.password)
    db_user = User(email=user.email, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Create access token for the new user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=db_user.email, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/token", response_model=Token, dependencies=[Depends(rate_limiter("auth_login", limit=20, window_seconds=60))])
async def login_for_access_token(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    # Identify client (email or IP)
    client_identifier = await get_client_identifier(request, form_data.username)
    if await is_locked("auth_login", client_identifier):
        ttl = await remaining_lock_seconds("auth_login", client_identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Account temporarily locked. Try again in {ttl} seconds.",
        )

    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        await record_failure("auth_login", client_identifier)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    await reset_failures("auth_login", client_identifier)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(subject=user.email, expires_delta=access_token_expires)
    return {"access_token": access_token, "token_type": "bearer"}

@token_router.post("/token", response_model=Token, dependencies=[Depends(rate_limiter("auth_login", limit=20, window_seconds=60))])
async def login_for_access_token_root(request: Request, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return await login_for_access_token(request, form_data, db)

@router.get("/me", response_model=UserInDB)
async def read_users_me(current_user: User = Depends(auth_get_current_user)):
    return current_user