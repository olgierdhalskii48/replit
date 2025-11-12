from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from typing import List
from sqlalchemy.orm import Session
from app.api.v1.schemas.kancelaria import KancelariaCreate, KancelariaUpdate, KancelariaInDB
from app.db.database import get_db
from app.models.kancelaria import Kancelaria
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/", response_model=KancelariaInDB)
async def create_kancelaria(
    kancelaria: KancelariaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db_kancelaria = Kancelaria(**kancelaria.model_dump())
    db.add(db_kancelaria)
    db.commit()
    db.refresh(db_kancelaria)
    return db_kancelaria

@router.get("/", response_model=List[KancelariaInDB])
async def read_kancelarie(db: Session = Depends(get_db)):
    return db.query(Kancelaria).all()

@router.get("/{kancelaria_id}", response_model=KancelariaInDB)
async def read_kancelaria(kancelaria_id: int, db: Session = Depends(get_db)):
    kancelaria = db.query(Kancelaria).filter(Kancelaria.id == kancelaria_id).first()
    if kancelaria is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Kancelaria not found"})
    return kancelaria

@router.put("/{kancelaria_id}", response_model=KancelariaInDB)
async def update_kancelaria(kancelaria_id: int, kancelaria_update: KancelariaUpdate, db: Session = Depends(get_db)):
    db_kancelaria = db.query(Kancelaria).filter(Kancelaria.id == kancelaria_id).first()
    if db_kancelaria is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Kancelaria not found"})
    
    for key, value in kancelaria_update.model_dump(exclude_unset=True).items():
        setattr(db_kancelaria, key, value)
    
    db.commit()
    db.refresh(db_kancelaria)
    return db_kancelaria

@router.delete("/{kancelaria_id}")
async def delete_kancelaria(kancelaria_id: int, db: Session = Depends(get_db)):
    db_kancelaria = db.query(Kancelaria).filter(Kancelaria.id == kancelaria_id).first()
    if db_kancelaria is None:
        return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content={"detail": "Kancelaria not found"})
    
    db.delete(db_kancelaria)
    db.commit()
    return {"message": "Kancelaria deleted successfully"}