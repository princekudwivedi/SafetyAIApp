import json
import logging
from typing import Dict, Set, Any
from fastapi import WebSocket, WebSocketDisconnect
from app.models.safety import Alert
from datetime import datetime

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {
            "alerts": set(),
            "video": set(),
            "dashboard": set()
        }
    
    async def connect(self, websocket: WebSocket, connection_type: str = "dashboard"):
        """Connect a new WebSocket client."""
        await websocket.accept()
        self.active_connections[connection_type].add(websocket)
        logger.info(f"New {connection_type} WebSocket connection established")
    
    def disconnect(self, websocket: WebSocket, connection_type: str = "dashboard"):
        """Disconnect a WebSocket client."""
        if websocket in self.active_connections[connection_type]:
            self.active_connections[connection_type].remove(websocket)
            logger.info(f"{connection_type} WebSocket connection closed")
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        """Send a message to a specific WebSocket client."""
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
            self.disconnect(websocket)
    
    async def broadcast_to_type(self, message: str, connection_type: str):
        """Broadcast a message to all clients of a specific type."""
        disconnected = set()
        
        for websocket in self.active_connections[connection_type]:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to {connection_type}: {e}")
                disconnected.add(websocket)
        
        # Remove disconnected connections
        for websocket in disconnected:
            self.disconnect(websocket, connection_type)
    
    async def broadcast_to_all(self, message: str):
        """Broadcast a message to all connected clients."""
        for connection_type in self.active_connections:
            await self.broadcast_to_type(message, connection_type)

class WebSocketService:
    def __init__(self):
        self.manager = ConnectionManager()
    
    async def connect_client(self, websocket: WebSocket, connection_type: str = "dashboard"):
        """Connect a new client."""
        await self.manager.connect(websocket, connection_type)
    
    def disconnect_client(self, websocket: WebSocket, connection_type: str = "dashboard"):
        """Disconnect a client."""
        self.manager.disconnect(websocket, connection_type)
    
    async def broadcast_alert(self, alert: Alert):
        """Broadcast a new alert to all connected clients."""
        try:
            message = {
                "type": "alert",
                "data": {
                    "alert_id": alert.alert_id,
                    "timestamp": alert.timestamp.isoformat(),
                    "violation_type": alert.violation_type.value,
                    "severity_level": alert.severity_level.value,
                    "description": alert.description,
                    "location_id": alert.location_id,
                    "camera_id": alert.camera_id,
                    "status": alert.status.value
                }
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "alerts")
            await self.manager.broadcast_to_type(json.dumps(message), "dashboard")
            
            logger.info(f"Broadcasted alert {alert.alert_id} to connected clients")
            
        except Exception as e:
            logger.error(f"Error broadcasting alert: {e}")
    
    async def broadcast_video_frame(self, camera_id: str, frame_data: str, detections: list):
        """Broadcast a video frame with detections."""
        try:
            message = {
                "type": "video_frame",
                "camera_id": camera_id,
                "frame_data": frame_data,
                "detections": detections,
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "video")
            
        except Exception as e:
            logger.error(f"Error broadcasting video frame: {e}")
    
    async def broadcast_statistics(self, stats: Dict[str, Any]):
        """Broadcast updated statistics to dashboard clients."""
        try:
            message = {
                "type": "statistics",
                "data": stats,
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "dashboard")
            
        except Exception as e:
            logger.error(f"Error broadcasting statistics: {e}")
    
    async def broadcast_system_status(self, status: Dict[str, Any]):
        """Broadcast system status updates."""
        try:
            message = {
                "type": "system_status",
                "data": status,
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "dashboard")
            
        except Exception as e:
            logger.error(f"Error broadcasting system status: {e}")
    
    async def send_alert_update(self, alert_id: str, update_data: Dict[str, Any]):
        """Send an alert update to connected clients."""
        try:
            message = {
                "type": "alert_update",
                "alert_id": alert_id,
                "data": update_data,
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "alerts")
            await self.manager.broadcast_to_type(json.dumps(message), "dashboard")
            
        except Exception as e:
            logger.error(f"Error sending alert update: {e}")
    
    def get_connection_count(self, connection_type: str = "dashboard") -> int:
        """Get the number of active connections of a specific type."""
        return len(self.manager.active_connections[connection_type])
    
    def get_total_connections(self) -> int:
        """Get the total number of active connections."""
        return sum(len(connections) for connections in self.manager.active_connections.values())
    
    async def handle_websocket_connection(self, websocket: WebSocket, connection_type: str = "dashboard"):
        """Handle a WebSocket connection lifecycle."""
        await self.connect_client(websocket, connection_type)
        
        try:
            while True:
                # Keep connection alive and handle incoming messages
                data = await websocket.receive_text()
                
                # Handle client messages if needed
                try:
                    message = json.loads(data)
                    await self._handle_client_message(websocket, message, connection_type)
                except json.JSONDecodeError:
                    logger.warning(f"Received invalid JSON from {connection_type} client")
                
        except WebSocketDisconnect:
            logger.info(f"{connection_type} WebSocket client disconnected")
        except Exception as e:
            logger.error(f"Error in {connection_type} WebSocket connection: {e}")
        finally:
            self.disconnect_client(websocket, connection_type)
    
    async def _handle_client_message(self, websocket: WebSocket, message: Dict[str, Any], connection_type: str):
        """Handle incoming messages from WebSocket clients."""
        try:
            msg_type = message.get("type")
            
            if msg_type == "ping":
                # Respond to ping with pong
                await self.manager.send_personal_message(
                    json.dumps({"type": "pong", "timestamp": json.dumps(datetime.utcnow().isoformat())}),
                    websocket
                )
            
            elif msg_type == "subscribe":
                # Handle subscription requests
                channels = message.get("channels", [])
                logger.info(f"{connection_type} client subscribed to channels: {channels}")
            
            elif msg_type == "unsubscribe":
                # Handle unsubscription requests
                channels = message.get("channels", [])
                logger.info(f"{connection_type} client unsubscribed from channels: {channels}")
            
            else:
                logger.debug(f"Received message from {connection_type} client: {msg_type}")
                
        except Exception as e:
            logger.error(f"Error handling client message: {e}")
    
    async def broadcast_emergency_alert(self, emergency_data: Dict[str, Any]):
        """Broadcast emergency alerts to all connected clients."""
        try:
            message = {
                "type": "emergency_alert",
                "data": emergency_data,
                "priority": "high",
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            # Emergency alerts go to all connection types
            await self.manager.broadcast_to_all(json.dumps(message))
            
            logger.info("Broadcasted emergency alert to all connected clients")
            
        except Exception as e:
            logger.error(f"Error broadcasting emergency alert: {e}")
    
    async def send_camera_status_update(self, camera_id: str, status: str):
        """Send camera status updates to connected clients."""
        try:
            message = {
                "type": "camera_status",
                "camera_id": camera_id,
                "status": status,
                "timestamp": json.dumps(datetime.utcnow().isoformat())
            }
            
            await self.manager.broadcast_to_type(json.dumps(message), "dashboard")
            await self.manager.broadcast_to_type(json.dumps(message), "video")
            
        except Exception as e:
            logger.error(f"Error sending camera status update: {e}")
