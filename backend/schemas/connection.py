from pydantic import BaseModel
from models.connection import ConnectionStatus
from schemas.user import UserResponse

class ConnectionResponse(BaseModel):
    id: str
    requester: UserResponse
    receiver: UserResponse
    status: ConnectionStatus
    
    class Config:
        from_attributes = True
