from typing import Dict, List
import json
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # Store active connections: user_id -> List[WebSocket]
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    def disconnect(self, websocket: WebSocket, user_id: int):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            # We iterate over a copy or use a safe method if needed, but list iteration is usually fine if not modifying async
            # But disconnect might happen during send?
            # For MVP it's usually okay.
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                except Exception:
                    # If send fails, we might want to clean up, but simpler to let disconnect handle it
                    pass

    async def broadcast(self, message: dict):
        """Send a message to ALL connected users."""
        for user_id, connections in self.active_connections.items():
            for connection in connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    pass

# Global instance
manager = ConnectionManager()
