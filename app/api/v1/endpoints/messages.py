from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import List, Optional
from datetime import datetime
import logging

from app.db.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.case import Case
from app.models.notification import Notification, NotificationType, NotificationStatus
from app.services.notification_service import notification_service
from pydantic import BaseModel

router = APIRouter()
logger = logging.getLogger(__name__)


class MessageCreate(BaseModel):
    recipient_id: int
    content: str
    case_id: Optional[int] = None


class MessageResponse(BaseModel):
    id: int
    content: str
    sender_id: int
    sender_name: str
    sender_role: str
    recipient_id: int
    case_id: Optional[int]
    created_at: datetime
    read_at: Optional[datetime]


class ConversationResponse(BaseModel):
    id: str
    participant_id: int
    participant_name: str
    participant_role: str
    case_id: Optional[int]
    case_title: Optional[str]
    last_message: str
    last_message_at: datetime
    unread_count: int
    is_read: bool

class ConversationsList(BaseModel):
    conversations: List[ConversationResponse]

class MessagesList(BaseModel):
    messages: List[MessageResponse]

# Recipients listing (operators and admins)
class Recipient(BaseModel):
    id: int
    name: str
    role: str

class RecipientsList(BaseModel):
    recipients: List[Recipient]

@router.get("/recipients", response_model=RecipientsList)
async def get_message_recipients(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List available message recipients (operators and admins)."""
    # user.role may be enum or string; normalize
    try:
        from app.models.user import UserRole  # enum if present
        # Prefer enum-based filter when available
        users = db.query(User).filter(User.role.in_([UserRole.OPERATOR, UserRole.ADMIN])).all()
    except Exception:
        # Fallback: case-insensitive string comparison
        from sqlalchemy import func
        users = db.query(User).filter(func.upper(User.role).in_(["OPERATOR", "ADMIN"])) .all()
    out: List[dict] = []
    for u in users:
        full_name = f"{u.first_name or ''} {u.last_name or ''}".strip() or (u.email or f"Użytkownik {u.id}")
        role = u.role if isinstance(u.role, str) else getattr(u.role, 'value', str(u.role))
        out.append({"id": u.id, "name": full_name, "role": role})
    return {"recipients": out}


@router.post("/send", response_model=dict)
async def send_message(message_data: MessageCreate,
                       current_user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Send a direct message to another user"""

    # Verify recipient exists
    recipient = db.query(User).filter(
        User.id == message_data.recipient_id).first()
    if not recipient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Recipient not found")

    # Check if case exists (if specified)
    case = None
    if message_data.case_id:
        case = db.query(Case).filter(Case.id == message_data.case_id).first()
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Case not found")

        # Verify user has access to this case
        if (current_user.role == "client" and case.user_id != current_user.id) or \
           (current_user.role == "operator" and case.operator_id != current_user.id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Access denied to this case")

    try:
        # Create message as in-app notification
        message = Notification(
            user_id=message_data.recipient_id,
            case_id=message_data.case_id,
            type=NotificationType.IN_APP,
            subject=f"Wiadomość od {current_user.name}",
            content=message_data.content,
            status=NotificationStatus.SENT,
            # Store sender info in external_id field as JSON
            external_id=
            f"{current_user.id}:{current_user.name}:{current_user.role}")

        db.add(message)
        db.commit()
        db.refresh(message)

        # Send notification to recipient (optional SMS/email)
        if recipient.phone:
            try:
                await notification_service.send_sms_notification(
                    recipient.phone,
                    f"Nowa wiadomość od {current_user.name}: {message_data.content[:100]}{'...' if len(message_data.content) > 100 else ''}",
                    message.id)
            except Exception as e:
                logger.warning(f"Failed to send SMS notification: {e}")

        logger.info(
            f"Message sent from user {current_user.id} to user {message_data.recipient_id}"
        )

        return {
            "message": "Message sent successfully",
            "message_id": message.id,
            "sent_at": message.created_at.isoformat()
        }

    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to send message")


@router.get("/conversations", response_model=ConversationsList)
async def get_conversations(current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Get list of conversations for current user"""

    try:
        # Get all messages involving current user (sent or received)
        messages = db.query(Notification).filter(
            and_(
                Notification.type == NotificationType.IN_APP,
                or_(Notification.user_id == current_user.id,
                    Notification.external_id.like(
                        f"{current_user.id}:%")))).order_by(
                            desc(Notification.created_at)).all()

        # Group by conversation partner
        conversations = {}

        for message in messages:
            # Parse sender info from external_id
            if message.external_id and ":" in message.external_id:
                sender_parts = message.external_id.split(":")
                sender_id = int(sender_parts[0])
                sender_name = sender_parts[1]
                sender_role = sender_parts[2] if len(
                    sender_parts) > 2 else "user"
            else:
                # Message sent TO current user
                sender_id = None
                sender_name = "System"
                sender_role = "system"

            # Determine conversation partner
            if message.user_id == current_user.id:
                # Message received by current user
                partner_id = sender_id
                partner_name = sender_name
                partner_role = sender_role
                is_unread = message.read_at is None
            else:
                # Message sent by current user
                partner_id = message.user_id
                partner = db.query(User).filter(User.id == partner_id).first()
                partner_name = partner.name if partner else "Unknown"
                partner_role = partner.role if partner else "user"
                is_unread = False  # Own messages are always "read"

            if not partner_id:
                continue

            conversation_key = f"{partner_id}_{message.case_id or 0}"

            if conversation_key not in conversations:
                # Get case info if applicable
                case_title = None
                if message.case_id:
                    case = db.query(Case).filter(
                        Case.id == message.case_id).first()
                    case_title = case.title if case else f"Sprawa #{message.case_id}"

                conversations[conversation_key] = {
                    "id": conversation_key,
                    "participant_id": partner_id,
                    "participant_name": partner_name,
                    "participant_role": partner_role,
                    "case_id": message.case_id,
                    "case_title": case_title,
                    "last_message": message.content,
                    "last_message_at": message.created_at,
                    "unread_count": 1 if is_unread else 0,
                    "is_read": not is_unread
                }
            else:
                # Update unread count
                if is_unread:
                    conversations[conversation_key]["unread_count"] += 1

                # Keep the most recent message
                if message.created_at > conversations[conversation_key][
                        "last_message_at"]:
                    conversations[conversation_key][
                        "last_message"] = message.content
                    conversations[conversation_key][
                        "last_message_at"] = message.created_at

        # Convert to list and sort by last message time
        conversation_list = list(conversations.values())
        conversation_list.sort(key=lambda x: x["last_message_at"],
                               reverse=True)

        return {"conversations": conversation_list}

    except Exception as e:
        logger.error(f"Error getting conversations: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to load conversations")


@router.get("/case/{case_id}", response_model=MessagesList)
async def get_case_messages(case_id: int,
                            current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Get all messages for a specific case"""

    # Verify case exists and user has access
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Case not found")

    if (current_user.role == "client" and case.user_id != current_user.id) or \
       (current_user.role == "operator" and case.operator_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Access denied to this case")

    try:
        # Get all messages for this case
        messages = db.query(Notification).filter(
            and_(Notification.case_id == case_id,
                 Notification.type == NotificationType.IN_APP)).order_by(
                     Notification.created_at).all()

        message_list = []
        for message in messages:
            # Parse sender info
            if message.external_id and ":" in message.external_id:
                sender_parts = message.external_id.split(":")
                sender_id = int(sender_parts[0])
                sender_name = sender_parts[1]
                sender_role = sender_parts[2] if len(
                    sender_parts) > 2 else "user"
            else:
                sender_id = None
                sender_name = "System"
                sender_role = "system"

            message_list.append({
                "id": message.id,
                "content": message.content,
                "sender_id": sender_id or 0,
                "sender_name": sender_name,
                "sender_role": sender_role,
                "recipient_id": message.user_id,
                "case_id": message.case_id,
                "created_at": message.created_at,
                "read_at": message.read_at
            })

        return {"messages": message_list}

    except Exception as e:
        logger.error(f"Error getting case messages: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to load case messages")


@router.get("/conversation/{user_id}", response_model=MessagesList)
async def get_conversation_messages(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)):
    """Get all messages in conversation with specific user"""

    # Verify other user exists
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="User not found")

    try:
        # Get all messages between these two users
        messages = db.query(Notification).filter(
            and_(
                Notification.type == NotificationType.IN_APP,
                or_(
                    and_(Notification.user_id == current_user.id,
                         Notification.external_id.like(f"{user_id}:%")),
                    and_(Notification.user_id == user_id,
                         Notification.external_id.like(
                             f"{current_user.id}:%"))))).order_by(
                                 Notification.created_at).all()

        message_list = []
        for message in messages:
            # Parse sender info
            if message.external_id and ":" in message.external_id:
                sender_parts = message.external_id.split(":")
                sender_id = int(sender_parts[0])
                sender_name = sender_parts[1]
                sender_role = sender_parts[2] if len(
                    sender_parts) > 2 else "user"
            else:
                sender_id = None
                sender_name = "System"
                sender_role = "system"

            message_list.append({
                "id": message.id,
                "content": message.content,
                "sender_id": sender_id or 0,
                "sender_name": sender_name,
                "sender_role": sender_role,
                "recipient_id": message.user_id,
                "case_id": message.case_id,
                "created_at": message.created_at,
                "read_at": message.read_at
            })

        return {"messages": message_list}

    except Exception as e:
        logger.error(f"Error getting conversation messages: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail="Failed to load conversation messages")


@router.post("/mark-read/{message_id}", response_model=dict)
async def mark_message_read(message_id: int,
                            current_user: User = Depends(get_current_user),
                            db: Session = Depends(get_db)):
    """Mark a message as read"""

    message = db.query(Notification).filter(
        and_(Notification.id == message_id,
             Notification.user_id == current_user.id,
             Notification.type == NotificationType.IN_APP)).first()

    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                            detail="Message not found")

    if not message.read_at:
        message.read_at = datetime.utcnow()
        db.commit()

    return {"message": "Message marked as read"}


@router.delete("/message/{message_id}", response_model=dict)
async def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a single in-app message if the user has access to its case or is the recipient/sender."""
    msg = db.query(Notification).filter(Notification.id == message_id, Notification.type == NotificationType.IN_APP).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Authorization: admin can delete anything; otherwise user must be related
    authorized = False
    if current_user.role == 'admin':
        authorized = True
    else:
        # If message relates to case ensure user is owner or operator
        if msg.case_id:
            case = db.query(Case).filter(Case.id == msg.case_id).first()
            if case and ((current_user.role == 'client' and case.user_id == current_user.id) or (current_user.role == 'operator' and case.operator_id == current_user.id)):
                authorized = True
        # Or if recipient is current user
        if msg.user_id == current_user.id:
            authorized = True
        # Or if sender matches external_id first token
        if msg.external_id and msg.external_id.split(":")[0].isdigit():
            if int(msg.external_id.split(":")[0]) == current_user.id:
                authorized = True

    if not authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this message")

    db.delete(msg)
    db.commit()
    return {"message": "Message deleted"}


@router.post("/message/{message_id}/archive", response_model=dict)
async def archive_message(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Archive a message by marking it as READ (soft-archive)."""
    msg = db.query(Notification).filter(Notification.id == message_id, Notification.type == NotificationType.IN_APP).first()
    if not msg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")

    # Same authorization policy as delete
    authorized = False
    if current_user.role == 'admin':
        authorized = True
    else:
        if msg.case_id:
            case = db.query(Case).filter(Case.id == msg.case_id).first()
            if case and ((current_user.role == 'client' and case.user_id == current_user.id) or (current_user.role == 'operator' and case.operator_id == current_user.id)):
                authorized = True
        if msg.user_id == current_user.id:
            authorized = True
        if msg.external_id and msg.external_id.split(":")[0].isdigit():
            if int(msg.external_id.split(":")[0]) == current_user.id:
                authorized = True

    if not authorized:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to archive this message")

    if not msg.read_at:
        msg.read_at = datetime.utcnow()
    msg.status = NotificationStatus.READ
    db.commit()
    return {"message": "Message archived"}


@router.get("/export/case/{case_id}.txt")
async def export_case_messages_txt(
    case_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export all case messages as a plain text stream."""
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")

    if (current_user.role == "client" and case.user_id != current_user.id) or \
       (current_user.role == "operator" and case.operator_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this case")

    messages = db.query(Notification).filter(
        and_(Notification.case_id == case_id, Notification.type == NotificationType.IN_APP)
    ).order_by(Notification.created_at).all()

    def as_sender(msg: Notification):
        if msg.external_id and ":" in msg.external_id:
            return msg.external_id.split(":")[1]
        return "System"

    lines = []
    for m in messages:
        lines.append(f"{m.created_at.isoformat()} [{as_sender(m)}]\n{m.content}\n")

    from fastapi.responses import PlainTextResponse
    return PlainTextResponse("\n".join(lines), media_type="text/plain")
