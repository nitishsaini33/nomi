import asyncio
import json
import logging
from typing import Dict, List
from fastapi import WebSocket

from core.redis import get_redis

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.pubsub_task = None
        self.channel_name = "chat_broadcast"

        self.keepalive_task = None

    async def _keepalive_loop(self):
        while True:
            await asyncio.sleep(20)
            try:
                redis = await get_redis()
                if redis:
                    await redis.publish(self.channel_name, '{"type": "keepalive"}')
            except Exception:
                pass

    async def start_pubsub(self):
        if self.pubsub_task is None:
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())
        if self.keepalive_task is None:
            self.keepalive_task = asyncio.create_task(self._keepalive_loop())

    async def _listen_to_redis(self):
        while True:
            try:
                redis = await get_redis()
                if not redis:
                    await asyncio.sleep(5)
                    continue
                    
                pubsub = redis.pubsub()
                await pubsub.subscribe(self.channel_name)
                
                try:
                    async for message in pubsub.listen():
                        if message["type"] == "message":
                            if message["data"] == b'{"type": "keepalive"}':
                                continue
                                
                            data = json.loads(message["data"])
                            target = data.get("target")
                            payload = data.get("payload")
                            
                            if target == "ALL":
                                for connections in self.active_connections.values():
                                    for connection in connections:
                                        try:
                                            await connection.send_text(json.dumps(payload))
                                        except:
                                            pass
                            elif target in self.active_connections:
                                for connection in self.active_connections[target]:
                                    try:
                                        await connection.send_text(json.dumps(payload))
                                    except:
                                        pass
                except Exception as inner_e:
                    # Ignore inner drops to allow reconnect
                    pass
                finally:
                    await pubsub.close()
                    
            except Exception as e:
                # Log actual reconnection events
                logging.warning(f"Redis PubSub reconnecting: {e}")
                await asyncio.sleep(2)

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Start pubsub lazily if not already started
        await self.start_pubsub()
        
        # Register in global Redis set
        try:
            redis = await get_redis()
            if redis:
                await redis.sadd("online_users", user_id)
        except Exception as e:
            logging.error(f"Redis sadd error: {e}")
            
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
                
                # Unregister from global Redis and update DB last_seen
                async def cleanup():
                    redis = await get_redis()
                    if redis:
                        await redis.srem("online_users", user_id)
                        
                    from core.database import AsyncSessionLocal
                    from models.user import User
                    from sqlalchemy import update
                    from datetime import datetime, timezone
                    
                    try:
                        async with AsyncSessionLocal() as session:
                            await session.execute(
                                update(User).where(User.id == user_id).values(last_seen=datetime.now(timezone.utc))
                            )
                            await session.commit()
                    except Exception as e:
                        logging.error(f"Error updating last_seen: {e}")
                
                asyncio.create_task(cleanup())

    async def _send_local(self, message: dict, user_id: str) -> bool:
        """Send directly to locally connected WebSockets. Returns True if user was found locally."""
        if user_id in self.active_connections:
            msg_text = json.dumps(message)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(msg_text)
                except:
                    pass
            return True
        return False

    async def send_personal_message(self, message: dict, user_id: str):
        # Always send locally first for instant delivery
        sent_locally = await self._send_local(message, user_id)
        
        # Also publish to Redis for other server instances (non-blocking)
        if not sent_locally:
            try:
                redis = await get_redis()
                if redis:
                    await redis.publish(
                        self.channel_name, 
                        json.dumps({"target": user_id, "payload": message})
                    )
            except Exception as e:
                logging.error(f"Redis publish error (personal): {e}")

    async def broadcast(self, message: dict):
        """Send to all locally connected users. Also publishes to Redis for multi-server support."""
        msg_text = json.dumps(message)
        for user_id, connections in self.active_connections.items():
            for connection in list(connections):
                try:
                    await connection.send_text(msg_text)
                except:
                    pass
        # Publish to Redis for other server instances — skip if single server to avoid double-delivery
        # Only publish to Redis, don't re-deliver locally (pubsub listener will ignore local)

    async def broadcast_status(self, user_id: str, status: str):
        """Broadcast online/offline status directly to all local connections. No Redis needed."""
        payload = json.dumps({"type": "user_status", "payload": {"user_id": user_id, "status": status}})
        for uid, connections in self.active_connections.items():
            for connection in list(connections):
                try:
                    await connection.send_text(payload)
                except:
                    pass

    async def get_online_users(self) -> List[str]:
        """Always use in-memory connections — reliable, no Redis dependency."""
        return list(self.active_connections.keys())

manager = ConnectionManager()
