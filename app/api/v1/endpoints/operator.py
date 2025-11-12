from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.case import Case, Analysis, LegalDocument, CaseStatus
from app.models.template import MessageTemplate
from app.models.payment import Payment, PaymentStatus
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.models.user import User, UserRole
from app.core.security import require_operator, require_operator_or_admin, require_operator_or_admin_active
from app.services.ai_document_analysis_service import create_ai_document_service

router = APIRouter()

# Pydantic schemas for operator operations
class AnalysisCreate(BaseModel):
    case_id: int
    content: str
    summary: Optional[str] = None
    recommendations: Optional[str] = None
    possible_actions: Optional[str] = None
    confidence_score: Optional[float] = None

class AnalysisResponse(BaseModel):
    id: int
    case_id: int
    content: str
    summary: Optional[str]
    recommendations: Optional[str]
    possible_actions: Optional[str]
    confidence_score: Optional[float]
    is_preview: bool
    created_at: datetime
    updated_at: datetime
    operator_id: Optional[int]
    
    class Config:
        from_attributes = True

class CreateClientRequest(BaseModel):
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None

class ClientResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class LegalDocumentCreate(BaseModel):
    case_id: int
    document_name: str
    document_type: str
    content: str
    price: float
    instructions: Optional[str] = None

class LegalDocumentResponse(BaseModel):
    id: int
    case_id: int
    document_name: str
    document_type: str
    content: str
    price: float
    is_purchased: bool
    is_preview: bool
    instructions: Optional[str]
    created_at: datetime
    purchased_at: Optional[datetime]
    operator_id: Optional[int]
    
    class Config:
        from_attributes = True

class CaseUpdateStatus(BaseModel):
    status: CaseStatus
    operator_id: Optional[int] = None

class OperatorCaseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    client_notes: Optional[str]
    status: CaseStatus
    package_type: Optional[str] 
    package_price: Optional[float]
    created_at: datetime
    updated_at: datetime
    deadline: Optional[datetime]
    user_id: int
    operator_id: Optional[int]
    
    # Client info
    client_id: Optional[int]
    client_name: Optional[str]
    client_email: Optional[str]
    client_phone: Optional[str]
    
    # Related data
    documents: List[dict]
    analysis: Optional[AnalysisResponse]
    legal_documents: List[LegalDocumentResponse]
    
    class Config:
        from_attributes = True

# Using centralized require_operator from app.core.security

@router.get("/cases", response_model=List[OperatorCaseResponse])
async def get_operator_cases(
    status_filter: Optional[CaseStatus] = None,
    operator_id: Optional[int] = None,
    current_user: User = Depends(require_operator_or_admin_active),
    db: Session = Depends(get_db)
):
    """Get all cases for operator dashboard"""
    query = db.query(Case)
    
    if status_filter:
        query = query.filter(Case.status == status_filter)
    
    if operator_id:
        query = query.filter(Case.operator_id == operator_id)
    
    # Show cases that need operator attention
    cases = query.filter(
        Case.status.in_([
            CaseStatus.NEW,
            CaseStatus.AWAITING_PAYMENT,
            CaseStatus.PAID, 
            CaseStatus.PROCESSING, 
            CaseStatus.ANALYSIS_READY,
            CaseStatus.DOCUMENTS_READY
        ])
    ).all()
    
    # Transform cases to include client info
    result = []
    for case in cases:
        client = case.user
        case_dict = {
            **case.__dict__,
            "client_id": client.id if client else None,
            "client_name": f"{client.first_name or ''} {client.last_name or ''}".strip() or client.email,
            "client_email": client.email,
            "client_phone": client.phone,
            "documents": [
                {
                    "id": doc.id,
                    "filename": doc.filename,
                    "original_filename": doc.original_filename,
                    "file_type": doc.file_type,
                    "file_size": doc.file_size,
                    "uploaded_at": doc.uploaded_at
                } 
                for doc in case.documents
            ],
            "analysis": case.analysis,
            "legal_documents": case.legal_documents or []
        }
        result.append(OperatorCaseResponse(**case_dict))
    
    return result

