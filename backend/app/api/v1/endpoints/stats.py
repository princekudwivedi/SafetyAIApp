from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.models.safety import AlertStatus, SeverityLevel
import json
import random

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get dashboard statistics"""
    try:
        # Get current date and time
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)
        last_week = now - timedelta(weeks=1)
        
        # Get total alerts count
        total_alerts = await db.alerts.count_documents({})
        
        # Get today's alerts
        today_alerts = await db.alerts.count_documents({
            "timestamp": {"$gte": now.replace(hour=0, minute=0, second=0, microsecond=0)}
        })
        
        # Get yesterday's alerts
        yesterday_alerts = await db.alerts.count_documents({
            "timestamp": {
                "$gte": yesterday.replace(hour=0, minute=0, second=0, microsecond=0),
                "$lt": now.replace(hour=0, minute=0, second=0, microsecond=0)
            }
        })
        
        # Get alerts by status
        new_alerts = await db.alerts.count_documents({"status": "New"})
        in_progress_alerts = await db.alerts.count_documents({"status": "In Progress"})
        resolved_alerts = await db.alerts.count_documents({"status": "Resolved"})
        
        # Get alerts by severity
        high_severity = await db.alerts.count_documents({"severity_level": "High"})
        medium_severity = await db.alerts.count_documents({"severity_level": "Medium"})
        low_severity = await db.alerts.count_documents({"severity_level": "Low"})
        
        # Get total cameras
        total_cameras = await db.cameras.count_documents({"status": "Active"})
        
        # Get total sites
        total_sites = await db.sites.count_documents({"is_active": True})
        
        # Calculate safety score (based on resolved vs total alerts)
        safety_score = 0
        if total_alerts > 0:
            resolved_percentage = (resolved_alerts / total_alerts) * 100
            safety_score = max(50, min(100, 100 - (resolved_percentage * 0.5)))
        
        # Get recent alerts for timeline
        recent_alerts = await db.alerts.find(
            {"timestamp": {"$gte": last_week}},
            {"timestamp": 1, "violation_type": 1, "severity_level": 1, "status": 1}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        # Get violation types distribution
        violation_types_pipeline = [
            {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        violation_types = await db.alerts.aggregate(violation_types_pipeline).to_list(length=10)
        
        # Get weekly trend data
        weekly_data = []
        for i in range(7):
            date = now - timedelta(days=i)
            start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            day_alerts = await db.alerts.count_documents({
                "timestamp": {"$gte": start_of_day, "$lt": end_of_day}
            })
            
            weekly_data.append({
                "day": date.strftime("%a"),
                "alerts": day_alerts
            })
        
        weekly_data.reverse()  # Reverse to show oldest to newest
        
        return {
            "total_alerts": total_alerts,
            "today_alerts": today_alerts,
            "yesterday_alerts": yesterday_alerts,
            "new_alerts": new_alerts,
            "in_progress_alerts": in_progress_alerts,
            "resolved_alerts": resolved_alerts,
            "high_severity_alerts": high_severity,
            "medium_severity_alerts": medium_severity,
            "low_severity_alerts": low_severity,
                "total_cameras": total_cameras,
                "total_sites": total_sites,
            "safety_score": round(safety_score, 1),
            "recent_alerts": recent_alerts,
            "violation_types": violation_types,
            "weekly_trend": weekly_data,
            "last_updated": now.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

@router.get("/alerts/summary")
async def get_alerts_summary(
    days: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get alerts summary for specified number of days"""
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get alerts in date range
        alerts = await db.alerts.find({
            "timestamp": {"$gte": start_date, "$lte": end_date}
        }).to_list(length=1000)
        
        # Process alerts data
        alerts_by_date = {}
        violation_types = {}
        severity_levels = {}
        
        for alert in alerts:
            date_key = alert["timestamp"].strftime("%Y-%m-%d")
            
            # Count by date
            if date_key not in alerts_by_date:
                alerts_by_date[date_key] = 0
            alerts_by_date[date_key] += 1
            
            # Count by violation type
            violation_type = alert["violation_type"]
            if violation_type not in violation_types:
                violation_types[violation_type] = 0
            violation_types[violation_type] += 1
            
            # Count by severity
            severity = alert["severity_level"]
            if severity not in severity_levels:
                severity_levels[severity] = 0
            severity_levels[severity] += 1
        
        return {
            "period": f"Last {days} days",
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "total_alerts": len(alerts),
            "alerts_by_date": alerts_by_date,
            "violation_types": violation_types,
            "severity_levels": severity_levels
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching alerts summary: {str(e)}")

@router.get("/alerts/trends")
async def get_alerts_trends(
    days: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get alerts trends over time."""
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get alerts by day
        daily_stats = []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            # Count alerts for this day
            day_count = await db.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end}
            })
            
            # Count by severity
            high_count = await db.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end},
                "severity_level": "High"
            })
            
            medium_count = await db.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end},
                "severity_level": "Medium"
            })
            
            low_count = await db.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end},
                "severity_level": "Low"
            })
            
            daily_stats.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "total": day_count,
                "high": high_count,
                "medium": medium_count,
                "low": low_count
            })
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "daily_stats": daily_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving alert trends: {str(e)}"
        )

@router.get("/cameras/performance")
async def get_cameras_performance(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get cameras performance statistics"""
    try:
        # Get all active cameras
        cameras = await db.cameras.find({"status": "Active"}).to_list(length=100)
        
        camera_performance = []
        
        for camera in cameras:
            # Get alerts for this camera in last 24 hours
            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
            
            alerts_count = await db.alerts.count_documents({
                "camera_id": camera["camera_id"],
                "timestamp": {"$gte": yesterday}
            })
            
            # Calculate uptime (simplified - in real app this would come from camera monitoring)
            uptime = 95 + (random.randint(-5, 5))  # Simulate 90-100% uptime
            
            camera_performance.append({
                "camera_id": camera["camera_id"],
                "camera_name": camera["camera_name"],
                "location": camera["location"],
                "status": camera["status"],
                "alerts_generated": alerts_count,
                "uptime": uptime,
                "last_maintenance": camera["last_maintenance"].isoformat() if camera.get("last_maintenance") else None
            })
        
        return {
            "cameras": camera_performance,
            "total_cameras": len(cameras),
            "active_cameras": len([c for c in cameras if c["status"] == "Active"])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching camera performance: {str(e)}")

@router.get("/sites/overview")
async def get_sites_overview(db: AsyncIOMotorDatabase = Depends(get_database)):
    """Get sites overview with statistics"""
    try:
        sites = await db.sites.find({"is_active": True}).to_list(length=100)
        
        sites_overview = []
        
        for site in sites:
            # Get cameras for this site
            cameras = await db.cameras.find({"site_id": site["site_id"]}).to_list(length=100)
            
            # Get alerts for this site in last 24 hours
            yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
            
            alerts_count = await db.alerts.count_documents({
                "location_id": site["site_id"],
                "timestamp": {"$gte": yesterday}
            })
            
            sites_overview.append({
                "site_id": site["site_id"],
                "site_name": site["site_name"],
                "location": site["location"],
                "contact_person": site["contact_person"],
                "cameras_count": len(cameras),
                "active_cameras": len([c for c in cameras if c["status"] == "Active"]),
                "recent_alerts": alerts_count,
                "status": "Active" if site["is_active"] else "Inactive"
            })
        
        return {
            "sites": sites_overview,
            "total_sites": len(sites),
            "active_sites": len([s for s in sites if s["is_active"]])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching sites overview: {str(e)}")

@router.get("/violations/analysis")
async def get_violations_analysis(
    days: int = 30,
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed violations analysis."""
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get violations by type
        violation_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        violation_stats = await db.alerts.aggregate(violation_pipeline).to_list(length=100)
        
        # Get violations by severity
        severity_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$severity_level", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        severity_stats = await db.alerts.aggregate(severity_pipeline).to_list(length=100)
        
        # Get violations by camera
        camera_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        camera_stats = await db.alerts.aggregate(camera_pipeline).to_list(length=100)
        
        # Get violations by hour of day
        hour_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {
                "$group": {
                    "_id": {"$hour": "$timestamp"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        
        hour_stats = await db.alerts.aggregate(hour_pipeline).to_list(length=24)
        
        return {
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "days": days
            },
            "violations_by_type": violation_stats,
            "violations_by_severity": severity_stats,
            "violations_by_camera": camera_stats,
            "violations_by_hour": hour_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving violations analysis: {str(e)}"
        )

@router.get("/export/csv")
async def export_stats_csv(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Export statistics as CSV."""
    try:
        # This would generate and return a CSV file
        # For now, return a placeholder response
        return {
            "message": "CSV export functionality will be implemented",
            "period": {
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting statistics: {str(e)}"
        )
