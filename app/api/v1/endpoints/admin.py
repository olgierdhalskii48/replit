from fastapi import APIRouter, Depends, HTTPException, status
import os, json
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.case import Case
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.kancelaria import Kancelaria
from app.core.security import require_admin
from pydantic import BaseModel, EmailStr
from app.services.auth_service import AuthService
from app.models.payment import Payment, PaymentStatus
from app.models.user import User, UserRole
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# Response schemas
class DashboardStats(BaseModel):
    users: dict
    lawFirms: dict
    subscriptions: dict
    apiUsage: dict
    caseStatus: Optional[dict] = None
    revenueByProvider: Optional[dict] = None

class RecentActivity(BaseModel):
    id: str
    type: str
    description: str
    timestamp: str
    user: Optional[dict] = None

class UserManagement(BaseModel):
    id: int
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]

class UserRoleUpdate(BaseModel):
    role: UserRole

class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.CLIENT

class UserLookupResponse(BaseModel):
    id: int
    email: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]

@router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics for admin panel"""
    # User statistics
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    # Users by role
    role_counts = db.query(User.role, func.count(User.id)).group_by(User.role).all()
    users_by_role = {
        "clients": 0,
        "operators": 0,
        "admins": 0,
        "lawyers": 0,
    }
    for role, count in role_counts:
        role_name = role.value if hasattr(role, 'value') else str(role)
        if role_name == "client":
            users_by_role["clients"] = count
        elif role_name == "operator":
            users_by_role["operators"] = count
        elif role_name == "admin":
            users_by_role["admins"] = count
        else:
            users_by_role["lawyers"] += count

    # New users this month
    month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    new_users_this_month = db.query(User).filter(User.created_at >= month_start).count()

    # Law firms statistics (defensive if table missing)
    try:
        total_law_firms = db.query(Kancelaria).count()
        active_law_firms = db.query(Kancelaria).filter(Kancelaria.is_active == True).count()
        verified_law_firms = db.query(Kancelaria).filter(Kancelaria.is_verified == True).count()
        new_law_firms_this_month = db.query(Kancelaria).filter(Kancelaria.created_at >= month_start).count()
    except Exception:
        total_law_firms = active_law_firms = verified_law_firms = new_law_firms_this_month = 0

    # Payment/subscription statistics (defensive)
    try:
        total_payments = db.query(Payment).count()
        # count of PAID as active subscriptions proxy
        active_subscriptions = db.query(Payment).filter(
            (Payment.status == PaymentStatus.PAID) if hasattr(PaymentStatus, 'PAID') else (Payment.status == "PAID")
        ).count()
        revenue_query = db.query(func.sum(Payment.amount)).filter(
            (Payment.status == PaymentStatus.PAID) if hasattr(PaymentStatus, 'PAID') else (Payment.status == "PAID")
        ).scalar()
        total_revenue = float(revenue_query) if revenue_query else 0.0
    except Exception:
        total_payments = active_subscriptions = 0
        total_revenue = 0.0

    # API usage (simplified - using case creation as proxy)
    today = datetime.now().date()
    try:
        today_cases = db.query(Case).filter(func.date(Case.created_at) == today).count()
        total_cases = db.query(Case).count()
    except Exception:
        today_cases = total_cases = 0

    # Case status breakdown
    status_counts = {}
    try:
        rows = db.query(Case.status, func.count(Case.id)).group_by(Case.status).all()
        for st, cnt in rows:
            key = st.value if hasattr(st, 'value') else str(st)
            status_counts[key] = cnt
    except Exception:
        status_counts = {}

    # Revenue breakdown by provider
    revenue_by_provider = {}
    try:
        rows = db.query(Payment.provider, func.sum(Payment.amount)).filter(
            (Payment.status == PaymentStatus.PAID) if hasattr(PaymentStatus, 'PAID') else (Payment.status == "PAID")
        ).group_by(Payment.provider).all()
        for prov, amt in rows:
            key = prov.value if hasattr(prov, 'value') else str(prov)
            revenue_by_provider[key] = float(amt or 0.0)
    except Exception:
        revenue_by_provider = {}

    return DashboardStats(
        users={
            "total": total_users,
            "active": active_users,
            "newThisMonth": new_users_this_month,
            "byRole": users_by_role,
        },
        lawFirms={
            "total": total_law_firms,
            "active": active_law_firms,
            "verified": verified_law_firms,
            "newThisMonth": new_law_firms_this_month,
        },
        subscriptions={
            "total": total_payments,
            "active": active_subscriptions,
            "trial": 0,
            "revenue": total_revenue,
        },
        apiUsage={
            "totalCalls": total_cases,
            "todayCalls": today_cases,
            "avgResponseTime": 150,
        },
        caseStatus=status_counts,
        revenueByProvider=revenue_by_provider,
    )

# ------------------ Admin User Management ------------------

class AdminUserCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "CLIENT"  # CLIENT | OPERATOR | ADMIN
    is_active: Optional[bool] = True
    password: Optional[str] = None

class AdminUserResponse(BaseModel):
    id: int
    email: EmailStr
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AdminUserRoleUpdate(BaseModel):
    role: str  # CLIENT | OPERATOR | ADMIN


@router.get("/users", response_model=List[AdminUserResponse])
async def admin_list_users(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    return users


@router.post("/users", response_model=AdminUserResponse, status_code=201)
async def admin_create_user(
    payload: AdminUserCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Determine role
    role_map = {"CLIENT": UserRole.CLIENT, "OPERATOR": UserRole.OPERATOR, "ADMIN": UserRole.ADMIN}
    role_val = role_map.get((payload.role or "CLIENT").upper(), UserRole.CLIENT)

    # Password
    pwd = payload.password or "Temp#" + str(int(datetime.utcnow().timestamp()))
    hashed = AuthService.get_password_hash(pwd)

    new_user = User(
        email=payload.email,
        first_name=payload.first_name,
        last_name=payload.last_name,
        phone=payload.phone,
        hashed_password=hashed,
        role=role_val,
        is_active=bool(payload.is_active),
        is_verified=False,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.put("/users/{user_id}/role", response_model=AdminUserResponse)
async def admin_update_user_role(
    user_id: int,
    body: AdminUserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    role_map = {"CLIENT": UserRole.CLIENT, "OPERATOR": UserRole.OPERATOR, "ADMIN": UserRole.ADMIN}
    if body.role.upper() not in role_map:
        raise HTTPException(status_code=400, detail="Invalid role")
    user.role = role_map[body.role.upper()]
    db.commit()
    db.refresh(user)
    return user


@router.put("/users/{user_id}/status", response_model=AdminUserResponse)
async def admin_toggle_user_status(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not bool(user.is_active)
    db.commit()
    db.refresh(user)
    return user


@router.get("/dashboard/activity", response_model=dict)
async def get_recent_activity(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get recent activity for admin dashboard"""
    
    activities = []
    
    # Recent user registrations
    recent_users = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    for user in recent_users:
        activities.append({
            "id": f"user_{user.id}",
            "type": "user_registered",
            "description": f"Nowy użytkownik zarejestrowany",
            "timestamp": user.created_at.isoformat(),
            "user": {
                "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
                "email": user.email,
                "avatar": None
            }
        })
    
    # Recent cases
    recent_cases = db.query(Case).order_by(Case.created_at.desc()).limit(5).all()
    for case in recent_cases:
        user = case.user
        activities.append({
            "id": f"case_{case.id}",
            "type": "api_call",
            "description": f"Nowa sprawa utworzona: {case.title}",
            "timestamp": case.created_at.isoformat(),
            "user": {
                "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
                "email": user.email,
                "avatar": None
            }
        })
    
    # Sort by timestamp
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    
    return {"activities": activities[:10]}

