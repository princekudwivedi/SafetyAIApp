from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.models.safety import AlertStatus, SeverityLevel
from app.models.user import User
from app.models.reports import Report, ReportCreate, ReportType, ReportFormat, ReportStatus
from app.api.v1.endpoints.auth import get_current_active_user
import json
import csv
import io
from io import StringIO
import pandas as pd

router = APIRouter()

@router.get("/analytics/overview")
async def get_reports_overview(
    period: str = Query("8", description="Number of weeks to analyze (4, 8, 12, 26)"),
    site_id: Optional[str] = Query(None, description="Filter by specific site"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get comprehensive overview analytics for reports"""
    try:
        weeks = int(period)
        if weeks not in [4, 8, 12, 26]:
            raise HTTPException(status_code=400, detail="Period must be 4, 8, 12, or 26 weeks")
        
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=weeks)
        
        # Build filter based on user permissions and site access
        filter_query = {"timestamp": {"$gte": start_date}}
        if site_id and current_user.site_id and current_user.role.value != "Administrator":
            filter_query["site_id"] = current_user.site_id
        elif site_id:
            filter_query["site_id"] = site_id
        
        # Get weekly data
        weekly_data = []
        for i in range(weeks):
            week_start = start_date + timedelta(weeks=i)
            week_end = week_start + timedelta(weeks=1)
            
            week_filter = {
                **filter_query,
                "timestamp": {
                    "$gte": week_start,
                    "$lt": week_end
                }
            }
            
            # Count violations and alerts for this week
            violations = await db.alerts.count_documents({
                **week_filter,
                "violation_type": {"$exists": True, "$ne": None}
            })
            
            alerts = await db.alerts.count_documents(week_filter)
            
            # Calculate safety score for this week
            total_incidents = violations + alerts
            resolved_incidents = await db.alerts.count_documents({
                **week_filter,
                "status": "Resolved"
            })
            
            safety_score = 100
            if total_incidents > 0:
                resolution_rate = resolved_incidents / total_incidents
                safety_score = max(50, min(100, 100 - (resolution_rate * 30)))
            
            weekly_data.append({
                "period": f"Week {i + 1}",
                "violations": violations,
                "alerts": alerts,
                "safetyScore": round(safety_score, 1)
            })
        
        # Get violation types distribution
        violation_pipeline = [
            {"$match": {**filter_query, "violation_type": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$violation_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        violation_types_raw = await db.alerts.aggregate(violation_pipeline).to_list(length=10)
        
        # Define colors for violation types
        colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1']
        
        violation_types = []
        for i, item in enumerate(violation_types_raw):
            violation_types.append({
                "name": item["_id"] or "Unknown",
                "value": item["count"],
                "color": colors[i % len(colors)]
            })
        
        # Get camera performance data
        camera_pipeline = [
            {"$match": filter_query},
            {"$group": {
                "_id": "$camera_id",
                "violations": {"$sum": 1},
                "alerts": {"$sum": {"$cond": [{"$eq": ["$alert_type", "safety_violation"]}, 1, 0]}}
            }},
            {"$lookup": {
                "from": "cameras",
                "localField": "_id",
                "foreignField": "camera_id",
                "as": "camera_info"
            }},
            {"$unwind": "$camera_info"},
            {"$project": {
                "camera": "$_id",
                "violations": "$violations",
                "uptime": "$camera_info.uptime" if "$camera_info.uptime" else 95,
                "alerts": "$alerts"
            }},
            {"$sort": {"violations": -1}},
            {"$limit": 10}
        ]
        
        camera_performance_raw = await db.alerts.aggregate(camera_pipeline).to_list(length=10)
        
        camera_performance = []
        for item in camera_performance_raw:
            camera_performance.append({
                "camera": item["camera"],
                "violations": item["violations"],
                "uptime": item.get("uptime", 95),
                "alerts": item["alerts"]
            })
        
        # Get key metrics
        total_violations = await db.alerts.count_documents({
            **filter_query,
            "violation_type": {"$exists": True, "$ne": None}
        })
        
        total_alerts = await db.alerts.count_documents(filter_query)
        
        active_cameras = await db.cameras.count_documents({
            "status": "Active",
            **({"site_id": current_user.site_id} if current_user.site_id and current_user.role.value != "Administrator" else {})
        })
        
        # Calculate overall safety score
        total_incidents = total_violations + total_alerts
        resolved_incidents = await db.alerts.count_documents({
            **filter_query,
            "status": "Resolved"
        })
        
        overall_safety_score = 100
        if total_incidents > 0:
            resolution_rate = resolved_incidents / total_incidents
            overall_safety_score = max(50, min(100, 100 - (resolution_rate * 30)))
        
        return {
            "weeklyData": weekly_data,
            "violationTypes": violation_types,
            "cameraPerformance": camera_performance,
            "keyMetrics": {
                "totalViolations": total_violations,
                "totalAlerts": total_alerts,
                "activeCameras": active_cameras,
                "overallSafetyScore": round(overall_safety_score, 1)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating overview analytics: {str(e)}")

@router.get("/analytics/violations")
async def get_violations_analysis(
    period: str = Query("8", description="Number of weeks to analyze"),
    violation_type: Optional[str] = Query(None, description="Filter by violation type"),
    site_id: Optional[str] = Query(None, description="Filter by specific site"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed violations analysis"""
    try:
        weeks = int(period)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=weeks)
        
        filter_query = {"timestamp": {"$gte": start_date}}
        if violation_type:
            filter_query["violation_type"] = violation_type
        if site_id and current_user.site_id and current_user.role.value != "Administrator":
            filter_query["site_id"] = current_user.site_id
        elif site_id:
            filter_query["site_id"] = site_id
        
        # Get violations by time of day
        time_pipeline = [
            {"$match": {**filter_query, "violation_type": {"$exists": True, "$ne": None}}},
            {"$addFields": {
                "hour": {"$hour": "$timestamp"}
            }},
            {"$group": {"_id": "$hour", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        time_analysis = await db.alerts.aggregate(time_pipeline).to_list(length=24)
        
        # Get violations by day of week
        day_pipeline = [
            {"$match": {**filter_query, "violation_type": {"$exists": True, "$ne": None}}},
            {"$addFields": {
                "dayOfWeek": {"$dayOfWeek": "$timestamp"}
            }},
            {"$group": {"_id": "$dayOfWeek", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        day_analysis = await db.alerts.aggregate(day_pipeline).to_list(length=7)
        
        # Get top violation locations
        location_pipeline = [
            {"$match": {**filter_query, "violation_type": {"$exists": True, "$ne": None}}},
            {"$group": {"_id": "$zone_id", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        
        location_analysis = await db.alerts.aggregate(location_pipeline).to_list(length=10)
        
        return {
            "timeAnalysis": time_analysis,
            "dayAnalysis": day_analysis,
            "locationAnalysis": location_analysis
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating violations analysis: {str(e)}")

@router.get("/analytics/cameras")
async def get_camera_performance_analysis(
    period: str = Query("8", description="Number of weeks to analyze"),
    site_id: Optional[str] = Query(None, description="Filter by specific site"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get detailed camera performance analysis"""
    try:
        weeks = int(period)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=weeks)
        
        filter_query = {"timestamp": {"$gte": start_date}}
        if site_id and current_user.site_id and current_user.role.value != "Administrator":
            filter_query["site_id"] = current_user.site_id
        elif site_id:
            filter_query["site_id"] = site_id
        
        # Get camera performance metrics
        camera_pipeline = [
            {"$match": filter_query},
            {"$group": {
                "_id": "$camera_id",
                "totalAlerts": {"$sum": 1},
                "violations": {"$sum": {"$cond": [{"$eq": ["$alert_type", "safety_violation"]}, 1, 0]}},
                "avgResponseTime": {"$avg": "$response_time"},
                "lastAlert": {"$max": "$timestamp"}
            }},
            {"$lookup": {
                "from": "cameras",
                "localField": "_id",
                "foreignField": "camera_id",
                "as": "camera_info"
            }},
            {"$unwind": "$camera_info"},
            {"$project": {
                "cameraId": "$_id",
                "cameraName": "$camera_info.camera_name",
                "siteId": "$camera_info.site_id",
                "totalAlerts": "$totalAlerts",
                "violations": "$violations",
                "uptime": {"$ifNull": ["$camera_info.uptime", 95]},
                "avgResponseTime": "$avgResponseTime",
                "lastAlert": "$lastAlert",
                "status": "$camera_info.status"
            }},
            {"$sort": {"totalAlerts": -1}}
        ]
        
        camera_performance = await db.alerts.aggregate(camera_pipeline).to_list(length=50)
        
        # Calculate performance scores
        for camera in camera_performance:
            # Calculate performance score based on uptime and alert efficiency
            uptime = camera.get("uptime", 95)  # Default to 95 if uptime is missing
            uptime_score = uptime * 0.6
            alert_efficiency = max(0, 100 - (camera["totalAlerts"] * 2)) * 0.4
            camera["performanceScore"] = round(uptime_score + alert_efficiency, 1)
            
            # Determine performance level
            if camera["performanceScore"] >= 90:
                camera["performanceLevel"] = "Excellent"
            elif camera["performanceScore"] >= 80:
                camera["performanceLevel"] = "Good"
            elif camera["performanceScore"] >= 70:
                camera["performanceLevel"] = "Fair"
            else:
                camera["performanceLevel"] = "Poor"
        
        return {
            "cameras": camera_performance,
            "summary": {
                "totalCameras": len(camera_performance),
                "excellentPerformance": len([c for c in camera_performance if c["performanceLevel"] == "Excellent"]),
                "goodPerformance": len([c for c in camera_performance if c["performanceLevel"] == "Good"]),
                "fairPerformance": len([c for c in camera_performance if c["performanceLevel"] == "Fair"]),
                "poorPerformance": len([c for c in camera_performance if c["performanceLevel"] == "Poor"])
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating camera performance analysis: {str(e)}")

@router.get("/analytics/trends")
async def get_trends_and_forecasting(
    period: str = Query("26", description="Number of weeks for trend analysis"),
    forecast_weeks: int = Query(4, description="Number of weeks to forecast"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get trends analysis and forecasting"""
    try:
        weeks = int(period)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=weeks)
        
        # Get historical data
        historical_pipeline = [
            {"$match": {"timestamp": {"$gte": start_date}}},
            {"$addFields": {
                "week": {"$week": "$timestamp"},
                "year": {"$year": "$timestamp"}
            }},
            {"$group": {
                "_id": {"week": "$week", "year": "$year"},
                "violations": {"$sum": {"$cond": [{"$eq": ["$alert_type", "safety_violation"]}, 1, 0]}},
                "alerts": {"$sum": 1},
                "avgSeverity": {"$avg": {"$cond": [
                    {"$eq": ["$severity_level", "High"]}, 3,
                    {"$cond": [{"$eq": ["$severity_level", "Medium"]}, 2, 1]}
                ]}}
            }},
            {"$sort": {"_id.year": 1, "_id.week": 1}}
        ]
        
        historical_data = await db.alerts.aggregate(historical_pipeline).to_list(length=weeks)
        
        # Simple trend calculation (linear regression)
        if len(historical_data) >= 2:
            # Calculate trend for violations
            violation_trend = 0
            if len(historical_data) > 1:
                first_week = historical_data[0]["violations"]
                last_week = historical_data[-1]["violations"]
                weeks_diff = len(historical_data) - 1
                if weeks_diff > 0:
                    violation_trend = (last_week - first_week) / weeks_diff
            
            # Generate forecast
            forecast_data = []
            last_violations = historical_data[-1]["violations"] if historical_data else 0
            last_alerts = historical_data[-1]["alerts"] if historical_data else 0
            
            for i in range(1, forecast_weeks + 1):
                forecast_violations = max(0, last_violations + (violation_trend * i))
                forecast_alerts = max(0, last_alerts + (violation_trend * i * 1.2))  # Alerts typically follow violations
                
                forecast_data.append({
                    "period": f"Week {len(historical_data) + i}",
                    "violations": round(forecast_violations),
                    "alerts": round(forecast_alerts),
                    "isForecast": True
                })
            
            # Add forecast to historical data
            all_data = historical_data + forecast_data
        else:
            all_data = historical_data
            violation_trend = 0
        
        return {
            "historicalData": historical_data,
            "forecastData": forecast_data if 'forecast_data' in locals() else [],
            "trends": {
                "violationTrend": violation_trend,
                "trendDirection": "increasing" if violation_trend > 0 else "decreasing" if violation_trend < 0 else "stable",
                "confidence": min(95, max(60, 100 - abs(violation_trend) * 10))
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating trends analysis: {str(e)}")

@router.post("/export")
async def export_report(
    report_type: str = Query(..., description="Type of report to export"),
    format: str = Query("csv", description="Export format (csv, json, excel)"),
    period: str = Query("8", description="Number of weeks"),
    site_id: Optional[str] = Query(None, description="Filter by site"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Export report data in various formats"""
    try:
        weeks = int(period)
        now = datetime.now(timezone.utc)
        start_date = now - timedelta(weeks=weeks)
        
        filter_query = {"timestamp": {"$gte": start_date}}
        if site_id and current_user.site_id and current_user.role.value != "Administrator":
            filter_query["site_id"] = current_user.site_id
        elif site_id:
            filter_query["site_id"] = site_id
        
        if report_type == "overview":
            # Get overview data
            data = await get_reports_overview(period, site_id, current_user, db)
            filename = f"overview_report_{period}weeks_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        elif report_type == "violations":
            # Get violations data
            data = await get_violations_analysis(period, None, site_id, current_user, db)
            filename = f"violations_report_{period}weeks_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        elif report_type == "cameras":
            # Get camera performance data
            data = await get_camera_performance_analysis(period, site_id, current_user, db)
            filename = f"camera_performance_{period}weeks_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        else:
            raise HTTPException(status_code=400, detail="Invalid report type")
        
        if format == "csv":
            # Convert data to CSV
            output = StringIO()
            writer = csv.writer(output)
            
            if report_type == "overview":
                # Write weekly data
                writer.writerow(["Period", "Violations", "Alerts", "Safety Score"])
                for row in data["weeklyData"]:
                    writer.writerow([row["period"], row["violations"], row["alerts"], row["safetyScore"]])
                
                writer.writerow([])
                writer.writerow(["Violation Types", "Count"])
                for row in data["violationTypes"]:
                    writer.writerow([row["name"], row["value"]])
            
            elif report_type == "violations":
                writer.writerow(["Time Analysis", "Count"])
                for row in data["timeAnalysis"]:
                    writer.writerow([f"Hour {row['_id']}", row["count"]])
                
                writer.writerow([])
                writer.writerow(["Day of Week", "Count"])
                for row in data["dayAnalysis"]:
                    writer.writerow([f"Day {row['_id']}", row["count"]])
            
            elif report_type == "cameras":
                writer.writerow(["Camera", "Total Alerts", "Violations", "Uptime", "Performance Score", "Level"])
                for row in data["cameras"]:
                    writer.writerow([
                        row["cameraId"],
                        row["totalAlerts"],
                        row["violations"],
                        f"{row['uptime']}%",
                        row["performanceScore"],
                        row["performanceLevel"]
                    ])
            
            output.seek(0)
            return StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename={filename}.csv"}
            )
        
        elif format == "json":
            return StreamingResponse(
                io.BytesIO(json.dumps(data, indent=2, default=str).encode('utf-8')),
                media_type="application/json",
                headers={"Content-Disposition": f"attachment; filename={filename}.json"}
            )
        
        else:
            raise HTTPException(status_code=400, detail="Unsupported export format")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error exporting report: {str(e)}")

@router.get("/templates")
async def get_report_templates(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get available report templates"""
    try:
        templates = [
            {
                "id": "overview",
                "name": "Overview Report",
                "description": "Comprehensive overview of safety metrics and trends",
                "type": "overview",
                "parameters": ["period", "site_id"],
                "formats": ["csv", "json"]
            },
            {
                "id": "violations",
                "name": "Violations Analysis",
                "description": "Detailed analysis of safety violations and patterns",
                "type": "violations",
                "parameters": ["period", "violation_type", "site_id"],
                "formats": ["csv", "json"]
            },
            {
                "id": "cameras",
                "name": "Camera Performance",
                "description": "Camera performance metrics and analysis",
                "type": "cameras",
                "parameters": ["period", "site_id"],
                "formats": ["csv", "json"]
            },
            {
                "id": "trends",
                "name": "Trends & Forecasting",
                "description": "Trend analysis and future predictions",
                "type": "trends",
                "parameters": ["period", "forecast_weeks"],
                "formats": ["csv", "json"]
            }
        ]
        
        return {"templates": templates}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting report templates: {str(e)}")
