from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, UTC

from app.db.database import get_db
from app.services.auth_service import (
    AuthService, GoogleOAuthService, SMSService, EmailService
)
from app.api.v1.schemas.auth import (
    UserRegistration, UserLogin, PhoneLogin, EmailLogin, 
    VerificationRequest, GoogleAuthCallback, TokenResponse,
    AuthResponse, VerificationResponse, AuthUrlResponse, UserResponse
)
from app.models.user import User, AuthProvider, UserRole
from app.middleware.rate_limit import rate_limiter
from app.core.security import require_admin, require_operator_or_admin
from app.security.password_policy import validate_password_strength
from app.security.account_lockout import (
    get_client_identifier,
    is_locked,
    remaining_lock_seconds,
    record_failure,
    reset_failures,
)
from app.security.password_policy import is_password_breached_hibp

router = APIRouter()
security = HTTPBearer()

# Dependency to get current user from JWT token
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from JWT token"""
    payload = AuthService.verify_token(credentials.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

async def get_verified_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get verified user from JWT token - for protected endpoints"""
    user = await get_current_user(credentials, db)
    
    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not verified. Please verify your account first."
        )
    
    return user

"""
RBAC helpers are centralized in app.core.security and imported above.
Left here for clarity and backwards-compatibility in other modules that import from this file.
"""

@router.post("/register", response_model=AuthResponse)
async def register_user(
    user_data: UserRegistration,
    request: Request,
    db: Session = Depends(get_db),
    _rl = Depends(rate_limiter("auth_register", limit=10, window_seconds=60))
):
    """Register new user"""
    
    # Check if user already exists
    existing_user = None
    if user_data.email:
        existing_user = AuthService.get_user_by_email(db, user_data.email)
    elif user_data.phone:
        existing_user = AuthService.get_user_by_phone(db, user_data.phone)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered" if user_data.email else "Phone already registered"
        )
    
    # Optional breach check (HIBP) before creating user
    if user_data.password:
        if await is_password_breached_hibp(user_data.password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password appears in known breaches. Please choose a different password."
            )

    # Create user
    user = AuthService.create_user(
        db=db,
        email=user_data.email,
        phone=user_data.phone,
        password=user_data.password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        company_name=user_data.company_name,
        auth_provider=user_data.auth_provider
    )
    
    # Send verification code
    verification_sent_to = None
    if user_data.auth_provider == AuthProvider.EMAIL and user.email:
        verification_code = AuthService.create_verification_code(db, user.id, "email")
        await EmailService.send_email_verification(user.email, verification_code.code)
        verification_sent_to = user.email
    elif user_data.auth_provider == AuthProvider.PHONE and user.phone:
        verification_code = AuthService.create_verification_code(db, user.id, "sms")
        await SMSService.send_sms_verification(user.phone, verification_code.code)
        verification_sent_to = user.phone
    
    # Create token (but user still needs to verify)
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse.model_validate(user, from_attributes=True),
        access_token=access_token,
        requires_verification=True,
        verification_sent_to=verification_sent_to
    )

@router.post("/login", response_model=AuthResponse)
async def login_user(
    login_data: UserLogin,
    request: Request,
    db: Session = Depends(get_db),
    _rl = Depends(rate_limiter("auth_login", limit=5, window_seconds=60))
):
    """Login with email/phone and password"""
    
    # Determine lockout identifier (email/phone/IP)
    identifier = await get_client_identifier(request, login_data.email or login_data.phone)
    # If currently locked, reject with remaining lock seconds
    if await is_locked("auth_login", identifier):
        rem = await remaining_lock_seconds("auth_login", identifier)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed attempts. Try again in {rem} seconds."
        )

    user = None
    if login_data.email:
        user = AuthService.authenticate_user(db, login_data.email, login_data.password)
    elif login_data.phone:
        phone_user = AuthService.get_user_by_phone(db, login_data.phone)
        if phone_user and phone_user.hashed_password:
            if AuthService.verify_password(login_data.password, phone_user.hashed_password):
                user = phone_user
    
    if not user:
        # Record failure for lockout/backoff
        await record_failure("auth_login", identifier)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated"
        )
    
    # Successful login: reset failures and update last login
    await reset_failures("auth_login", identifier)
    # Update last login
    user.last_login = datetime.now(UTC)
    db.commit()
    
    # Create token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse.model_validate(user, from_attributes=True),
        access_token=access_token,
        requires_verification=not user.is_verified
    )

@router.post("/login/phone", response_model=AuthResponse)
async def login_with_phone(
    phone_data: PhoneLogin,
    db: Session = Depends(get_db),
    _rl = Depends(rate_limiter("auth_login_phone", limit=3, window_seconds=60))
):
    """Initiate phone-based login (SMS verification)"""
    
    user = AuthService.get_user_by_phone(db, phone_data.phone)
    if not user:
        # Create new user if doesn't exist
        user = AuthService.create_user(
            db=db,
            phone=phone_data.phone,
            auth_provider=AuthProvider.PHONE
        )
    
    # Send SMS verification code
    verification_code = AuthService.create_verification_code(db, user.id, "sms")
    await SMSService.send_sms_verification(user.phone, verification_code.code)
    
    # Create temporary token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse.model_validate(user, from_attributes=True),
        access_token=access_token,
        requires_verification=True,
        verification_sent_to=user.phone
    )

