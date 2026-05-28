from pydantic import BaseModel
from datetime import datetime

class ReactionCreate(BaseModel):
    emoji: str

class ReactionResponse(BaseModel):
    id: str
    message_id: str
    user_id: str
    emoji: str
    timestamp: datetime
    
    class Config:
        from_attributes = True
