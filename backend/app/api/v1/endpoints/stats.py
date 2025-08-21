from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from app.models.user import User
from app.services.alert_service import AlertService
from app.api.v1.endpoints.auth import get_current_active_user
from app.core.database import get_database

router = APIRouter()
alert_service = AlertService()

@router.get("/dashboard")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user)
):
    """Get comprehensive dashboard statistics."""
    try:
        database = get_database()
        
        # Get current date range (last 30 days)
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=30)
        
        # Get alert statistics
        alert_stats = await alert_service.get_alert_statistics(start_date, end_date)
        
        # Get camera statistics
        total_cameras = await database.cameras.count_documents({})
        active_cameras = await database.cameras.count_documents({"status": "Active"})
        
        # Get site statistics
        total_sites = await database.sites.count_documents({})
        active_sites = await database.sites.count_documents({"is_active": True})
        
        # Get user statistics
        total_users = await database.users.count_documents({})
        active_users = await database.users.count_documents({"is_active": True})
        
        # Get recent alerts (last 24 hours)
        recent_alerts = await alert_service.get_alerts(
            start_date=end_date - timedelta(hours=24),
            end_date=end_date,
            limit=10
        )
        
        # Get alerts by day for the last 7 days
        daily_alerts = []
        for i in range(7):
            day_start = end_date - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_count = await database.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end}
            })
            daily_alerts.append({
                "date": day_start.strftime("%Y-%m-%d"),
                "count": day_count
            })
        
        daily_alerts.reverse()  # Oldest to newest
        
        return {
            "summary": {
                "total_violations": alert_stats.get("total_alerts", 0),
                "active_alerts": alert_stats.get("recent_alerts", 0),
                "active_cameras": active_cameras,
                "workers_monitored": total_users,  # Simplified metric
                "total_cameras": total_cameras,
                "total_sites": total_sites,
                "active_sites": active_sites,
                "total_users": total_users,
                "active_users": active_users
            },
            "alerts": {
                "by_status": alert_stats.get("by_status", {}),
                "by_severity": alert_stats.get("by_severity", {}),
                "by_violation_type": alert_stats.get("by_violation_type", {}),
                "by_camera": alert_stats.get("by_camera", {}),
                "recent": [alert.dict() for alert in recent_alerts],
                "daily_trend": daily_alerts
            },
            "system": {
                "last_updated": datetime.utcnow().isoformat(),
                "data_period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving dashboard statistics: {str(e)}"
        )

@router.get("/alerts/summary")
async def get_alerts_summary(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts summary statistics."""
    try:
        stats = await alert_service.get_alert_statistics(start_date, end_date)
        return stats
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alert statistics: {str(e)}"
        )

@router.get("/alerts/trends")
async def get_alerts_trends(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts trends over time."""
    try:
        database = get_database()
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get alerts by day
        daily_stats = []
        for i in range(days):
            day_start = start_date + timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            
            # Count alerts for this day
            day_count = await database.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end}
            })
            
            # Count by severity
            high_count = await database.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end},
                "severity_level": "High"
            })
            
            medium_count = await database.alerts.count_documents({
                "timestamp": {"$gte": day_start, "$lt": day_end},
                "severity_level": "Medium"
            })
            
            low_count = await database.alerts.count_documents({
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alert trends: {str(e)}"
        )

@router.get("/cameras/performance")
async def get_cameras_performance(
    current_user: User = Depends(get_current_active_user)
):
    """Get camera performance statistics."""
    try:
        database = get_database()
        
        # Get all cameras with their alert counts
        pipeline = [
            {
                "$lookup": {
                    "from": "alerts",
                    "localField": "camera_id",
                    "foreignField": "camera_id",
                    "as": "alerts"
                }
            },
            {
                "$project": {
                    "camera_id": 1,
                    "camera_name": 1,
                    "status": 1,
                    "site_id": 1,
                    "total_alerts": {"$size": "$alerts"},
                    "recent_alerts": {
                        "$size": {
                            "$filter": {
                                "input": "$alerts",
                                "cond": {
                                    "$gte": [
                                        "$$this.timestamp",
                                        datetime.utcnow() - timedelta(hours=24)
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {"$sort": {"total_alerts": -1}}
        ]
        
        cursor = database.cameras.aggregate(pipeline)
        camera_stats = []
        
        async for doc in cursor:
            camera_stats.append(doc)
        
        # Get overall camera statistics
        total_cameras = len(camera_stats)
        active_cameras = len([c for c in camera_stats if c["status"] == "Active"])
        total_alerts = sum(c["total_alerts"] for c in camera_stats)
        avg_alerts_per_camera = total_alerts / total_cameras if total_cameras > 0 else 0
        
        return {
            "summary": {
                "total_cameras": total_cameras,
                "active_cameras": active_cameras,
                "inactive_cameras": total_cameras - active_cameras,
                "total_alerts": total_alerts,
                "average_alerts_per_camera": round(avg_alerts_per_camera, 2)
            },
            "cameras": camera_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving camera performance: {str(e)}"
        )

@router.get("/sites/overview")
async def get_sites_overview(
    current_user: User = Depends(get_current_active_user)
):
    """Get sites overview statistics."""
    try:
        database = get_database()
        
        # Get all sites with their camera and alert counts
        pipeline = [
            {
                "$lookup": {
                    "from": "cameras",
                    "localField": "site_id",
                    "foreignField": "site_id",
                    "as": "cameras"
                }
            },
            {
                "$lookup": {
                    "from": "alerts",
                    "localField": "site_id",
                    "foreignField": "location_id",
                    "as": "alerts"
                }
            },
            {
                "$project": {
                    "site_id": 1,
                    "site_name": 1,
                    "location": 1,
                    "is_active": 1,
                    "total_cameras": {"$size": "$cameras"},
                    "active_cameras": {
                        "$size": {
                            "$filter": {
                                "input": "$cameras",
                                "cond": {"$eq": ["$$this.status", "Active"]}
                            }
                        }
                    },
                    "total_alerts": {"$size": "$alerts"},
                    "recent_alerts": {
                        "$size": {
                            "$filter": {
                                "input": "$alerts",
                                "cond": {
                                    "$gte": [
                                        "$$this.timestamp",
                                        datetime.utcnow() - timedelta(hours=24)
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {"$sort": {"total_alerts": -1}}
        ]
        
        cursor = database.sites.aggregate(pipeline)
        site_stats = []
        
        async for doc in cursor:
            site_stats.append(doc)
        
        # Get overall site statistics
        total_sites = len(site_stats)
        active_sites = len([s for s in site_stats if s["is_active"]])
        total_cameras = sum(s["total_cameras"] for s in site_stats)
        total_alerts = sum(s["total_alerts"] for s in site_stats)
        
        return {
            "summary": {
                "total_sites": total_sites,
                "active_sites": active_sites,
                "inactive_sites": total_sites - active_sites,
                "total_cameras": total_cameras,
                "total_alerts": total_alerts
            },
            "sites": site_stats
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sites overview: {str(e)}"
        )

@router.get("/violations/analysis")
async def get_violations_analysis(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed violations analysis."""
    try:
        database = get_database()
        
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get violations by type
        violation_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        violation_stats = await database.alerts.aggregate(violation_pipeline).to_list(None)
        
        # Get violations by severity
        severity_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$severity_level", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        severity_stats = await database.alerts.aggregate(severity_pipeline).to_list(None)
        
        # Get violations by camera
        camera_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date, "$lte": end_date}}},
            {"$group": {"_id": "$camera_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        camera_stats = await database.alerts.aggregate(camera_pipeline).to_list(None)
        
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
        
        hour_stats = await database.alerts.aggregate(hour_pipeline).to_list(None)
        
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
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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
