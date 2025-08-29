from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, timedelta
from bson import ObjectId
from app.models.user import User
from app.models.safety import Camera, CameraCreate, CameraUpdate
from app.api.v1.endpoints.auth import get_current_active_user
from app.core.database import get_database


router = APIRouter()

@router.get("/", response_model=List[dict])
async def get_cameras(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    site_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get cameras with filtering options and site information."""
    try:
        database = get_database()
        
        # Build filter
        filter_query = {}
        if site_id:
            filter_query["site_id"] = site_id
        if status:
            filter_query["status"] = status
        
        # Query database
        cursor = database.cameras.find(filter_query).skip(skip).limit(limit)
        cameras = []
        
        async for camera_doc in cursor:
            # Get site information
            site_doc = await database.sites.find_one({"site_id": camera_doc["site_id"]})
            site_name = site_doc["site_name"] if site_doc else "Unknown Site"
            
            # Get camera alerts count
            alerts_count = await database.alerts.count_documents({"camera_id": camera_doc["camera_id"]})
            
            # Create camera object with site information and alerts count
            # Convert ObjectId to string to avoid serialization issues
            camera_data = {
                "_id": str(camera_doc.get("_id")) if camera_doc.get("_id") else "",
                "camera_id": camera_doc.get("camera_id", ""),
                "site_id": camera_doc.get("site_id", ""),
                "camera_name": camera_doc.get("camera_name", ""),
                "stream_url": camera_doc.get("stream_url", ""),
                "status": camera_doc.get("status", "Active"),
                "installation_date": camera_doc.get("installation_date", datetime.utcnow()),
                "settings": camera_doc.get("settings", {}),
                "location_description": camera_doc.get("location_description", ""),
                "created_at": camera_doc.get("created_at", datetime.utcnow()),
                "updated_at": camera_doc.get("updated_at", datetime.utcnow()),
                "site_name": site_name,
                "alerts_count": alerts_count
            }
            cameras.append(camera_data)
        
        return cameras
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving cameras: {str(e)}"
        )

@router.get("/{camera_id}", response_model=Camera)
async def get_camera(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific camera by ID."""
    try:
        database = get_database()
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Handle ObjectId conversion for _id field
        camera_data = {
            "_id": str(camera_doc.get("_id")) if camera_doc.get("_id") else str(ObjectId()),
            "camera_id": camera_doc.get("camera_id", ""),
            "site_id": camera_doc.get("site_id", ""),
            "camera_name": camera_doc.get("camera_name", ""),
            "stream_url": camera_doc.get("stream_url", ""),
            "status": camera_doc.get("status", "Active"),
            "installation_date": camera_doc.get("installation_date", datetime.utcnow()),
            "settings": camera_doc.get("settings", {}),
            "location_description": camera_doc.get("location_description", ""),
            "created_at": camera_doc.get("created_at", datetime.utcnow()),
            "updated_at": camera_doc.get("updated_at", datetime.utcnow())
        }
        return Camera(**camera_data)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving camera: {str(e)}"
        )

@router.post("/", response_model=Camera)
async def create_camera(
    camera_data: CameraCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new camera."""
    try:
        # Check if user has permission to create cameras
        if current_user.role.value not in ["Administrator", "Supervisor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create cameras"
            )
        
        database = get_database()
        
        # Check if site exists
        site_exists = await database.sites.find_one({"site_id": camera_data.site_id})
        if not site_exists:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Site not found"
            )
        
        # Generate camera ID
        import uuid
        camera_id = f"CAM_{str(uuid.uuid4())[:8].upper()}"
        
        # Create camera document
        camera_doc = {
            "camera_id": camera_id,
            "site_id": camera_data.site_id,
            "camera_name": camera_data.camera_name,
            "stream_url": camera_data.stream_url,
            "status": "Active",
            "installation_date": camera_data.installation_date,
            "settings": camera_data.settings or {},
            "location_description": camera_data.location_description,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.cameras.insert_one(camera_doc)
        
        if result.inserted_id:
            camera_doc["_id"] = str(result.inserted_id)
            return Camera(**camera_doc)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create camera"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating camera: {str(e)}"
        )

@router.put("/{camera_id}", response_model=Camera)
async def update_camera(
    camera_id: str,
    update_data: CameraUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a camera."""
    try:
        # Check if user has permission to update cameras
        if current_user.role.value not in ["Administrator", "Supervisor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update cameras"
            )
        
        database = get_database()
        
        # Check if camera exists
        existing_camera = await database.cameras.find_one({"camera_id": camera_id})
        if not existing_camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Prepare update data
        update_fields = {}
        if update_data.camera_name is not None:
            update_fields["camera_name"] = update_data.camera_name
        if update_data.stream_url is not None:
            update_fields["stream_url"] = update_data.stream_url
        if update_data.status is not None:
            update_fields["status"] = update_data.status
        if update_data.settings is not None:
            update_fields["settings"] = update_data.settings
        if update_data.location_description is not None:
            update_fields["location_description"] = update_data.location_description
        
        update_fields["updated_at"] = datetime.utcnow()
        
        # Update camera
        result = await database.cameras.update_one(
            {"camera_id": camera_id},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
             # Get updated camera
             updated_camera = await database.cameras.find_one({"camera_id": camera_id})
             # Handle ObjectId conversion for _id field
             camera_data = {
                 "_id": str(updated_camera.get("_id")) if updated_camera.get("_id") else str(ObjectId()),
                 "camera_id": updated_camera.get("camera_id", ""),
                 "site_id": updated_camera.get("site_id", ""),
                 "camera_name": updated_camera.get("camera_name", ""),
                 "stream_url": updated_camera.get("stream_url", ""),
                 "status": updated_camera.get("status", "Active"),
                 "installation_date": updated_camera.get("installation_date", datetime.utcnow()),
                 "settings": updated_camera.get("settings", {}),
                 "location_description": updated_camera.get("location_description", ""),
                 "created_at": updated_camera.get("created_at", datetime.utcnow()),
                 "updated_at": updated_camera.get("updated_at", datetime.utcnow())
             }
             return Camera(**camera_data)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update camera"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating camera: {str(e)}"
        )

@router.delete("/{camera_id}")
async def delete_camera(
    camera_id: str,
    force: bool = Query(False, description="Force delete even with active alerts (Admin only)"),
    current_user: User = Depends(get_current_active_user)
):
    """Delete a camera."""
    try:
        # Check if user has permission to delete cameras
        if current_user.role.value not in ["Administrator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete cameras"
            )
        
        database = get_database()
        
        # Check if camera exists
        existing_camera = await database.cameras.find_one({"camera_id": camera_id})
        if not existing_camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Check if camera has active alerts
        alert_count = await database.alerts.count_documents({"camera_id": camera_id, "status": "New"})
        if alert_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete camera with active alerts"
            )
        
        # If force delete is requested, only allow for administrators
        if force and current_user.role.value != "Administrator":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can force delete cameras with active alerts"
            )
        
        # Delete camera
        result = await database.cameras.delete_one({"camera_id": camera_id})
        
        if result.deleted_count > 0:
            return {"message": "Camera deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete camera"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting camera: {str(e)}"
        )

