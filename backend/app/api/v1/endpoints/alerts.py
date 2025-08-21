from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta
from app.models.user import User
from app.models.safety import Alert, AlertCreate, AlertUpdate, AlertStatus, SeverityLevel, ViolationType
from app.services.alert_service import AlertService
from app.api.v1.endpoints.auth import get_current_active_user
from app.core.database import get_database

router = APIRouter()
alert_service = AlertService()

@router.get("/", response_model=List[Alert])
async def get_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: Optional[AlertStatus] = Query(None),
    severity: Optional[SeverityLevel] = Query(None),
    violation_type: Optional[ViolationType] = Query(None),
    camera_id: Optional[str] = Query(None),
    location_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts with filtering options."""
    try:
        alerts = await alert_service.get_alerts(
            skip=skip,
            limit=limit,
            status=status,
            severity=severity,
            violation_type=violation_type,
            camera_id=camera_id,
            location_id=location_id,
            start_date=start_date,
            end_date=end_date
        )
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alerts: {str(e)}"
        )

@router.get("/{alert_id}", response_model=Alert)
async def get_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific alert by ID."""
    try:
        alert = await alert_service.get_alert(alert_id)
        if not alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        return alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alert: {str(e)}"
        )

@router.put("/{alert_id}", response_model=Alert)
async def update_alert(
    alert_id: str,
    update_data: AlertUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update an alert."""
    try:
        # Check if alert exists
        existing_alert = await alert_service.get_alert(alert_id)
        if not existing_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Update alert
        updated_alert = await alert_service.update_alert(alert_id, update_data)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update alert"
            )
        
        return updated_alert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating alert: {str(e)}"
        )

@router.delete("/{alert_id}")
async def delete_alert(
    alert_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete an alert."""
    try:
        # Check if alert exists
        existing_alert = await alert_service.get_alert(alert_id)
        if not existing_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Delete alert
        success = await alert_service.delete_alert(alert_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete alert"
            )
        
        return {"message": "Alert deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting alert: {str(e)}"
        )

@router.get("/active/list", response_model=List[Alert])
async def get_active_alerts(
    current_user: User = Depends(get_current_active_user)
):
    """Get all active (non-resolved) alerts."""
    try:
        alerts = await alert_service.get_active_alerts()
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving active alerts: {str(e)}"
        )

@router.get("/camera/{camera_id}", response_model=List[Alert])
async def get_alerts_by_camera(
    camera_id: str,
    limit: int = Query(50, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts for a specific camera."""
    try:
        alerts = await alert_service.get_alerts_by_camera(camera_id, limit)
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving camera alerts: {str(e)}"
        )

@router.get("/location/{location_id}", response_model=List[Alert])
async def get_alerts_by_location(
    location_id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts for a specific location."""
    try:
        alerts = await alert_service.get_alerts_by_location(location_id, limit)
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving location alerts: {str(e)}"
        )

@router.post("/{alert_id}/assign")
async def assign_alert(
    alert_id: str,
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Assign an alert to a user."""
    try:
        # Check if alert exists
        existing_alert = await alert_service.get_alert(alert_id)
        if not existing_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Assign alert
        updated_alert = await alert_service.assign_alert(alert_id, user_id)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign alert"
            )
        
        return {"message": "Alert assigned successfully", "alert": updated_alert}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error assigning alert: {str(e)}"
        )

@router.post("/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    resolution_notes: str,
    current_user: User = Depends(get_current_active_user)
):
    """Mark an alert as resolved."""
    try:
        # Check if alert exists
        existing_alert = await alert_service.get_alert(alert_id)
        if not existing_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Resolve alert
        updated_alert = await alert_service.resolve_alert(alert_id, resolution_notes)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to resolve alert"
            )
        
        return {"message": "Alert resolved successfully", "alert": updated_alert}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resolving alert: {str(e)}"
        )

@router.post("/{alert_id}/dismiss")
async def dismiss_alert(
    alert_id: str,
    dismissal_reason: str,
    current_user: User = Depends(get_current_active_user)
):
    """Dismiss an alert."""
    try:
        # Check if alert exists
        existing_alert = await alert_service.get_alert(alert_id)
        if not existing_alert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Alert not found"
            )
        
        # Dismiss alert
        updated_alert = await alert_service.dismiss_alert(alert_id, dismissal_reason)
        if not updated_alert:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to dismiss alert"
            )
        
        return {"message": "Alert dismissed successfully", "alert": updated_alert}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error dismissing alert: {str(e)}"
        )

@router.get("/statistics/summary")
async def get_alert_statistics(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get alert statistics summary."""
    try:
        stats = await alert_service.get_alert_statistics(start_date, end_date)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving alert statistics: {str(e)}"
        )

@router.get("/recent/24h")
async def get_recent_alerts_24h(
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts from the last 24 hours."""
    try:
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(hours=24)
        
        alerts = await alert_service.get_alerts(
            start_date=start_date,
            end_date=end_date,
            limit=100
        )
        return alerts
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving recent alerts: {str(e)}"
        )
