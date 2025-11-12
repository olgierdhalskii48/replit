from typing import List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_verified_user
from app.models.user import User, UserRole
from app.models.case import Case, Document
from app.services.document_service import DocumentService
from app.schemas.document import DocumentUploadResponse, DocumentResponse, FileUploadLimits
from app.services.storage_service import SpacesStorageService
from pydantic import BaseModel
import uuid

router = APIRouter()

@router.post("/upload/{case_id}", response_model=DocumentUploadResponse)
async def upload_documents(
    case_id: int,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """
    Upload documents for a specific case.
    
    - **case_id**: ID sprawy do której przypisać dokumenty
    - **files**: Lista plików do uploadu (max 10 plików, 50MB każdy)
    
    Dozwolone formaty: PDF, JPG, JPEG, PNG, DOC, DOCX
    """
    
    # Verify case belongs to user
    case = db.query(Case).filter(
        Case.id == case_id, 
        Case.user_id == current_user.id
    ).first()
    
    if not case:
        raise HTTPException(
            status_code=404, 
            detail="Sprawa nie została znaleziona lub nie masz do niej uprawnień"
        )
    
    # Pre-validate against per-case file count to avoid partial uploads exceeding the limit
    from app.core.config import get_settings
    settings = get_settings()
    existing_count = db.query(Document).filter(Document.case_id == case_id).count()
    remaining = settings.MAX_FILES_PER_CASE - existing_count
    if remaining <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Osiągnięto maksymalną liczbę plików ({settings.MAX_FILES_PER_CASE}) dla tej sprawy",
        )
    if len(files) > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Możesz dodać maksymalnie {remaining} plików dla tej sprawy (limit {settings.MAX_FILES_PER_CASE})",
        )

    # Initialize document service
    document_service = DocumentService(db)
    
    # Upload files
    documents, errors = document_service.upload_files(files, case_id)
    
    return DocumentUploadResponse(
        success=len(documents) > 0,
        message=f"Pomyślnie przesłano {len(documents)} plików" if documents else "Nie udało się przesłać żadnego pliku",
        documents=documents,
        errors=errors
    )

@router.get("/case/{case_id}", response_model=List[DocumentResponse])
async def get_case_documents(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """
    Pobierz wszystkie dokumenty dla danej sprawy
    """
    
    # Verify case belongs to user or user is operator/admin
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Sprawa nie została znaleziona")
    
    # Check permissions
    if case.user_id != current_user.id and current_user.role not in [UserRole.OPERATOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=403, 
            detail="Nie masz uprawnień do przeglądania dokumentów tej sprawy"
        )
    
    # Get documents
    document_service = DocumentService(db)
    return document_service.get_case_documents(case_id)

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user)
):
    """
    Usuń dokument (dostępne tylko dla właściciela sprawy)
    """
    
    # Allow owner or OPERATOR/ADMIN to delete
    document_service = DocumentService(db)
    success = False
    if current_user.role in [UserRole.OPERATOR, UserRole.ADMIN]:
        success = document_service.delete_document_any(document_id)
    else:
        success = document_service.delete_document(document_id, current_user.id)

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Dokument nie został znaleziony lub nie masz uprawnień do jego usunięcia",
        )

    return {"message": "Dokument został usunięty"}

@router.get("/limits", response_model=FileUploadLimits)
async def get_upload_limits():
    """
    Pobierz limity dla uploadu plików
    """
    from app.core.config import get_settings
    settings = get_settings()
    return FileUploadLimits(
        max_file_size_mb=settings.UPLOAD_MAX_MB,
        max_files_per_case=settings.MAX_FILES_PER_CASE,
        allowed_file_types=settings.allowed_file_types_list,
    )