@router.post("/clients", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
async def create_client(
    client: CreateClientRequest,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Create a new client (operator quick add)."""
    existing = db.query(User).filter(User.email == client.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    from app.services.auth_service import AuthService
    hashed = AuthService.get_password_hash(client.password) if client.password else AuthService.get_password_hash("Klient#123")
    new_user = User(
        email=client.email,
        first_name=client.first_name,
        last_name=client.last_name,
        phone=client.phone,
        hashed_password=hashed,
        role=UserRole.CLIENT,
        is_active=True,
        is_verified=False,
        created_at=datetime.utcnow(),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/cases/{case_id}", response_model=OperatorCaseResponse)
async def get_operator_case(
    case_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Get specific case details for operator"""
    case = db.query(Case).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    client = case.user
    case_dict = {
        **case.__dict__,
        "client_id": client.id if client else None,
        "client_name": f"{client.first_name or ''} {client.last_name or ''}".strip() or client.email,
        "client_email": client.email,
        "client_phone": client.phone,
        "documents": [
            {
                "id": doc.id,
                "filename": doc.filename,
                "original_filename": doc.original_filename,
                "file_type": doc.file_type,
                "file_size": doc.file_size,
                "uploaded_at": doc.uploaded_at
            } 
            for doc in case.documents
        ],
        "analysis": case.analysis,
        "legal_documents": case.legal_documents or []
    }
    
    return OperatorCaseResponse(**case_dict)

@router.post("/cases/{case_id}/analysis", response_model=AnalysisResponse)
async def create_analysis(
    case_id: int,
    analysis_data: AnalysisCreate,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Create analysis for a case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Check if analysis already exists
    existing_analysis = db.query(Analysis).filter(Analysis.case_id == case_id).first()
    if existing_analysis:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Analysis already exists for this case"
        )
    
    # Create analysis
    analysis = Analysis(
        case_id=case_id,
        content=analysis_data.content,
        summary=analysis_data.summary,
        recommendations=analysis_data.recommendations,
        possible_actions=analysis_data.possible_actions,
        confidence_score=analysis_data.confidence_score,
        is_preview=False,
        operator_id=current_user.id
    )
    
    db.add(analysis)
    
    # Update case status
    case.status = CaseStatus.ANALYSIS_READY
    case.operator_id = current_user.id
    case.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(analysis)
    
    # Send notification to client about analysis ready
    from app.services.notification_service import notification_service
    notification_service.send_analysis_ready(db, case)
    
    return analysis

@router.post("/cases/{case_id}/legal-documents", response_model=LegalDocumentResponse)
async def create_legal_document(
    case_id: int,
    document_data: LegalDocumentCreate,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Create legal document for a case"""
    case = db.query(Case).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Create legal document
    legal_doc = LegalDocument(
        case_id=case_id,
        document_name=document_data.document_name,
        document_type=document_data.document_type,
        content=document_data.content,
        price=document_data.price,
        is_purchased=False,
        is_preview=True,
        instructions=document_data.instructions,
        operator_id=current_user.id
    )
    
    db.add(legal_doc)
    
    # Update case status
    case.status = CaseStatus.DOCUMENTS_READY
    case.operator_id = current_user.id
    case.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(legal_doc)
    
    # Send notification to client about documents ready
    from app.services.notification_service import notification_service
    notification_service.send_documents_ready(db, case)
    
    return legal_doc

@router.put("/cases/{case_id}/status", response_model=dict)
async def update_case_status(
    case_id: int,
    status_data: CaseUpdateStatus,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Update case status"""
    case = db.query(Case).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    case.status = status_data.status
    if status_data.operator_id:
        case.operator_id = status_data.operator_id
    case.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Case status updated successfully", "status": case.status}

@router.post("/cases/{case_id}/assign", response_model=dict)
async def assign_case_to_operator(
    case_id: int,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Assign case to current operator"""
    case = db.query(Case).filter(Case.id == case_id).first()
    
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    case.operator_id = current_user.id
    case.status = CaseStatus.PROCESSING
    case.updated_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Case assigned successfully"}

@router.post("/cases/{case_id}/messages", response_model=dict)
async def send_client_message(
    case_id: int,
    message_content: str,
    to_admin: Optional[bool] = False,
    template_id: Optional[int] = None,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Send message to client or admin by creating an in-app notification."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    # Determine recipient
    if to_admin:
        recipient = db.query(User).filter(User.role == UserRole.ADMIN).first()
        if not recipient:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found")
        recipient_id = recipient.id
        subject = f"Wiadomość (admin) od {current_user.first_name or current_user.email}"
        case_ref = None
    else:
        recipient_id = case.user_id
        subject = f"Wiadomość dot. sprawy #{case.id}"
        case_ref = case.id

    # Optionally bump template usage_count
    if template_id:
        tmpl = db.query(MessageTemplate).filter(MessageTemplate.id == template_id).first()
        if tmpl:
            tmpl.usage_count = (tmpl.usage_count or 0) + 1
            tmpl.updated_at = datetime.utcnow()

    notif = Notification(
        user_id=recipient_id,
        case_id=case_ref,
        type=NotificationType.IN_APP,
        subject=subject,
        content=message_content,
        status=NotificationStatus.SENT,
        external_id=f"{current_user.id}:{(current_user.first_name or current_user.email or 'Operator')}:{current_user.role}"
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    return {"message": "Message sent successfully", "case_id": case_id, "sent_at": notif.created_at.isoformat()}

@router.get("/stats", response_model=dict)
async def get_operator_stats(
    days: int = 14,
    current_user: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Return counts per day for cases, analyses, and templates usage (approx by updated_at)."""
    if days < 1 or days > 60:
        days = 14

    now = datetime.utcnow()
    day_list = []
    cases_counts = []
    analyses_counts = []
    templates_counts = []
    payments_counts = []
    revenue_amounts = []

    for i in range(days - 1, -1, -1):
        day_start = datetime(now.year, now.month, now.day)
        delta = timedelta(days=i)
        start = day_start - delta
        end = start + timedelta(days=1)
        day_label = start.strftime("%Y-%m-%d")
        day_list.append(day_label)

        cases_counts.append(db.query(Case).filter(Case.created_at >= start, Case.created_at < end).count())
        analyses_counts.append(db.query(Analysis).filter(Analysis.created_at >= start, Analysis.created_at < end).count())
        templates_counts.append(db.query(MessageTemplate).filter(MessageTemplate.updated_at >= start, MessageTemplate.updated_at < end, (MessageTemplate.usage_count != None)).count())
        payments_counts.append(db.query(Payment).filter(Payment.status == PaymentStatus.PAID, Payment.paid_at >= start, Payment.paid_at < end).count())
        # revenue sum for the day
        day_sum = db.query(Payment).with_entities(Payment.amount).filter(Payment.status == PaymentStatus.PAID, Payment.paid_at >= start, Payment.paid_at < end).all()
        revenue_amounts.append(float(sum([p[0] for p in day_sum])) if day_sum else 0.0)

    return {
        "days": day_list,
        "cases_created": cases_counts,
        "analyses_created": analyses_counts,
        "templates_used": templates_counts,
        "payments_count": payments_counts,
        "revenue_amount": revenue_amounts,
    }


@router.post("/cases/{case_id}/analyze-ai", response_model=AnalysisResponse)  
def trigger_ai_analysis(
    case_id: int,
    operator: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Automatycznie wygeneruj analizę dokumentów sprawy za pomocą AI"""
    
    # Sprawdź czy sprawa istnieje
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    # Stwórz service AI i wygeneruj analizę
    ai_service = create_ai_document_service(db)
    
    try:
        # Service method is synchronous, don't await
        analysis = ai_service.analyze_case_documents(case_id, operator.id)
        
        if not analysis:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to generate analysis - no documents found or processing failed"
            )
        
        return analysis
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate AI analysis: {str(e)}"
        )


@router.get("/cases/{case_id}/documents-summary")
def get_case_documents_summary(
    case_id: int,
    operator: User = Depends(require_operator),
    db: Session = Depends(get_db)
):
    """Pobierz podsumowanie dokumentów sprawy"""
    
    # Sprawdź czy sprawa istnieje
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )
    
    ai_service = create_ai_document_service(db)
    summary = ai_service.get_case_documents_summary(case_id)
    
    return {
        "case_id": case_id,
        "summary": summary,
        "generated_at": datetime.utcnow().isoformat()
    }