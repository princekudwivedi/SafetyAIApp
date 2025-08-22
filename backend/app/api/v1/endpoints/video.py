from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from typing import List, Optional
import cv2
import numpy as np
import io
from app.models.user import User
from app.models.safety import Camera, CameraCreate, CameraUpdate
from app.services.video_service import VideoService
from app.services.websocket_service import WebSocketService
from app.api.v1.endpoints.auth import get_current_active_user
from app.core.database import get_database
from app.core.config import settings
from datetime import datetime

router = APIRouter()
video_service = VideoService()
websocket_service = WebSocketService()

@router.get("/stream/{camera_id}")
async def get_video_stream(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get video stream for a specific camera."""
    try:
        # Get camera info
        database = get_database()
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Check if camera is active
        if camera_doc.get("status") != "Active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Camera is not active"
            )
        
        # Get current frame
        frame = await video_service.get_frame_from_camera(camera_id)
        if frame is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to get video frame"
            )
        
        # Convert frame to JPEG
        _, buffer = cv2.imencode('.jpg', frame)
        frame_bytes = buffer.tobytes()
        
        return StreamingResponse(
            io.BytesIO(frame_bytes),
            media_type="image/jpeg"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting video stream: {str(e)}"
        )

@router.post("/start/{camera_id}")
async def start_video_processing(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start video processing for a camera."""
    try:
        # Get camera info
        database = get_database()
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Check if camera is active
        if camera_doc.get("status") != "Active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Camera is not active"
            )
        
        # Start video processing
        await video_service.start_video_stream(
            camera_id=camera_id,
            stream_url=camera_doc["stream_url"],
            location_id=camera_doc["site_id"]
        )
        
        return {"message": f"Video processing started for camera {camera_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting video processing: {str(e)}"
        )

@router.post("/stop/{camera_id}")
async def stop_video_processing(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Stop video processing for a camera."""
    try:
        await video_service.stop_video_stream(camera_id)
        return {"message": f"Video processing stopped for camera {camera_id}"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error stopping video processing: {str(e)}"
        )

@router.get("/status/{camera_id}")
async def get_camera_status(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get the status of a camera's video processing."""
    try:
        status = video_service.get_stream_status(camera_id)
        if status is None:
            return {"camera_id": camera_id, "status": "inactive", "message": "No active stream"}
        
        return {
            "camera_id": camera_id,
            "status": "active",
            "stream_info": status
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting camera status: {str(e)}"
        )

@router.get("/status/all")
async def get_all_cameras_status(
    current_user: User = Depends(get_current_active_user)
):
    """Get status of all active video streams."""
    try:
        statuses = video_service.get_all_streams_status()
        return {
            "active_streams": len(statuses),
            "streams": statuses
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting cameras status: {str(e)}"
        )

@router.post("/process-file")
async def process_video_file(
    camera_id: str,
    location_id: str,
    video_file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Process a video file for safety violations."""
    try:
        # Save uploaded file temporarily
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            content = await video_file.read()
            temp_file.write(content)
            temp_file_path = temp_file.name
        
        try:
            # Process video file
            results = await video_service.process_video_file(
                file_path=temp_file_path,
                camera_id=camera_id,
                location_id=location_id
            )
            
            return {
                "message": "Video file processed successfully",
                "results": results
            }
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing video file: {str(e)}"
        )

@router.websocket("/ws/{connection_type}")
async def websocket_endpoint(
    websocket: WebSocket,
    connection_type: str
):
    """WebSocket endpoint for real-time video and alert updates."""
    await websocket_service.handle_websocket_connection(websocket, connection_type)

@router.get("/cameras", response_model=List[Camera])
async def get_cameras(
    current_user: User = Depends(get_current_active_user)
):
    """Get all cameras."""
    try:
        database = get_database()
        cursor = database.cameras.find()
        cameras = []
        
        async for camera_doc in cursor:
            cameras.append(Camera(**camera_doc))
        
        return cameras
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving cameras: {str(e)}"
        )

@router.post("/cameras", response_model=Camera)
async def create_camera(
    camera_data: CameraCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new camera."""
    try:
        database = get_database()
        
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
            camera_doc["_id"] = result.inserted_id
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

@router.put("/cameras/{camera_id}", response_model=Camera)
async def update_camera(
    camera_id: str,
    update_data: CameraUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a camera."""
    try:
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
            return Camera(**updated_camera)
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

@router.delete("/cameras/{camera_id}")
async def delete_camera(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a camera."""
    try:
        database = get_database()
        
        # Check if camera exists
        existing_camera = await database.cameras.find_one({"camera_id": camera_id})
        if not existing_camera:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Stop video processing if active
        if video_service.get_stream_status(camera_id):
            await video_service.stop_video_stream(camera_id)
        
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

@router.post("/record/start/{camera_id}")
async def start_recording(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Start recording for a specific camera."""
    try:
        # Get camera info
        database = get_database()
        camera_doc = await database.cameras.find_one({"camera_id": camera_id})
        if not camera_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Camera not found"
            )
        
        # Check if camera is active
        if camera_doc.get("status") != "Active":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Camera is not active"
            )
        
        # Start recording
        recording_info = await video_service.start_recording(
            camera_id=camera_id,
            stream_url=camera_doc["stream_url"],
            location_id=camera_doc["site_id"]
        )
        
        return {
            "message": f"Recording started for camera {camera_id}",
            "recording_id": recording_info.get("recording_id"),
            "start_time": recording_info.get("start_time")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error starting recording: {str(e)}"
        )

@router.post("/record/stop/{camera_id}")
async def stop_recording(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Stop recording for a specific camera."""
    try:
        # Stop recording
        recording_info = await video_service.stop_recording(camera_id)
        
        return {
            "message": f"Recording stopped for camera {camera_id}",
            "recording_id": recording_info.get("recording_id"),
            "duration": recording_info.get("duration"),
            "file_path": recording_info.get("file_path")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error stopping recording: {str(e)}"
        )

@router.get("/record/status/{camera_id}")
async def get_recording_status(
    camera_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get the recording status for a specific camera."""
    try:
        status = video_service.get_recording_status(camera_id)
        if status is None:
            return {
                "camera_id": camera_id,
                "is_recording": False,
                "message": "No active recording"
            }
        
        return {
            "camera_id": camera_id,
            "is_recording": True,
            "recording_id": status.get("recording_id"),
            "start_time": status.get("start_time"),
            "duration": status.get("duration")
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting recording status: {str(e)}"
        )

@router.get("/record/list/{camera_id}")
async def get_recording_list(
    camera_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user)
):
    """Get list of recordings for a specific camera."""
    try:
        recordings = await video_service.get_recording_list(
            camera_id=camera_id,
            skip=skip,
            limit=limit
        )
        
        return {
            "camera_id": camera_id,
            "recordings": recordings,
            "total": len(recordings)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting recording list: {str(e)}"
        )

@router.get("/record/download/{recording_id}")
async def download_recording(
    recording_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Download a specific recording file."""
    try:
        recording_file = await video_service.get_recording_file(recording_id)
        if not recording_file:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recording file not found"
            )
        
        # Return file for download
        return StreamingResponse(
            open(recording_file["file_path"], "rb"),
            media_type="video/mp4",
            headers={
                "Content-Disposition": f"attachment; filename={recording_file['filename']}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading recording: {str(e)}"
        )
