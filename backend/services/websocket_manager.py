from typing import Dict, List
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        
    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if len(self.active_connections[user_id]) == 0:
                del self.active_connections[user_id]
                # Trigger an async task to update last_seen
                import asyncio
                from core.database import AsyncSessionLocal
                from models.user import User
                from sqlalchemy import update
                from datetime import datetime, timezone
                
                async def update_last_seen():
                    async with AsyncSessionLocal() as session:
                        await session.execute(
                            update(User).where(User.id == user_id).values(last_seen=datetime.now(timezone.utc))
                        )
                        await session.commit()
                asyncio.create_task(update_last_seen())

    async def send_personal_message(self, message: dict, user_id: str):
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass

    async def broadcast(self, message: dict):
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_text(json.dumps(message))
                except:
                    pass
                    
    def get_online_users(self) -> List[str]:
        return list(self.active_connections.keys())

manager = ConnectionManager()
