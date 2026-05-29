from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List

from core.database import get_db
from models.user import User
from models.message import Message
from models.reaction import Reaction
from schemas.message import MessageResponse
from schemas.reaction import ReactionCreate, ReactionResponse
from services.auth_service import get_current_user
from services.websocket_manager import manager
from fastapi import HTTPException

router = APIRouter(prefix="/chat", tags=["chat"])


@router.get("/previews")
async def get_conversation_previews(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns {friend_id, last_timestamp} for every conversation the current
    user has participated in — one entry per friend, sorted most-recent first.
    Used by the sidebar to sort the friends list on initial load.
    """
    uid = current_user.id

    result = await db.execute(
        select(Message.sender_id, Message.receiver_id, Message.timestamp)
        .where(
            (Message.sender_id == uid) | (Message.receiver_id == uid)
        )
        .order_by(Message.timestamp.desc())
    )

    previews: dict[str, str] = {}
    for row in result.all():
        friend_id = row.receiver_id if row.sender_id == uid else row.sender_id
        if friend_id not in previews:          # keep only the latest per friend
            previews[friend_id] = row.timestamp.isoformat()

    return [
        {"friend_id": fid, "last_timestamp": ts}
        for fid, ts in previews.items()
    ]


@router.get("/{other_user_id}", response_model=List[MessageResponse])
async def get_chat_history(
    other_user_id: str,
    cursor: str = None,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Message).options(selectinload(Message.reactions)).where(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == current_user.id))
    )
    
    if cursor:
        from dateutil import parser
        cursor_date = parser.parse(cursor)
        query = query.where(Message.timestamp < cursor_date)
        
    # Order descending to get newest messages first before the cursor
    query = query.order_by(Message.timestamp.desc()).limit(limit)
    
    result = await db.execute(query)
    messages = result.scalars().all()
    
    # Reverse to return in chronological order for the frontend
    messages.reverse()
    return messages

@router.put("/message/{message_id}")
async def edit_message(
    message_id: str,
    new_content: dict, # {"content": "..."}
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    msg.content = new_content.get("content", msg.content)
    msg.is_edited = True
    await db.commit()
    
    # Broadcast edit
    payload = {"message_id": msg.id, "content": msg.content, "is_edited": True}
    await manager.send_personal_message({"type": "message_edit", "payload": payload}, msg.receiver_id)
    return {"message": "Edited successfully"}

@router.delete("/message/{message_id}")
async def delete_message(
    message_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Enforce 5-minute deletion window
    from datetime import datetime, timezone, timedelta
    msg_age = datetime.now(timezone.utc) - msg.timestamp.replace(tzinfo=timezone.utc)
    if msg_age > timedelta(minutes=5):
        raise HTTPException(status_code=403, detail="Messages can only be deleted within 5 minutes of sending")
        
    msg.is_deleted = True
    msg.content = "This message was deleted"
    await db.commit()
    
    # Broadcast delete
    payload = {
        "message_id": msg.id, 
        "sender_id": msg.sender_id,
        "receiver_id": msg.receiver_id,
        "is_deleted": True,
        "content": "This message was deleted"
    }
    await manager.send_personal_message({"type": "message_delete", "payload": payload}, msg.receiver_id)
    return {"message": "Deleted successfully", "payload": payload}

@router.post("/message/{message_id}/react", response_model=ReactionResponse)
async def react_to_message(
    message_id: str,
    reaction_in: ReactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Check if message exists
    result = await db.execute(select(Message).where(Message.id == message_id))
    msg = result.scalars().first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
        
    # Upsert reaction
    result = await db.execute(
        select(Reaction).where((Reaction.message_id == message_id) & (Reaction.user_id == current_user.id))
    )
    existing_reaction = result.scalars().first()
    
    if existing_reaction:
        existing_reaction.emoji = reaction_in.emoji
        db.add(existing_reaction)
        reaction_obj = existing_reaction
    else:
        new_reaction = Reaction(message_id=message_id, user_id=current_user.id, emoji=reaction_in.emoji)
        db.add(new_reaction)
        reaction_obj = new_reaction
        
    await db.commit()
    await db.refresh(reaction_obj)
    
    # Determine who to broadcast to
    notify_id = msg.sender_id if msg.sender_id != current_user.id else msg.receiver_id
    
    # Broadcast reaction
    payload = {
        "id": reaction_obj.id,
        "message_id": reaction_obj.message_id,
        "user_id": reaction_obj.user_id,
        "emoji": reaction_obj.emoji,
        "timestamp": reaction_obj.timestamp.isoformat()
    }
    await manager.send_personal_message({"type": "message_reaction", "payload": payload}, notify_id)
    
    return reaction_obj

