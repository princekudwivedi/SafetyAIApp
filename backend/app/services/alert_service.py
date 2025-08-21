import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from bson import ObjectId
from app.core.database import get_database
from app.models.safety import Alert, AlertCreate, AlertUpdate, AlertStatus, SeverityLevel, ViolationType
from app.services.websocket_service import WebSocketService

logger = logging.getLogger(__name__)

class AlertService:
    def __init__(self):
        self.websocket_service = WebSocketService()
    
    async def create_alert(self, alert_data: AlertCreate) -> Optional[Alert]:
        """Create a new safety alert."""
        try:
            database = get_database()
            
            # Generate alert ID
            alert_id = f"AL-{datetime.utcnow().strftime('%Y%m%d')}-{datetime.utcnow().strftime('%H%M%S')}"
            
            # Create alert document
            alert_doc = {
                "alert_id": alert_id,
                "timestamp": datetime.utcnow(),
                "violation_type": alert_data.violation_type,
                "severity_level": alert_data.severity_level,
                "description": alert_data.description,
                "confidence_score": alert_data.confidence_score,
                "location_id": alert_data.location_id,
                "camera_id": alert_data.camera_id,
                "primary_object": {
                    "object_type": alert_data.primary_object.object_type,
                    "object_id": alert_data.primary_object.object_id,
                    "bounding_box": alert_data.primary_object.bounding_box,
                    "confidence": alert_data.primary_object.confidence
                },
                "snapshot_url": alert_data.snapshot_url,
                "status": AlertStatus.NEW,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            # Insert into database
            result = await database.alerts.insert_one(alert_doc)
            
            if result.inserted_id:
                # Convert to Alert model
                alert_doc["_id"] = result.inserted_id
                alert = Alert(**alert_doc)
                
                # Send real-time notification via WebSocket
                await self.websocket_service.broadcast_alert(alert)
                
                logger.info(f"Created alert {alert_id} for {alert_data.violation_type.value}")
                return alert
            
        except Exception as e:
            logger.error(f"Error creating alert: {e}")
        
        return None
    
    async def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Get an alert by ID."""
        try:
            database = get_database()
            alert_doc = await database.alerts.find_one({"alert_id": alert_id})
            
            if alert_doc:
                return Alert(**alert_doc)
            
        except Exception as e:
            logger.error(f"Error getting alert {alert_id}: {e}")
        
        return None
    
    async def get_alerts(self, skip: int = 0, limit: int = 100, 
                        status: Optional[AlertStatus] = None,
                        severity: Optional[SeverityLevel] = None,
                        violation_type: Optional[ViolationType] = None,
                        camera_id: Optional[str] = None,
                        location_id: Optional[str] = None,
                        start_date: Optional[datetime] = None,
                        end_date: Optional[datetime] = None) -> List[Alert]:
        """Get alerts with filtering options."""
        try:
            database = get_database()
            
            # Build filter
            filter_query = {}
            
            if status:
                filter_query["status"] = status
            if severity:
                filter_query["severity_level"] = severity
            if violation_type:
                filter_query["violation_type"] = violation_type
            if camera_id:
                filter_query["camera_id"] = camera_id
            if location_id:
                filter_query["location_id"] = location_id
            if start_date or end_date:
                date_filter = {}
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
                filter_query["timestamp"] = date_filter
            
            # Query database
            cursor = database.alerts.find(filter_query).sort("timestamp", -1).skip(skip).limit(limit)
            alerts = []
            
            async for alert_doc in cursor:
                alerts.append(Alert(**alert_doc))
            
            return alerts
            
        except Exception as e:
            logger.error(f"Error getting alerts: {e}")
            return []
    
    async def update_alert(self, alert_id: str, update_data: AlertUpdate) -> Optional[Alert]:
        """Update an alert."""
        try:
            database = get_database()
            
            # Prepare update data
            update_fields = {}
            if update_data.status is not None:
                update_fields["status"] = update_data.status
            if update_data.assigned_to is not None:
                update_fields["assigned_to"] = update_data.assigned_to
            if update_data.resolution_notes is not None:
                update_fields["resolution_notes"] = update_data.resolution_notes
            
            update_fields["updated_at"] = datetime.utcnow()
            
            # Update in database
            result = await database.alerts.update_one(
                {"alert_id": alert_id},
                {"$set": update_fields}
            )
            
            if result.modified_count > 0:
                # Get updated alert
                return await self.get_alert(alert_id)
            
        except Exception as e:
            logger.error(f"Error updating alert {alert_id}: {e}")
        
        return None
    
    async def delete_alert(self, alert_id: str) -> bool:
        """Delete an alert."""
        try:
            database = get_database()
            result = await database.alerts.delete_one({"alert_id": alert_id})
            
            if result.deleted_count > 0:
                logger.info(f"Deleted alert {alert_id}")
                return True
            
        except Exception as e:
            logger.error(f"Error deleting alert {alert_id}: {e}")
        
        return False
    
    async def get_alert_statistics(self, start_date: Optional[datetime] = None, 
                                 end_date: Optional[datetime] = None) -> Dict[str, Any]:
        """Get alert statistics."""
        try:
            database = get_database()
            
            # Date filter
            date_filter = {}
            if start_date or end_date:
                if start_date:
                    date_filter["$gte"] = start_date
                if end_date:
                    date_filter["$lte"] = end_date
            
            # Total alerts
            total_alerts = await database.alerts.count_documents(date_filter)
            
            # Alerts by status
            status_pipeline = [
                {"$match": date_filter} if date_filter else {"$match": {}},
                {"$group": {"_id": "$status", "count": {"$sum": 1}}}
            ]
            status_stats = await database.alerts.aggregate(status_pipeline).to_list(None)
            
            # Alerts by severity
            severity_pipeline = [
                {"$match": date_filter} if date_filter else {"$match": {}},
                {"$group": {"_id": "$severity_level", "count": {"$sum": 1}}}
            ]
            severity_stats = await database.alerts.aggregate(severity_pipeline).to_list(None)
            
            # Alerts by violation type
            violation_pipeline = [
                {"$match": date_filter} if date_filter else {"$match": {}},
                {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}}
            ]
            violation_stats = await database.alerts.aggregate(violation_pipeline).to_list(None)
            
            # Alerts by camera
            camera_pipeline = [
                {"$match": date_filter} if date_filter else {"$match": {}},
                {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}}
            ]
            camera_stats = await database.alerts.aggregate(camera_pipeline).to_list(None)
            
            # Recent alerts (last 24 hours)
            recent_date = datetime.utcnow() - timedelta(hours=24)
            recent_alerts = await database.alerts.count_documents({"timestamp": {"$gte": recent_date}})
            
            return {
                "total_alerts": total_alerts,
                "recent_alerts": recent_alerts,
                "by_status": {stat["_id"]: stat["count"] for stat in status_stats},
                "by_severity": {stat["_id"]: stat["count"] for stat in severity_stats},
                "by_violation_type": {stat["_id"]: stat["count"] for stat in violation_stats},
                "by_camera": {stat["_id"]: stat["count"] for stat in camera_stats}
            }
            
        except Exception as e:
            logger.error(f"Error getting alert statistics: {e}")
            return {}
    
    async def assign_alert(self, alert_id: str, user_id: str) -> Optional[Alert]:
        """Assign an alert to a user."""
        update_data = AlertUpdate(assigned_to=user_id, status=AlertStatus.IN_PROGRESS)
        return await self.update_alert(alert_id, update_data)
    
    async def resolve_alert(self, alert_id: str, resolution_notes: str) -> Optional[Alert]:
        """Mark an alert as resolved."""
        update_data = AlertUpdate(status=AlertStatus.RESOLVED, resolution_notes=resolution_notes)
        return await self.update_alert(alert_id, update_data)
    
    async def dismiss_alert(self, alert_id: str, dismissal_reason: str) -> Optional[Alert]:
        """Dismiss an alert."""
        update_data = AlertUpdate(status=AlertStatus.DISMISSED, resolution_notes=dismissal_reason)
        return await self.update_alert(alert_id, update_data)
    
    async def get_active_alerts(self) -> List[Alert]:
        """Get all active (non-resolved) alerts."""
        return await self.get_alerts(
            status=AlertStatus.NEW,
            limit=1000
        )
    
    async def get_alerts_by_camera(self, camera_id: str, limit: int = 50) -> List[Alert]:
        """Get alerts for a specific camera."""
        return await self.get_alerts(
            camera_id=camera_id,
            limit=limit
        )
    
    async def get_alerts_by_location(self, location_id: str, limit: int = 100) -> List[Alert]:
        """Get alerts for a specific location."""
        return await self.get_alerts(
            location_id=location_id,
            limit=limit
        )
