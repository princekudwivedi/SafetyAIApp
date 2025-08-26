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

def format_enum_value(value: str) -> str:
    """Convert enum values to consistent key format (e.g., 'In Progress' -> 'in_progress')"""
    if not value:
        return value
    return value.lower().replace(' ', '_')

def reverse_format_enum_value(value: str) -> str:
    """Convert formatted enum values back to original format (e.g., 'in_progress' -> 'In Progress')"""
    if not value:
        return value
    
    # Special mapping for status values that don't follow the simple pattern
    status_mapping = {
        'new': 'New',
        'in_progress': 'In Progress',
        'resolved': 'Resolved',
        'dismissed': 'Dismissed'
    }
    
    # Check if it's a special status value first
    if value in status_mapping:
        return status_mapping[value]
    
    # For other values, use the simple pattern
    return value.replace('_', ' ').title()

@router.get("/", response_model=List[Dict[str, Any]])
async def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),  # Increased default limit to get more records
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
        
        # Get alerts from database with proper sorting
        cursor = db.alerts.find(filter_query).sort("timestamp", -1).skip(skip).limit(limit)
        alerts = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format enum values for JSON serialization
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            if "timestamp" in alert:
                alert["timestamp"] = alert["timestamp"].isoformat()
            if "status" in alert:
                alert["status"] = format_enum_value(alert["status"])
            if "severity_level" in alert:
                alert["severity_level"] = format_enum_value(alert["severity_level"])
            if "violation_type" in alert:
                alert["violation_type"] = format_enum_value(alert["violation_type"])
        
        return alerts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts: {str(e)}")

@router.get("/unique/status", response_model=List[str])
async def get_unique_status_values(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get all unique status values from the database"""
    try:
        pipeline = [
            {"$group": {"_id": "$status"}},
            {"$sort": {"_id": 1}}
        ]
        
        status_values = await db.alerts.aggregate(pipeline).to_list(length=10)
        
        # Convert to formatted values and return
        unique_statuses = [format_enum_value(item["_id"]) for item in status_values]
        return unique_statuses
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unique status values: {str(e)}")

@router.get("/unique/severity", response_model=List[str])
async def get_unique_severity_values(
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get all unique severity values from the database"""
    try:
        pipeline = [
            {"$group": {"_id": "$severity_level"}},
            {"$sort": {"_id": 1}}
        ]
        
        severity_values = await db.alerts.aggregate(pipeline).to_list(length=10)
        
        # Convert to formatted values and return
        unique_severities = [format_enum_value(item["_id"]) for item in severity_values]
        return unique_severities
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unique severity values: {str(e)}")

@router.get("/count", response_model=Dict[str, int])
async def get_alerts_count(
    status: Optional[AlertStatus] = None,
    severity: Optional[SeverityLevel] = None,
    camera_id: Optional[str] = None,
    site_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: AsyncIOMotorDatabase = Depends(get_database),
    current_user: User = Depends(get_current_active_user)
):
    """Get total count of alerts with optional filtering"""
    try:
        # Build filter query (same as get_alerts)
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
        
        # Get count
        count = await db.alerts.count_documents(filter_query)
        
        return {"total_count": count}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error counting alerts: {str(e)}")

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
        
        # Convert ObjectId to string and format enum values for JSON serialization
        if "_id" in alert:
            alert["_id"] = str(alert["_id"])
        if "timestamp" in alert:
            alert["timestamp"] = alert["timestamp"].isoformat()
        if "status" in alert:
            alert["status"] = format_enum_value(alert["status"])
        if "severity_level" in alert:
            alert["severity_level"] = format_enum_value(alert["severity_level"])
        if "violation_type" in alert:
            alert["violation_type"] = format_enum_value(alert["violation_type"])
        
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
        
        # Return created alert with formatted enum values
        alert_doc["_id"] = str(result.inserted_id)
        alert_doc["timestamp"] = alert_doc["timestamp"].isoformat()
        alert_doc["status"] = format_enum_value(alert_doc["status"])
        alert_doc["severity_level"] = format_enum_value(alert_doc["severity_level"])
        alert_doc["violation_type"] = format_enum_value(alert_doc["violation_type"])
        
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
        print(f"🔍 Received update request for alert {alert_id}")
        print(f"🔍 Alert update data: {alert_update}")
        print(f"🔍 Alert update type: {type(alert_update)}")
        print(f"🔍 Status value: '{alert_update.status}' (type: {type(alert_update.status)})")
        # Build update fields
        update_fields = {}
        
        if alert_update.status is not None:
            # Convert formatted status back to original enum format
            print(f"🔍 Received status update: '{alert_update.status}' (type: {type(alert_update.status)})")
            original_status = reverse_format_enum_value(alert_update.status)
            print(f"Status conversion: '{alert_update.status}' -> '{original_status}'")
            update_fields["status"] = original_status
        if alert_update.assigned_to is not None:
            update_fields["assigned_to"] = alert_update.assigned_to
        if alert_update.resolution_notes is not None:
            update_fields["resolution_notes"] = alert_update.resolution_notes
        
        update_fields["updated_at"] = datetime.now(timezone.utc)
        
        # Update alert in database
        print(f"🔍 Update fields: {update_fields}")
        print(f"🔍 Query filter: {{'alert_id': '{alert_id}'}}")
        
        result = await db.alerts.update_one(
            {"alert_id": alert_id},
            {"$set": update_fields}
        )
        
        print(f"🔍 Update result: matched={result.matched_count}, modified={result.modified_count}")
        
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Return updated alert with formatted enum values
        updated_alert = await db.alerts.find_one({"alert_id": alert_id})
        
        if "_id" in updated_alert:
            updated_alert["_id"] = str(updated_alert["_id"])
        if "timestamp" in updated_alert:
            updated_alert["timestamp"] = updated_alert["timestamp"].isoformat()
        if "status" in updated_alert:
            updated_alert["status"] = format_enum_value(updated_alert["status"])
        if "severity_level" in updated_alert:
            updated_alert["severity_level"] = format_enum_value(updated_alert["severity_level"])
        if "violation_type" in updated_alert:
            updated_alert["violation_type"] = format_enum_value(updated_alert["violation_type"])
        
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
            "status": {"$in": [AlertStatus.NEW, AlertStatus.IN_PROGRESS]}
        }).sort("timestamp", -1).limit(limit)
        
        alerts = await cursor.to_list(length=limit)
        
        # Convert ObjectId to string and format enum values for JSON serialization
        for alert in alerts:
            if "_id" in alert:
                alert["_id"] = str(alert["_id"])
            if "timestamp" in alert:
                alert["timestamp"] = alert["timestamp"].isoformat()
            if "status" in alert:
                alert["status"] = format_enum_value(alert["status"])
            if "severity_level" in alert:
                alert["severity_level"] = format_enum_value(alert["severity_level"])
            if "violation_type" in alert:
                alert["violation_type"] = format_enum_value(alert["violation_type"])
        
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
        
        # Convert to dictionary format with formatted keys
        status_dict = {format_enum_value(item["_id"]): item["count"] for item in status_summary}
        
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
        
        # Convert to dictionary format with formatted keys
        severity_dict = {format_enum_value(item["_id"]): item["count"] for item in severity_summary}
        
        return {
            "total_alerts": sum(severity_dict.values()),
            "by_severity": severity_dict
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching severity summary: {str(e)}")
