from sqlalchemy import Column, String, ForeignKey, Enum, Index
from sqlalchemy.orm import relationship
from core.database import Base
import uuid
import enum

class ConnectionStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"

class Connection(Base):
    __tablename__ = "connections"
    __table_args__ = (
        # Covers: WHERE (requester_id=X AND receiver_id=Y) OR reverse — used by send_request, unfriend
        Index("ix_connections_requester_receiver", "requester_id", "receiver_id"),
        # Covers: WHERE receiver_id=X AND status='PENDING' — used by get_requests
        Index("ix_connections_receiver_status", "receiver_id", "status"),
    )
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    requester_id = Column(String, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ConnectionStatus), default=ConnectionStatus.PENDING, nullable=False)

    requester = relationship("User", foreign_keys=[requester_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
