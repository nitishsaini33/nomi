import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import update
from core.database import AsyncSessionLocal
from models.message import Message
from models.user import User
from services.websocket_manager import manager
import jwt
from core.config import settings
from sqlalchemy.future import select
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["websockets"])


async def get_user_from_token(token: str):
    """Validate JWT and return user from a fresh DB session."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            return None
    except jwt.InvalidTokenError:
        return None
    
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == username))
        return result.scalars().first()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=1008)
        return

    is_new_connection = user.id not in manager.active_connections
    await manager.connect(websocket, user.id)
    
    # Broadcast online status if this is their first connection
    if is_new_connection:
        # Tell everyone (including self) this user is now online
        await manager.broadcast_status(user.id, "online")
        
        # Tell this new user about everyone else who is already online
        online_users = await manager.get_online_users()
        for online_user_id in online_users:
            if online_user_id != user.id:
                try:
                    await websocket.send_text(json.dumps({
                        "type": "user_status",
                        "payload": {"user_id": online_user_id, "status": "online"}
                    }))
                except Exception:
                    pass
        
    try:
        while True:
            data = await websocket.receive_text()
            event = json.loads(data)
            event_type = event.get("type", "chat_message")
            payload = event.get("payload", {})
            
            if event_type == "chat_message":
                receiver_id = payload.get("receiver_id")
                content = payload.get("content")
                reply_to_id = payload.get("reply_to_id")
                
                if receiver_id and content:
                    # Fresh session per operation — prevents stale session bugs
                    async with AsyncSessionLocal() as db:
                        new_msg = Message(
                            sender_id=user.id, 
                            receiver_id=receiver_id, 
                            content=content,
                            reply_to_id=reply_to_id
                        )
                        db.add(new_msg)
                        await db.commit()
                        await db.refresh(new_msg)
                        
                        msg_dict = {
                            "id": new_msg.id,
                            "sender_id": new_msg.sender_id,
                            "receiver_id": new_msg.receiver_id,
                            "content": new_msg.content,
                            "timestamp": new_msg.timestamp.isoformat(),
                            "status": new_msg.status.value if hasattr(new_msg.status, 'value') else new_msg.status,
                            "is_edited": new_msg.is_edited,
                            "is_deleted": new_msg.is_deleted,
                            "reply_to_id": new_msg.reply_to_id
                        }
                    
                    response_event = {"type": "chat_message", "payload": msg_dict}
                    
                    # Send to receiver and sender concurrently
                    await asyncio.gather(
                        manager.send_personal_message(response_event, receiver_id),
                        manager.send_personal_message(response_event, user.id),
                    )
                    
            elif event_type == "typing":
                receiver_id = payload.get("receiver_id")
                is_typing = payload.get("is_typing", False)
                if receiver_id:
                    await manager.send_personal_message(
                        {"type": "typing", "payload": {"user_id": user.id, "is_typing": is_typing}},
                        receiver_id
                    )
                    
            elif event_type == "read_receipt":
                message_ids = payload.get("message_ids", [])
                sender_id = payload.get("sender_id")  # the person who originally sent the messages
                if message_ids and sender_id:
                    # Fresh session — just UPDATE directly, no redundant SELECT
                    async with AsyncSessionLocal() as db:
                        await db.execute(
                            update(Message)
                            .where(Message.id.in_(message_ids))
                            .values(status="READ")
                        )
                        await db.commit()
                    
                    # Notify the sender that their messages were read
                    await manager.send_personal_message(
                        {"type": "messages_read", "payload": {"message_ids": message_ids, "reader_id": user.id}},
                        sender_id
                    )

    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
        if user.id not in manager.active_connections:
            # Broadcast offline status directly — no Redis needed for reliability
            await manager.broadcast_status(user.id, "offline")
    except Exception as e:
        logger.error(f"WebSocket error for user {user.id}: {e}")
        manager.disconnect(websocket, user.id)
        if user.id not in manager.active_connections:
            await manager.broadcast_status(user.id, "offline")
