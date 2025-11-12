from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

from app.db.database import Base


class RecipientType(enum.Enum):
    CLIENT = "client"
    ADMIN = "admin"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"), index=True)
    sender_user_id = Column(Integer, ForeignKey("users.id"), index=True)
    recipient_type = Column(Enum(RecipientType), default=RecipientType.CLIENT)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    case = relationship("Case")
    sender = relationship("User")
