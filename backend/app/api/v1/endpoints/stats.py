from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.models.safety import AlertStatus, SeverityLevel
from app.models.user import User
from app.api.v1.endpoints.auth import get_current_active_user
import json
import random

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get dashboard statistics - requires authentication"""
    try:
        # Get current date and time
        now = datetime.now(timezone.utc)
        yesterday = now - timedelta(days=1)
        last_week = now - timedelta(weeks=1)
        
        # Get total alerts count
        total_alerts = await db.alerts.count_documents({})
        
        # Get today's alerts - handle both string and datetime timestamps
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_alerts = await db.alerts.count_documents({
            "$or": [
                {"timestamp": {"$gte": today_start}},
                {"timestamp": {"$gte": today_start.isoformat()}}
            ]
        })
        
        # Get yesterday's alerts - handle both string and datetime timestamps
        yesterday_start = yesterday.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_end = now.replace(hour=0, minute=0, second=0, microsecond=0)
        yesterday_alerts = await db.alerts.count_documents({
            "$or": [
                {
                    "timestamp": {
                        "$gte": yesterday_start,
                        "$lt": yesterday_end
                    }
                },
                {
                    "timestamp": {
                        "$gte": yesterday_start.isoformat(),
                        "$lt": yesterday_end.isoformat()
                    }
                }
            ]
        })
        
        # Get alerts by status
        new_alerts = await db.alerts.count_documents({"status": "New"})
        in_progress_alerts = await db.alerts.count_documents({"status": "In Progress"})
        resolved_alerts = await db.alerts.count_documents({"status": "Resolved"})
        
        # Get alerts by severity
        high_severity = await db.alerts.count_documents({"severity_level": "High"})
        medium_severity = await db.alerts.count_documents({"severity_level": "Medium"})
        low_severity = await db.alerts.count_documents({"severity_level": "Low"})
        
        # Get all unique severity levels for filtering
        severity_pipeline = [
            {"$group": {"_id": "$severity_level"}},
            {"$sort": {"_id": 1}}
        ]
        severity_levels_raw = await db.alerts.aggregate(severity_pipeline).to_list(length=10)
        
        # Convert severity levels to formatted values (same as alerts endpoint)
        def format_enum_value(value: str) -> str:
            """Convert enum values to consistent key format (e.g., 'High' -> 'high')"""
            if not value:
                return value
            return value.lower().replace(' ', '_')
        
        severity_levels = [format_enum_value(item["_id"]) for item in severity_levels_raw]
        
        # Get total cameras
        total_cameras = await db.cameras.count_documents({"status": "Active"})
        
        # Get total sites
        total_sites = await db.sites.count_documents({"is_active": True})
        
        # Calculate safety score (based on resolved vs total alerts)
        safety_score = 0
        if total_alerts > 0:
            resolved_percentage = (resolved_alerts / total_alerts) * 100
            safety_score = max(50, min(100, 100 - (resolved_percentage * 0.5)))
        
        # Get recent alerts for timeline - handle both string and datetime timestamps
        print(f"🔍 Fetching recent alerts from {last_week.strftime('%Y-%m-%d')}")  # Debug log
        
        recent_alerts_raw = await db.alerts.find(
            {
                "$or": [
                    {"timestamp": {"$gte": last_week}},
                    {"timestamp": {"$gte": last_week.isoformat()}}
                ]
            },
            {"timestamp": 1, "violation_type": 1, "severity_level": 1, "status": 1}
        ).sort("timestamp", -1).limit(10).to_list(length=10)
        
        print(f"📊 Found {len(recent_alerts_raw)} recent alerts")  # Debug log
        
        # Convert ObjectId to string and handle datetime serialization with consistent formatting
        recent_alerts = []
        for alert in recent_alerts_raw:
            alert_dict = {
                "alert_id": str(alert.get("_id")),
                "timestamp": alert.get("timestamp").isoformat() if hasattr(alert.get("timestamp"), 'isoformat') else str(alert.get("timestamp")),
                "violation_type": format_enum_value(alert.get("violation_type")),
                "severity_level": format_enum_value(alert.get("severity_level")),
                "status": format_enum_value(alert.get("status"))
            }
            recent_alerts.append(alert_dict)
        
        # Get violation types distribution
        violation_types_pipeline = [
            {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        violation_types_raw = await db.alerts.aggregate(violation_types_pipeline).to_list(length=10)
        
        # Convert ObjectId to string in violation types with consistent formatting
        violation_types = []
        for item in violation_types_raw:
            violation_types.append({
                "_id": format_enum_value(str(item.get("_id"))),
                "count": item.get("count")
            })
        
        # Get weekly trend data - handle both string and datetime timestamps
        weekly_data = []
        print(f"🔍 Generating weekly data for {now.strftime('%Y-%m-%d')}")  # Debug log
        
        for i in range(7):
            date = now - timedelta(days=i)
            start_of_day = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)
            
            day_alerts = await db.alerts.count_documents({
                "$or": [
                    {
                        "timestamp": {
                            "$gte": start_of_day,
                            "$lt": end_of_day
                        }
                    },
                    {
                        "timestamp": {
                            "$gte": start_of_day.isoformat(),
                            "$lt": end_of_day.isoformat()
                        }
                    }
                ]
            })
            
            print(f"📅 {date.strftime('%Y-%m-%d')} ({date.strftime('%a')}): {day_alerts} alerts")  # Debug log
            
            weekly_data.append({
                "day": date.strftime("%a"),
                "alerts": day_alerts
            })
        
        weekly_data.reverse()  # Reverse to show oldest to newest
        print(f"📊 Weekly data generated: {weekly_data}")  # Debug log
        
        response_data = {
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
            "weekly_data": weekly_data,
            "severity_levels": severity_levels,
            "last_updated": now.isoformat()
        }
        
        print(f"📤 Dashboard stats response: {response_data}")  # Debug log
        return response_data
        
    except Exception as e:
        import traceback
        print(f"Dashboard stats error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard stats: {str(e)}")

@router.get("/alerts/summary")
async def get_alerts_summary(
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get alerts summary for specified number of days - requires authentication"""
    try:
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days)
        
        # Get alerts in date range - handle both string and datetime timestamps
        alerts = await db.alerts.find({
            "$or": [
                {"timestamp": {"$gte": start_date, "$lte": end_date}},
                {"timestamp": {"$gte": start_date.isoformat(), "$lte": end_date.isoformat()}}
            ]
        }).to_list(length=1000)
        
        # Process alerts data
        alerts_by_status = []
        alerts_by_severity = []
        recent_alerts = []
        
        # Count by status
        status_counts = {}
        severity_counts = {}
        
        for alert in alerts:
            # Count by status
            status = alert.get("status", "Unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
            
            # Count by severity
            severity = alert.get("severity_level", "Unknown")
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Convert to arrays for frontend with consistent formatting
        def format_enum_value(value: str) -> str:
            """Convert enum values to consistent key format (e.g., 'High' -> 'high')"""
            if not value:
                return value
            return value.lower().replace(' ', '_')
        
        for status, count in status_counts.items():
            alerts_by_status.append({"status": format_enum_value(status), "count": count})
        
        for severity, count in severity_counts.items():
            alerts_by_severity.append({"severity": format_enum_value(severity), "count": count})
        
        # Get recent alerts (last 5)
        recent_start_date = end_date - timedelta(days=7)
        print(f"🔍 Fetching recent alerts from {recent_start_date.strftime('%Y-%m-%d')}")  # Debug log
        
        recent_alerts_raw = await db.alerts.find({
            "$or": [
                {"timestamp": {"$gte": recent_start_date}},
                {"timestamp": {"$gte": recent_start_date.isoformat()}}
            ]
        }).sort("timestamp", -1).limit(5).to_list(length=5)
        
        print(f"📊 Found {len(recent_alerts_raw)} recent alerts in summary")  # Debug log
        
        # Convert ObjectId to string and handle datetime serialization with consistent formatting
        recent_alerts = []
        for alert in recent_alerts_raw:
            alert_dict = {
                "alert_id": str(alert.get("_id")),
                "timestamp": alert.get("timestamp").isoformat() if hasattr(alert.get("timestamp"), 'isoformat') else str(alert.get("timestamp")),
                "violation_type": format_enum_value(alert.get("violation_type")),
                "severity_level": format_enum_value(alert.get("severity_level")),
                "description": alert.get("description", ""),
                "camera_id": alert.get("camera_id", ""),
                "status": format_enum_value(alert.get("status")),
                "confidence_score": alert.get("confidence_score", 0)
            }
            recent_alerts.append(alert_dict)
        
        # Calculate weekly safety violations count
        weekly_violations = await db.alerts.count_documents({
            "$or": [
                {"timestamp": {"$gte": end_date - timedelta(days=7)}},
                {"timestamp": {"$gte": (end_date - timedelta(days=7)).isoformat()}}
            ]
        })
        
        response_data = {
            "alerts_by_status": alerts_by_status,
            "alerts_by_severity": alerts_by_severity,
            "recent_alerts": recent_alerts,
            "weekly_violations": weekly_violations
        }
        
        print(f"📤 Alerts summary response: {response_data}")  # Debug log
        return response_data
        
    except Exception as e:
        import traceback
        print(f"Alerts summary error: {str(e)}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error fetching alerts summary: {str(e)}")

@router.get("/alerts/trends")
async def get_alerts_trends(
    days: int = 30,
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get alerts trends over time - requires authentication."""
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
async def get_cameras_performance(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get cameras performance statistics - requires authentication"""
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
async def get_sites_overview(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get sites overview with statistics - requires authentication"""
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
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed violations analysis - requires authentication."""
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
            status_code=500,
            detail=f"Error exporting statistics: {str(e)}"
        )
