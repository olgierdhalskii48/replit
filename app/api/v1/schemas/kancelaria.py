from pydantic import BaseModel, Field
from typing import Optional

class KancelariaBase(BaseModel):
    name: str = Field(..., example="Law Firm A")
    location: Optional[str] = Field(None, example="Warsaw, Poland")
    specialization: Optional[str] = Field(None, example="Criminal Law")

class KancelariaCreate(KancelariaBase):
    owner_id: Optional[int] = Field(None, example=1)

class KancelariaUpdate(KancelariaBase):
    name: Optional[str] = None
    location: Optional[str] = None
    specialization: Optional[str] = None

class KancelariaInDB(KancelariaBase):
    id: int = Field(..., example=1)
    owner_id: Optional[int] = Field(None, example=1)

    class Config:
        from_attributes = True