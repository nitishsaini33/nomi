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

    async def start_pubsub(self):
        if self.pubsub_task is None:
            self.pubsub_task = asyncio.create_task(self._listen_to_redis())

    async def _listen_to_redis(self):
        while True:
            try:
                redis = await get_redis()
                if not redis:
                    await asyncio.sleep(5)
                    continue
                
                pubsub = redis.pubsub(ping_interval=20)
                await pubsub.subscribe(self.channel_name)
                
                try:
                    async for message in pubsub.listen():
                        if message["type"] == "message":
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
                    # If the connection drops silently, listen() will raise a TimeoutError or ConnectionError.
                    pass
                finally:
                    await pubsub.close()
                    
            except Exception as e:
                # Only log non-timeout/connection errors, or keep it as a warning
                if "Timeout" not in str(e) and "Connection" not in str(e):
                    logging.warning(f"Redis PubSub Error: {e}")
                await asyncio.sleep(2)  # Reconnect on error

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
        # Start pubsub lazily if not already started
        await self.start_pubsub()
        
        # Register in global Redis set
        redis = await get_redis()
        if redis:
            await redis.sadd("online_users", user_id)
            
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

    async def send_personal_message(self, message: dict, user_id: str):
        redis = await get_redis()
        if redis:
            await redis.publish(
                self.channel_name, 
                json.dumps({"target": user_id, "payload": message})
            )
        else:
            # Fallback if redis is down
            if user_id in self.active_connections:
                for connection in self.active_connections[user_id]:
                    try:
                        await connection.send_text(json.dumps(message))
                    except:
                        pass

    async def broadcast(self, message: dict):
        redis = await get_redis()
        if redis:
            await redis.publish(
                self.channel_name, 
                json.dumps({"target": "ALL", "payload": message})
            )
        else:
            for user_id, connections in self.active_connections.items():
                for connection in connections:
                    try:
                        await connection.send_text(json.dumps(message))
                    except:
                        pass
                        
    async def get_online_users(self) -> List[str]:
        redis = await get_redis()
        if redis:
            users = await redis.smembers("online_users")
            return list(users)
        return list(self.active_connections.keys())

manager = ConnectionManager()
