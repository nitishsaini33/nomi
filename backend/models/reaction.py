from sqlalchemy import Column, String, ForeignKey, DateTime
from core.database import Base
import uuid
from datetime import datetime, timezone

class Reaction(Base):
    __tablename__ = "reactions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    message_id = Column(String, ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    emoji = Column(String, nullable=False)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
