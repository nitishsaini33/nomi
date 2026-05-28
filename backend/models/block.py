from sqlalchemy import Column, String, ForeignKey, DateTime
from core.database import Base
import uuid
from datetime import datetime, timezone

class Block(Base):
    __tablename__ = "blocks"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    blocker_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    blocked_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