@router.get("/users", response_model=List[UserManagement])
async def get_all_users(
    limit: int = 100,
    offset: int = 0,
    role_filter: Optional[UserRole] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users for admin management"""
    
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    users = query.offset(offset).limit(limit).all()
    
    return [
        UserManagement(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value if hasattr(user.role, 'value') else str(user.role),
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
        for user in users
    ]

@router.get("/users/search", response_model=Optional[UserLookupResponse])
async def search_user(
    email: EmailStr,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Find user by email (admin only). Returns null if not found."""
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return None
    return UserLookupResponse(id=user.id, email=user.email, first_name=user.first_name, last_name=user.last_name)

@router.post("/users", response_model=UserManagement, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Create a new user (admin only)."""
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed = AuthService.get_password_hash(body.password) if body.password else None
    user = User(
        email=body.email,
        first_name=body.first_name,
        last_name=body.last_name,
        hashed_password=hashed,
        role=body.role,
        is_active=True,
        is_verified=True,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserManagement(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value if hasattr(user.role, 'value') else str(user.role),
        is_active=user.is_active,
        is_verified=user.is_verified,
        created_at=user.created_at,
        last_login=user.last_login,
    )

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Update user role (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.role = role_update.role
    db.commit()
    
    return {"message": f"User role updated to {role_update.role.value}"}

@router.put("/users/{user_id}/status")
async def toggle_user_status(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Toggle user active status (admin only)"""
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = not user.is_active
    db.commit()
    
    return {"message": f"User {'activated' if user.is_active else 'deactivated'}"}


class FinancialTimeseriesResponse(BaseModel):
    days: list[str]
    payments_count: list[int]
    revenue_amount: list[float]

class AdminSettingsModel(BaseModel):
    # General
    analyticsPublic: bool = False
    emailFrom: str = "noreply@kancelariax.pl"
    enablePayments: bool = True
    notifyOnUserCreate: bool = True
    brandName: str = "Kancelaria X"
    supportEmail: str = "support@kancelariax.pl"
    legalFooter: str = "© 2025 Kancelaria X. Wszelkie prawa zastrzeżone."
    # Payments
    paymentsProvider: str = 'payu'  # payu | stripe | disabled
    payuPosId: Optional[str] = None
    payuSecondKey: Optional[str] = None
    stripePk: Optional[str] = None
    stripeSk: Optional[str] = None
    # Notifications
    smtpHost: Optional[str] = None
    smtpPort: Optional[int] = 587
    smtpUser: Optional[str] = None
    smtpSecure: Optional[bool] = True
    smsProvider: Optional[str] = 'disabled'  # twilio | disabled
    twilioSid: Optional[str] = None
    twilioToken: Optional[str] = None
    twilioFrom: Optional[str] = None
    # Security
    require2FA: Optional[bool] = False
    sessionTimeoutMin: Optional[int] = 60

SETTINGS_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'admin_settings.json')

def _ensure_settings_dir():
    base_dir = os.path.dirname(SETTINGS_PATH)
    os.makedirs(base_dir, exist_ok=True)

def _load_settings() -> AdminSettingsModel:
    try:
        if os.path.exists(SETTINGS_PATH):
            with open(SETTINGS_PATH, 'r', encoding='utf-8') as f:
                raw = json.load(f)
                return AdminSettingsModel(**raw)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Failed loading admin settings from %s: %s", SETTINGS_PATH, e)
    return AdminSettingsModel()

def _save_settings(settings: AdminSettingsModel):
    _ensure_settings_dir()
    with open(SETTINGS_PATH, 'w', encoding='utf-8') as f:
        json.dump(settings.dict(), f, ensure_ascii=False, indent=2)

@router.get("/analytics/financial-timeseries", response_model=FinancialTimeseriesResponse)
async def get_financial_timeseries(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Return per-day paid payments count and revenue for the last N days (admin only)."""
    if days < 1 or days > 90:
        days = 30

    now = datetime.utcnow()
    out_days: list[str] = []
    payments_count: list[int] = []
    revenue_amount: list[float] = []

    for i in range(days - 1, -1, -1):
        day_start = datetime(now.year, now.month, now.day)
        start = day_start - timedelta(days=i)
        end = start + timedelta(days=1)
        out_days.append(start.strftime("%Y-%m-%d"))

        q = db.query(Payment).filter(Payment.status == PaymentStatus.PAID, Payment.paid_at >= start, Payment.paid_at < end)
        payments_count.append(q.count())
        amounts = db.query(Payment.amount).filter(Payment.status == PaymentStatus.PAID, Payment.paid_at >= start, Payment.paid_at < end).all()
        revenue_amount.append(float(sum(a[0] for a in amounts)) if amounts else 0.0)

    return FinancialTimeseriesResponse(days=out_days, payments_count=payments_count, revenue_amount=revenue_amount)

@router.get("/settings", response_model=AdminSettingsModel)
async def get_admin_settings(
    current_user: User = Depends(require_admin),
):
    """Return current admin settings (persisted in JSON file)."""
    return _load_settings()

class AdminSettingsPartial(BaseModel):
    analyticsPublic: Optional[bool] = None
    emailFrom: Optional[str] = None
    enablePayments: Optional[bool] = None
    notifyOnUserCreate: Optional[bool] = None
    brandName: Optional[str] = None
    supportEmail: Optional[str] = None
    legalFooter: Optional[str] = None
    paymentsProvider: Optional[str] = None
    payuPosId: Optional[str] = None
    payuSecondKey: Optional[str] = None
    stripePk: Optional[str] = None
    stripeSk: Optional[str] = None
    smtpHost: Optional[str] = None
    smtpPort: Optional[int] = None
    smtpUser: Optional[str] = None
    smtpSecure: Optional[bool] = None
    smsProvider: Optional[str] = None
    twilioSid: Optional[str] = None
    twilioToken: Optional[str] = None
    twilioFrom: Optional[str] = None
    require2FA: Optional[bool] = None
    sessionTimeoutMin: Optional[int] = None

@router.put("/settings", response_model=AdminSettingsModel)
async def put_admin_settings(
    payload: AdminSettingsPartial,
    current_user: User = Depends(require_admin),
):
    """Update and persist admin settings."""
    current = _load_settings()
    data = current.dict()
    updates = {k: v for k, v in payload.dict(exclude_unset=True).items() if v is not None}

    # Merge updates
    data.update(updates)

    # Validation
    if 'emailFrom' in updates and ('@' not in (data.get('emailFrom') or '')):
        raise HTTPException(status_code=400, detail="Invalid emailFrom")
    if 'supportEmail' in updates and ('@' not in (data.get('supportEmail') or '')):
        raise HTTPException(status_code=400, detail="Invalid supportEmail")

    # Secret handling and provider requirements
    provider = (updates.get('paymentsProvider') or data.get('paymentsProvider') or 'disabled').lower()
    if provider == 'payu':
        # If secrets not provided in update, keep existing from current
        if 'payuPosId' not in updates:
            data['payuPosId'] = current.payuPosId
        if 'payuSecondKey' not in updates:
            data['payuSecondKey'] = current.payuSecondKey
        if not data.get('payuPosId') or not data.get('payuSecondKey'):
            raise HTTPException(status_code=400, detail="Missing PayU credentials")
    elif provider == 'stripe':
        if 'stripePk' not in updates:
            data['stripePk'] = current.stripePk
        if 'stripeSk' not in updates:
            data['stripeSk'] = current.stripeSk
        if not data.get('stripePk') or not data.get('stripeSk'):
            raise HTTPException(status_code=400, detail="Missing Stripe credentials")

    final = AdminSettingsModel(**data)
    _save_settings(final)
    return final

class UsersTimeseriesResponse(BaseModel):
    days: List[str]
    new_users: List[int]

class UsersByRoleTimeseriesResponse(BaseModel):
    days: List[str]
    roles: Dict[str, List[int]]  # keys: client, operator, admin, other

@router.get("/analytics/users-timeseries", response_model=UsersTimeseriesResponse)
async def get_users_timeseries(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if days < 1 or days > 90:
        days = 30
    now = datetime.utcnow()
    start_of_today = datetime(now.year, now.month, now.day)
    out_days: List[str] = []
    counts: List[int] = []
    for i in range(days - 1, -1, -1):
        start = start_of_today - timedelta(days=i)
        end = start + timedelta(days=1)
        out_days.append(start.strftime("%Y-%m-%d"))
        cnt = db.query(User).filter(User.created_at >= start, User.created_at < end).count()
        counts.append(cnt)
    return UsersTimeseriesResponse(days=out_days, new_users=counts)

@router.get("/analytics/users-by-role-timeseries", response_model=UsersByRoleTimeseriesResponse)
async def get_users_by_role_timeseries(
    days: int = 30,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    if days < 1 or days > 90:
        days = 30
    now = datetime.utcnow()
    start_of_today = datetime(now.year, now.month, now.day)
    out_days: List[str] = []
    roles_series: Dict[str, List[int]] = {"client": [], "operator": [], "admin": [], "other": []}
    for i in range(days - 1, -1, -1):
        start = start_of_today - timedelta(days=i)
        end = start + timedelta(days=1)
        out_days.append(start.strftime("%Y-%m-%d"))
        rows = db.query(User.role, func.count(User.id)).filter(User.created_at >= start, User.created_at < end).group_by(User.role).all()
        role_counts = { (r.value if hasattr(r, 'value') else str(r)) : c for r, c in rows }
        roles_series["client"].append(role_counts.get("client", 0))
        roles_series["operator"].append(role_counts.get("operator", 0))
        roles_series["admin"].append(role_counts.get("admin", 0))
        # treat any other roles as 'other'
        other_cnt = sum(c for k, c in role_counts.items() if k not in ("client", "operator", "admin"))
        roles_series["other"].append(other_cnt)
    return UsersByRoleTimeseriesResponse(days=out_days, roles=roles_series)

@router.get("/cases", response_model=List[dict])
async def get_all_cases(
    limit: int = 100,
    offset: int = 0,
    status_filter: Optional[str] = None,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all cases for admin oversight"""
    
    query = db.query(Case).join(User)
    
    if status_filter:
        query = query.filter(Case.status == status_filter)
    
    cases = query.offset(offset).limit(limit).all()
    
    return [
        {
            "id": case.id,
            "title": case.title,
            "status": case.status.value if hasattr(case.status, 'value') else str(case.status),
            "created_at": case.created_at.isoformat(),
            "client_name": f"{case.user.first_name or ''} {case.user.last_name or ''}".strip() or case.user.email,
            "client_email": case.user.email,
            "operator_id": case.operator_id,
            "package_type": case.package_type.value if case.package_type and hasattr(case.package_type, 'value') else str(case.package_type) if case.package_type else None
        }
        for case in cases
    ]

@router.get("/statistics")
async def get_detailed_statistics(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get detailed system statistics"""
    
    # Performance metrics
    return {
        "database_connections": 1,  # Placeholder
        "active_sessions": 1,  # Placeholder  
        "memory_usage": "45%",  # Placeholder
        "cpu_usage": "23%",  # Placeholder
        "uptime": "99.9%"  # Placeholder
    }