@router.get("/{document_id}/presigned")
async def get_document_presigned_url(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """Zwraca tymczasowy URL do podglądu/pobrania pliku ze Spaces."""
    from app.models.case import Document as DocumentModel

    doc = db.query(DocumentModel).filter(DocumentModel.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Dokument nie został znaleziony")

    # Check permissions: owner or operator/admin
    if doc.case_id:
        case = db.query(Case).filter(Case.id == doc.case_id).first()
        if not case:
            raise HTTPException(status_code=404, detail="Sprawa nie została znaleziona")
        if case.user_id != current_user.id and current_user.role not in [UserRole.OPERATOR, UserRole.ADMIN]:
            raise HTTPException(status_code=403, detail="Brak uprawnień")

    # If file_path is a Spaces key, generate presigned GET
    try:
        storage = SpacesStorageService()
        if not storage:
            raise RuntimeError("Storage client is not configured")
        url = storage.generate_presigned_get(key=doc.file_path)
        return {"url": url}
    except (RuntimeError, AttributeError) as e:
        # Likely missing SPACES_* env configuration
        raise HTTPException(status_code=503, detail=f"Storage not configured: {e}")


# ===== Presigned upload flow (DigitalOcean Spaces / S3-compatible) =====

class PresignRequest(BaseModel):
    filename: str
    content_type: str | None = None


class PresignResponse(BaseModel):
    url: str
    fields: dict
    bucket: str
    key: str


@router.post("/presign/{case_id}", response_model=PresignResponse)
async def presign_upload(
    case_id: int,
    payload: PresignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """Generate presigned POST policy for direct browser upload to Spaces.
    The client should POST the file to `url` with form fields from `fields`.
    Saved key is returned to be used in confirmation step.
    """
    # Check ownership
    case = db.query(Case).filter(Case.id == case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Sprawa nie została znaleziona lub brak uprawnień")

    # Validate remaining capacity and file type at presign time (best-effort)
    from app.core.config import get_settings
    settings = get_settings()
    existing_count = db.query(Document).filter(Document.case_id == case_id).count()
    remaining = settings.MAX_FILES_PER_CASE - existing_count
    if remaining <= 0:
        raise HTTPException(status_code=400, detail=f"Osiągnięto maksymalną liczbę plików ({settings.MAX_FILES_PER_CASE}) dla tej sprawy")

    # Validate extension
    ext_check = payload.filename.split(".")[-1].lower() if "." in payload.filename else ""
    if ext_check not in settings.allowed_file_types_list:
        raise HTTPException(status_code=400, detail=f"Nieprawidłowe rozszerzenie '{ext_check}'. Dozwolone: {', '.join(settings.allowed_file_types_list)}")

    # Build object key path (namespaced by case)
    ext = payload.filename.split(".")[-1] if "." in payload.filename else "bin"
    object_key = f"uploads/case_{case_id}/{uuid.uuid4()}.{ext}"

    try:
        storage = SpacesStorageService()
        if not storage:
            raise RuntimeError("Storage client is not configured")
        from app.core.config import get_settings as _gs
        _s = _gs()
        max_size_bytes = _s.UPLOAD_MAX_MB * 1024 * 1024
        post = storage.generate_presigned_post(
            key=object_key,
            content_type=payload.content_type,
            max_size_bytes=max_size_bytes,
            expires_in=3600,
            acl="private",
        )
    except Exception as e:
        # Map any presign/storage errors to 503 as tests expect when Spaces isn't configured
        raise HTTPException(status_code=503, detail=f"Storage not configured: {e}")

    return PresignResponse(url=post["url"], fields=post["fields"], bucket=post["bucket"], key=post["key"])


class ConfirmUploadRequest(BaseModel):
    case_id: int
    key: str
    original_filename: str
    content_type: str | None = None
    file_size: int | None = None


@router.post("/confirm", response_model=DocumentResponse)
async def confirm_uploaded_document(
    body: ConfirmUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_verified_user),
):
    """Confirm previously uploaded file (via presigned URL) and create DB record."""
    # Check ownership
    case = db.query(Case).filter(Case.id == body.case_id, Case.user_id == current_user.id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Sprawa nie została znaleziona lub brak uprawnień")

    # Enforce per-case limits and file type before creating DB record
    from app.core.config import get_settings
    settings = get_settings()
    existing_count = db.query(Document).filter(Document.case_id == body.case_id).count()
    if existing_count >= settings.MAX_FILES_PER_CASE:
        raise HTTPException(status_code=400, detail=f"Osiągnięto maksymalną liczbę plików ({settings.MAX_FILES_PER_CASE}) dla tej sprawy")

    # Create DB record (file_path stores Spaces key)
    from app.schemas.document import DocumentType
    doc_service = DocumentService(db)

    # Guess document type
    ext = body.original_filename.lower().split(".")[-1] if "." in body.original_filename else ""
    if ext and ext not in settings.allowed_file_types_list:
        raise HTTPException(status_code=400, detail=f"Nieprawidłowe rozszerzenie '{ext}'. Dozwolone: {', '.join(settings.allowed_file_types_list)}")
    if ext == "pdf":
        doc_type = DocumentType.PDF
    elif ext in ("jpg", "jpeg", "png"):
        doc_type = DocumentType.PHOTO
    elif ext in ("doc", "docx"):
        doc_type = DocumentType.WORD
    else:
        doc_type = DocumentType.OTHER

    from app.models.case import Document
    document = Document(
        case_id=body.case_id,
        filename=str(uuid.uuid4()),
        original_filename=body.original_filename,
        file_type=body.content_type or "application/octet-stream",
        file_size=body.file_size or 0,
        file_path=body.key,  # store Spaces key
        document_type=doc_type,
        is_processed=False,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    return DocumentResponse.model_validate(document, from_attributes=True)