@router.post("/login/email", response_model=AuthResponse) 
async def login_with_email(
    email_data: EmailLogin,
    db: Session = Depends(get_db),
    _rl = Depends(rate_limiter("auth_login_email", limit=3, window_seconds=60))
):
    """Initiate email-based login (email verification)"""
    
    user = AuthService.get_user_by_email(db, email_data.email)
    if not user:
        # Create new user if doesn't exist
        user = AuthService.create_user(
            db=db,
            email=email_data.email,
            auth_provider=AuthProvider.EMAIL
        )
    
    # Send email verification code
    verification_code = AuthService.create_verification_code(db, user.id, "email")
    await EmailService.send_email_verification(user.email, verification_code.code)
    
    # Create temporary token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse.model_validate(user, from_attributes=True),
        access_token=access_token,
        requires_verification=True,
        verification_sent_to=user.email
    )

@router.post("/verify", response_model=VerificationResponse)
async def verify_code(
    verification_data: VerificationRequest,
    db: Session = Depends(get_db),
    _rl = Depends(rate_limiter("auth_verify", limit=6, window_seconds=300))
):
    """Verify SMS or email code"""
    
    if AuthService.verify_code(
        db, 
        verification_data.user_id, 
        verification_data.code, 
        verification_data.code_type
    ):
        # Mark user as verified
        AuthService.mark_user_verified(db, verification_data.user_id)
        
        # Create new token
        access_token = AuthService.create_access_token(
            data={"sub": str(verification_data.user_id)}
        )
        
        return VerificationResponse(
            success=True,
            message="Verification successful",
            access_token=access_token
        )
    else:
        return VerificationResponse(
            success=False,
            message="Invalid or expired verification code"
        )

@router.get("/google", response_model=AuthUrlResponse)
async def google_oauth_url():
    """Get Google OAuth authorization URL"""
    auth_url = GoogleOAuthService.get_google_auth_url()
    return AuthUrlResponse(auth_url=auth_url)

@router.post("/google/callback", response_model=AuthResponse)
async def google_oauth_callback(
    callback_data: GoogleAuthCallback,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    
    # Exchange code for token
    token_data = await GoogleOAuthService.exchange_code_for_token(callback_data.code)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to exchange code for token"
        )
    
    # Get user info
    user_info = await GoogleOAuthService.get_user_info(token_data["access_token"])
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to get user information"
        )
    
    # Check if user exists
    user = AuthService.get_user_by_google_id(db, user_info["id"])
    if not user:
        # Check by email
        user = AuthService.get_user_by_email(db, user_info["email"])
        if user:
            # Link Google account
            user.google_id = user_info["id"]
            user.auth_provider = AuthProvider.GOOGLE
            db.commit()
        else:
            # Create new user
            user = AuthService.create_user(
                db=db,
                email=user_info["email"],
                first_name=user_info.get("given_name"),
                last_name=user_info.get("family_name"),
                auth_provider=AuthProvider.GOOGLE,
                google_id=user_info["id"]
            )
            # Google users are automatically verified
            user.is_verified = True
            db.commit()
    
    # Update last login
    user.last_login = datetime.now(UTC)
    db.commit()
    
    # Create token
    access_token = AuthService.create_access_token(data={"sub": str(user.id)})
    
    return AuthResponse(
        user=UserResponse.model_validate(user, from_attributes=True),
        access_token=access_token,
        requires_verification=False
    )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return UserResponse.model_validate(current_user, from_attributes=True)

@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    phone: Optional[str] = None,
    company_name: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile fields"""
    if first_name is not None:
        current_user.first_name = first_name
    if last_name is not None:
        current_user.last_name = last_name
    if phone is not None:
        current_user.phone = phone
    if company_name is not None:
        current_user.company_name = company_name
    db.commit()
    db.refresh(current_user)
    return UserResponse.from_orm(current_user)

@router.post("/change-password")
async def change_password(
    old_password: str,
    new_password: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Change password for current user"""
    # Require the user to have an existing password
    if current_user.hashed_password:
        if not AuthService.verify_password(old_password, current_user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid current password")
    # Strong password policy
    try:
        validate_password_strength(new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    current_user.hashed_password = AuthService.get_password_hash(new_password)
    db.commit()
    return {"message": "Password changed"}

@router.delete("/me")
async def delete_current_user(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete current user's account"""
    # Optionally: cleanup related data
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted"}

@router.post("/logout")
async def logout(
    current_user: User = Depends(get_current_user)
):
    """Logout user (token is handled client-side)"""
    return {"message": "Successfully logged out"}