@router.get("/{camera_id}/alerts")
async def get_camera_alerts(
    camera_id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user)
):
    """Get alerts for a specific camera."""
    try:
        database = get_database()
        
        # Check if camera exists
        camera_exists = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Get alerts for the camera
        cursor = database.alerts.find({"camera_id": camera_id}).sort("timestamp", -1).limit(limit)
        alerts = []
        
        async for alert_doc in cursor:
            alerts.append(alert_doc)
        
        return {
            "camera_id": camera_id,
            "alerts": alerts,
            "total_alerts": len(alerts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving camera alerts: {str(e)}"
        )

@router.get("/{camera_id}/status")
async def get_camera_status(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed status of a camera."""
    try:
        database = get_database()
        
        # Get camera info
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Get camera alerts count
        total_alerts = await database.alerts.count_documents({"camera_id": camera_id})
        recent_alerts = await database.alerts.count_documents({
            "camera_id": camera_id,
            "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
        })
        
        # Get site info
        site_doc = await database.sites.find_one({"site_id": camera_doc["site_id"]})
        site_name = site_doc["site_name"] if site_doc else "Unknown Site"
        
        return {
            "camera_id": camera_id,
            "camera_name": camera_doc["camera_name"],
            "site_id": camera_doc["site_id"],
            "site_name": site_name,
            "status": camera_doc["status"],
            "stream_url": camera_doc["stream_url"],
            "installation_date": camera_doc["installation_date"],
            "total_alerts": total_alerts,
            "recent_alerts_24h": recent_alerts,
            "last_updated": camera_doc["updated_at"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving camera status: {str(e)}"
        )

@router.post("/{camera_id}/test")
async def test_camera_connection(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Test camera connection and stream availability."""
    try:
        database = get_database()
        
        # Get camera info
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Test camera connection (simplified)
        import cv2
        
        try:
            cap = cv2.VideoCapture(camera_doc["stream_url"])
            if cap.isOpened():
                ret, frame = cap.read()
                cap.release()
                
                if ret:
                    return {
                        "camera_id": camera_id,
                        "status": "connected",
                        "message": "Camera connection successful",
                        "stream_available": True
                    }
                else:
                    return {
                        "camera_id": camera_id,
                        "status": "connected",
                        "message": "Camera connected but no frame available",
                        "stream_available": False
                    }
            else:
                return {
                    "camera_id": camera_id,
                    "status": "disconnected",
                    "message": "Unable to connect to camera stream",
                    "stream_available": False
                }
        except Exception as e:
            return {
                "camera_id": camera_id,
                "status": "error",
                "message": f"Error testing camera: {str(e)}",
                "stream_available": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error testing camera: {str(e)}"
        )

@router.get("/site/{site_id}/list")
async def get_cameras_by_site(
    site_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get all cameras for a specific site."""
    try:
        database = get_database()
        
        # Check if site exists
        site_exists = await database.sites.find_one({"site_id": site_id})
        if not site_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Get cameras for the site
        cursor = database.cameras.find({"site_id": site_id})
        cameras = []
        
        async for camera_doc in cursor:
            cameras.append(Camera(**camera_doc))
        
        return {
            "site_id": site_id,
            "cameras": cameras,
            "total_cameras": len(cameras)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving site cameras: {str(e)}"
        )
