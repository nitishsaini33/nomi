from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean, Enum
from core.database import Base
import uuid
import enum
from datetime import datetime, timezone
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

class MessageStatus(str, enum.Enum):
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    READ = "READ"

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    sender_id = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    status = Column(String, default=MessageStatus.SENT)
    is_edited = Column(Boolean, default=False)
    is_deleted = Column(Boolean, default=False)
    reply_to_id = Column(String, ForeignKey("messages.id"), nullable=True)
    
    reactions = relationship("Reaction", cascade="all, delete-orphan")

