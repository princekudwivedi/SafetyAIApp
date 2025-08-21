import cv2
import numpy as np
import asyncio
import logging
from typing import Optional, Callable, Dict, Any
from datetime import datetime
import os
from app.core.ai_engine import AIEngine
from app.core.config import settings
from app.models.safety import AlertCreate
from app.services.alert_service import AlertService

logger = logging.getLogger(__name__)

class VideoService:
    def __init__(self):
        self.ai_engine = AIEngine()
        self.alert_service = AlertService()
        self.active_streams: Dict[str, Dict[str, Any]] = {}
        self.processing_tasks: Dict[str, asyncio.Task] = {}
    
    async def start_video_stream(self, camera_id: str, stream_url: str, 
                               location_id: str, callback: Optional[Callable] = None):
        """Start processing a video stream."""
        if camera_id in self.active_streams:
            logger.warning(f"Stream for camera {camera_id} is already active")
            return
        
        try:
            # Initialize stream info
            self.active_streams[camera_id] = {
                "stream_url": stream_url,
                "location_id": location_id,
                "is_active": True,
                "start_time": datetime.utcnow(),
                "frame_count": 0,
                "alert_count": 0
            }
            
            # Start processing task
            task = asyncio.create_task(
                self._process_video_stream(camera_id, stream_url, location_id, callback)
            )
            self.processing_tasks[camera_id] = task
            
            logger.info(f"Started video stream processing for camera {camera_id}")
            
        except Exception as e:
            logger.error(f"Failed to start video stream for camera {camera_id}: {e}")
            if camera_id in self.active_streams:
                del self.active_streams[camera_id]
    
    async def stop_video_stream(self, camera_id: str):
        """Stop processing a video stream."""
        if camera_id not in self.active_streams:
            logger.warning(f"No active stream found for camera {camera_id}")
            return
        
        try:
            # Stop the stream
            self.active_streams[camera_id]["is_active"] = False
            
            # Cancel processing task
            if camera_id in self.processing_tasks:
                self.processing_tasks[camera_id].cancel()
                try:
                    await self.processing_tasks[camera_id]
                except asyncio.CancelledError:
                    pass
                del self.processing_tasks[camera_id]
            
            # Clean up stream info
            del self.active_streams[camera_id]
            
            logger.info(f"Stopped video stream processing for camera {camera_id}")
            
        except Exception as e:
            logger.error(f"Error stopping video stream for camera {camera_id}: {e}")
    
    async def _process_video_stream(self, camera_id: str, stream_url: str, 
                                  location_id: str, callback: Optional[Callable] = None):
        """Process video stream frames."""
        cap = None
        frame_skip = 0  # Process every nth frame for performance
        
        try:
            # Open video capture
            if stream_url.startswith(('http://', 'https://', 'rtsp://')):
                cap = cv2.VideoCapture(stream_url)
            elif os.path.exists(stream_url):
                cap = cv2.VideoCapture(stream_url)
            else:
                # Try webcam
                cap = cv2.VideoCapture(0)
            
            if not cap.isOpened():
                logger.error(f"Failed to open video stream: {stream_url}")
                return
            
            logger.info(f"Successfully opened video stream for camera {camera_id}")
            
            while self.active_streams.get(camera_id, {}).get("is_active", False):
                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"Failed to read frame from camera {camera_id}")
                    await asyncio.sleep(0.1)
                    continue
                
                # Skip frames for performance (process every 3rd frame)
                frame_skip += 1
                if frame_skip % 3 != 0:
                    continue
                
                # Resize frame for consistent processing
                frame = cv2.resize(frame, (settings.FRAME_WIDTH, settings.FRAME_HEIGHT))
                
                # Process frame with AI
                detections, alerts = self.ai_engine.process_frame(frame, camera_id, location_id)
                
                # Update stream statistics
                if camera_id in self.active_streams:
                    self.active_streams[camera_id]["frame_count"] += 1
                    self.active_streams[camera_id]["alert_count"] += len(alerts)
                
                # Save alerts to database
                for alert in alerts:
                    try:
                        # Generate snapshot
                        snapshot_path = await self._save_snapshot(frame, camera_id, alert)
                        if snapshot_path:
                            alert.snapshot_url = snapshot_path
                        
                        # Save alert to database
                        await self.alert_service.create_alert(alert)
                        
                        # Call callback if provided
                        if callback:
                            await callback(alert)
                            
                    except Exception as e:
                        logger.error(f"Error processing alert: {e}")
                
                # Draw detections on frame
                processed_frame = self.ai_engine.draw_detections(frame, detections)
                
                # Call callback with processed frame if provided
                if callback:
                    await callback({
                        "type": "frame",
                        "camera_id": camera_id,
                        "frame": processed_frame,
                        "detections": detections
                    })
                
                # Control frame rate
                await asyncio.sleep(1.0 / settings.FRAME_RATE)
                
        except asyncio.CancelledError:
            logger.info(f"Video stream processing cancelled for camera {camera_id}")
        except Exception as e:
            logger.error(f"Error in video stream processing for camera {camera_id}: {e}")
        finally:
            if cap:
                cap.release()
            logger.info(f"Video stream processing ended for camera {camera_id}")
    
    async def _save_snapshot(self, frame: np.ndarray, camera_id: str, 
                            alert: AlertCreate) -> Optional[str]:
        """Save a snapshot of the frame for the alert."""
        try:
            # Create alerts directory if it doesn't exist
            alerts_dir = os.path.join(settings.ALERTS_DIR, camera_id, 
                                    datetime.utcnow().strftime("%Y/%m/%d"))
            os.makedirs(alerts_dir, exist_ok=True)
            
            # Generate filename
            timestamp = datetime.utcnow().strftime("%H%M%S")
            filename = f"{timestamp}_{alert.violation_type.value.lower().replace(' ', '_')}.jpg"
            filepath = os.path.join(alerts_dir, filename)
            
            # Save frame
            cv2.imwrite(filepath, frame)
            
            # Return relative path for storage
            return f"alerts/{camera_id}/{datetime.utcnow().strftime('%Y/%m/%d')}/{filename}"
            
        except Exception as e:
            logger.error(f"Error saving snapshot: {e}")
            return None
    
    async def process_video_file(self, file_path: str, camera_id: str, 
                               location_id: str) -> Dict[str, Any]:
        """Process a video file and return results."""
        try:
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {file_path}")
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            
            results = {
                "total_frames": total_frames,
                "fps": fps,
                "duration": total_frames / fps if fps > 0 else 0,
                "detections": [],
                "alerts": [],
                "processed_frames": 0
            }
            
            frame_count = 0
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Process every 5th frame for performance
                if frame_count % 5 == 0:
                    # Resize frame
                    frame = cv2.resize(frame, (settings.FRAME_WIDTH, settings.FRAME_HEIGHT))
                    
                    # Process frame
                    detections, alerts = self.ai_engine.process_frame(frame, camera_id, location_id)
                    
                    # Store results
                    results["detections"].extend(detections)
                    results["alerts"].extend(alerts)
                    results["processed_frames"] += 1
                
                frame_count += 1
                
                # Progress update
                if frame_count % 100 == 0:
                    logger.info(f"Processed {frame_count}/{total_frames} frames")
            
            cap.release()
            
            logger.info(f"Video file processing completed. Found {len(results['alerts'])} alerts.")
            return results
            
        except Exception as e:
            logger.error(f"Error processing video file: {e}")
            raise
    
    def get_stream_status(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a video stream."""
        return self.active_streams.get(camera_id)
    
    def get_all_streams_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all active streams."""
        return self.active_streams.copy()
    
    async def get_frame_from_camera(self, camera_id: str) -> Optional[np.ndarray]:
        """Get a single frame from a camera."""
        if camera_id not in self.active_streams:
            return None
        
        try:
            stream_url = self.active_streams[camera_id]["stream_url"]
            cap = cv2.VideoCapture(stream_url)
            
            if not cap.isOpened():
                return None
            
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                return cv2.resize(frame, (settings.FRAME_WIDTH, settings.FRAME_HEIGHT))
            
        except Exception as e:
            logger.error(f"Error getting frame from camera {camera_id}: {e}")
        
        return None
