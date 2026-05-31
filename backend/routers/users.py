from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import delete
from typing import List

from core.database import get_db
from models.user import User
from models.connection import Connection, ConnectionStatus
from models.message import Message
from schemas.user import UserResponse
from schemas.connection import ConnectionResponse
from services.auth_service import get_current_user
from services.websocket_manager import manager
from models.reaction import Reaction
from models.block import Block

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=List[UserResponse])
async def search_users(query: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(User)
        .where(User.username.ilike(f"%{query}%"))
        .where(User.id != current_user.id)
        .limit(20)
    )
    return result.scalars().all()

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/request/{receiver_id}")
async def send_request(receiver_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send request to yourself")
        
    existing = await db.execute(
        select(Connection).where(
            ((Connection.requester_id == current_user.id) & (Connection.receiver_id == receiver_id)) |
            ((Connection.requester_id == receiver_id) & (Connection.receiver_id == current_user.id))
        )
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Connection already exists")
        
    new_conn = Connection(requester_id=current_user.id, receiver_id=receiver_id, status=ConnectionStatus.PENDING)
    db.add(new_conn)
    await db.commit()
    return {"message": "Request sent"}

@router.get("/requests", response_model=List[ConnectionResponse])
async def get_requests(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Connection).options(selectinload(Connection.requester), selectinload(Connection.receiver)).where(
            (Connection.receiver_id == current_user.id) & (Connection.status == ConnectionStatus.PENDING)
        )
    )
    return result.scalars().all()

@router.get("/friends", response_model=List[UserResponse])
async def get_friends(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Connection).options(selectinload(Connection.requester), selectinload(Connection.receiver)).where(
            ((Connection.requester_id == current_user.id) | (Connection.receiver_id == current_user.id)) & 
            (Connection.status == ConnectionStatus.ACCEPTED)
        )
    )
    connections = result.scalars().all()
    friends = []
    for conn in connections:
        if conn.requester_id == current_user.id:
            friends.append(conn.receiver)
        else:
            friends.append(conn.requester)
    return friends

@router.put("/request/{connection_id}/accept")
async def accept_request(connection_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Connection).where(Connection.id == connection_id, Connection.receiver_id == current_user.id))
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Request not found")
        
    conn.status = ConnectionStatus.ACCEPTED
    await db.commit()
    
    # Notify the original requester via websocket
    await manager.send_personal_message(
        {"type": "friend_request_accepted", "payload": {"friend_id": current_user.id}},
        conn.requester_id
    )
    
    return {"message": "Request accepted"}

@router.delete("/friends/{friend_id}")
async def unfriend_user(friend_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Delete Connection
    result = await db.execute(
        select(Connection).where(
            ((Connection.requester_id == current_user.id) & (Connection.receiver_id == friend_id)) |
            ((Connection.requester_id == friend_id) & (Connection.receiver_id == current_user.id))
        )
    )
    conn = result.scalars().first()
    if not conn:
        raise HTTPException(status_code=404, detail="Friendship not found")
        
    await db.delete(conn)
    
    # Delete all messages between them
    # SQLAlchemy 2.0 delete syntax for async

    await db.execute(
        delete(Message).where(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == friend_id)) |
            ((Message.sender_id == friend_id) & (Message.receiver_id == current_user.id))
        )
    )
    
    await db.commit()
    
    # Notify the other user via websocket
    await manager.send_personal_message(
        {"type": "user_unfriended", "payload": {"friend_id": current_user.id}},
        friend_id
    )
    
    return {"message": "Unfriended successfully and all chat data deleted"}

@router.delete("/me")
async def delete_my_account(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):

    uid = current_user.id
    
    # Manually delete dependent records to bypass FK cascade restrictions
    # 1. Reactions
    await db.execute(delete(Reaction).where(Reaction.user_id == uid))
    
    # 2. Blocks
    await db.execute(delete(Block).where((Block.blocker_id == uid) | (Block.blocked_id == uid)))
    
    # 3. Connections (friendships/requests)
    await db.execute(delete(Connection).where((Connection.requester_id == uid) | (Connection.receiver_id == uid)))
    
    # 4. Messages
    await db.execute(delete(Message).where((Message.sender_id == uid) | (Message.receiver_id == uid)))
    
    # 5. Finally, the user
    await db.execute(delete(User).where(User.id == uid))
    
    await db.commit()
    
    # Tell EVERYONE globally that this user is deleted so they can scrub them from local states
    await manager.broadcast({"type": "user_deleted", "payload": {"user_id": uid}})
    
    return {"message": "Account deleted successfully"}
