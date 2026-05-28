from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from models.message import MessageStatus
from schemas.reaction import ReactionResponse

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class MessageResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    content: str
    timestamp: datetime
    status: MessageStatus
    is_edited: bool
    is_deleted: bool
    reply_to_id: Optional[str] = None
    reactions: List[ReactionResponse] = []
    
    class Config:
        from_attributes = True
