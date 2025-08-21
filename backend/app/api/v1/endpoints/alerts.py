from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.models.safety import Alert, AlertCreate, AlertUpdate, AlertStatus, SeverityLevel
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_active_user
import json

router = APIRouter()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[AlertStatus] = None,
    severity: Optional[SeverityLevel] = None,
    camera_id: Optional[str] = None,
    site_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts with optional filtering"""
    try:
        # Build filter query
        filter_query = {}
        
        if status:
            filter_query["status"] = status
        if severity:
            filter_query["severity_level"] = severity
        if camera_id:
            filter_query["camera_id"] = camera_id
        if site_id:
            filter_query["location_id"] = site_id
        if start_date or end_date:
            timestamp_filter = {}
            if start_date:
                timestamp_filter["$gte"] = start_date
            if end_date:
                timestamp_filter["$lte"] = end_date
            filter_query["timestamp"] = timestamp_filter
        
        # Get alerts from database
        cursor = db.alerts.find(filter_query).sort("timestamp", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            if "timestamp" in alert:
                alert["timestamp"] = alert["timestamp"].isoformat()
        
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts: {str(e)}")

@router.get("/{alert_id}", response_model=Dict[str, Any])
async def get_alert(
    alert_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific alert by ID"""
    try:
        alert = await db.alerts.find_one({"alert_id": alert_id})
        
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Convert ObjectId to string for JSON serialization
        if "_id" in alert:
            alert["_id"] = str(alert["_id"])
        if "timestamp" in alert:
            alert["timestamp"] = alert["timestamp"].isoformat()
        
        return alert
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alert: {str(e)}")

@router.post("/", response_model=Dict[str, Any])
async def create_alert(
    alert: AlertCreate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Create a new alert"""
    try:
        # Generate alert ID
        alert_id = f"AL-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{datetime.now(timezone.utc).strftime('%H%M%S')}"
        
        # Create alert document
        alert_doc = {
            "alert_id": alert_id,
            "timestamp": datetime.now(timezone.utc),
            "violation_type": alert.violation_type,
            "severity_level": alert.severity_level,
            "description": alert.description,
            "confidence_score": alert.confidence_score,
            "location_id": alert.location_id,
            "camera_id": alert.camera_id,
            "primary_object": alert.primary_object.dict(),
            "snapshot_url": alert.snapshot_url,
            "status": AlertStatus.NEW,
            "assigned_to": None,
            "resolution_notes": None
        }
        
        # Insert into database
        result = await db.alerts.insert_one(alert_doc)
        
        # Return created alert
        alert_doc["_id"] = str(result.inserted_id)
        alert_doc["timestamp"] = alert_doc["timestamp"].isoformat()
        
        return alert_doc
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating alert: {str(e)}")

@router.put("/{alert_id}", response_model=Dict[str, Any])
async def update_alert(
    alert_id: str,
    alert_update: AlertUpdate,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Update an existing alert"""
    try:
        # Build update fields
        update_fields = {}
        
        if alert_update.status is not None:
            update_fields["status"] = alert_update.status
        if alert_update.assigned_to is not None:
            update_fields["assigned_to"] = alert_update.assigned_to
        if alert_update.resolution_notes is not None:
            update_fields["resolution_notes"] = alert_update.resolution_notes
        
        update_fields["updated_at"] = datetime.now(timezone.utc)
        
        # Update alert in database
        result = await db.alerts.update_one(
            {"alert_id": alert_id},
            {"$set": update_fields}
        )
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Return updated alert
        updated_alert = await db.alerts.find_one({"alert_id": alert_id})
        
        if "_id" in updated_alert:
            updated_alert["_id"] = str(updated_alert["_id"])
        if "timestamp" in updated_alert:
            updated_alert["timestamp"] = updated_alert["timestamp"].isoformat()
        
        return updated_alert
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating alert: {str(e)}")

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Delete an alert"""
    try:
        result = await db.alerts.delete_one({"alert_id": alert_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        return {"message": "Alert deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting alert: {str(e)}")

@router.get("/recent/active", response_model=List[Dict[str, Any]])
async def get_recent_active_alerts(
    limit: int = Query(10, ge=1, le=100),
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent active alerts"""
    try:
        # Get alerts from last 24 hours with status New or In Progress
        yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
        
        cursor = db.alerts.find({
            "timestamp": {"$gte": yesterday},
            "status": {"$in": ["New", "In Progress"]}
        }).sort("timestamp", -1).limit(limit)
        
        alerts = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string for JSON serialization
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            if "timestamp" in alert:
                alert["timestamp"] = alert["timestamp"].isoformat()
        
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching recent alerts: {str(e)}")

@router.get("/summary/status", response_model=Dict[str, Any])
async def get_alerts_status_summary(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of alerts by status"""
    try:
        # Aggregate alerts by status
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        status_summary = await db.alerts.aggregate(pipeline).to_list(length=10)
        
        # Convert to dictionary format
        status_dict = {item["_id"]: item["count"] for item in status_summary}
        
        return {
            "total_alerts": sum(status_dict.values()),
            "by_status": status_dict
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching status summary: {str(e)}")

@router.get("/summary/severity", response_model=Dict[str, Any])
async def get_alerts_severity_summary(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get summary of alerts by severity"""
    try:
        # Aggregate alerts by severity
        pipeline = [
            {"$group": {"_id": "$severity_level", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        severity_summary = await db.alerts.aggregate(pipeline).to_list(length=10)
        
        # Convert to dictionary format
        severity_dict = {item["_id"]: item["count"] for item in severity_summary}
        
        return {
            "total_alerts": sum(severity_dict.values()),
            "by_severity": severity_dict
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching severity summary: {str(e)}")
