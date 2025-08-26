import cv2
import numpy as np
import asyncio
import logging
from typing import Optional, Callable, Dict, Any
from datetime import datetime
import os
import tempfile
import uuid
from pathlib import Path

from app.core.ai_engine import AIEngine
from app.core.config import settings
from app.models.safety import AlertCreate
from app.services.alert_service import AlertService
from app.services.websocket_service import WebSocketService
from app.core.logging import get_logger

logger = get_logger(__name__)

class VideoService:
    def __init__(self):
        self.ai_engine = AIEngine()
        self.alert_service = AlertService()
        self.websocket_service = WebSocketService()
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
        """Process video stream frames for live monitoring and alert creation."""
        cap = None
        frame_count = 0
        last_alert_time = {}  # Track last alert time for each violation type
        alert_cooldown = 30  # Seconds between alerts of the same type
        
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
            
            # Set frame processing rate (process every 3rd frame for performance)
            frame_skip = 3
            processed_frames = 0
            
            while self.active_streams.get(camera_id, {}).get("is_active", False):
                ret, frame = cap.read()
                if not ret:
                    logger.warning(f"Failed to read frame from camera {camera_id}")
                    await asyncio.sleep(0.1)
                    continue
                
                frame_count += 1
                
                # Process every nth frame for performance
                if frame_count % frame_skip != 0:
                    continue
                
                processed_frames += 1
                
                try:
                    # Analyze frame for safety violations
                    analysis_result = self._analyze_frame_for_alerts(
                        frame, camera_id, location_id, frame_count
                    )
                    
                    if analysis_result and analysis_result.get("alert_required"):
                        # Check if we should create an alert (avoid spam)
                        should_create_alert = await self._should_create_alert(
                            analysis_result, last_alert_time, alert_cooldown
                        )
                        
                        if should_create_alert:
                            # Create alert in database
                            alert_created = await self._create_alert_from_analysis(
                                analysis_result, frame, camera_id, location_id
                            )
                            
                            if alert_created:
                                # Update last alert time for this violation type
                                violation_type = analysis_result["primary_violation"].violation_type.value
                                last_alert_time[violation_type] = datetime.utcnow()
                                
                                # Update stream statistics
                                if camera_id in self.active_streams:
                                    self.active_streams[camera_id]["alert_count"] += 1
                                
                                logger.info(f"Alert created for camera {camera_id}: {violation_type}")
                    
                    # Update stream statistics
                    if camera_id in self.active_streams:
                        self.active_streams[camera_id]["frame_count"] = processed_frames
                    
                    # Call callback if provided
                    if callback:
                        await callback({
                            "type": "frame_processed",
                            "camera_id": camera_id,
                            "frame_number": frame_count,
                            "detections": analysis_result.get("detections", []) if analysis_result else [],
                            "alerts_generated": analysis_result.get("alert_required", False) if analysis_result else False
                        })
                    
                    # Control frame rate for performance
                    await asyncio.sleep(1.0 / settings.FRAME_RATE if hasattr(settings, 'FRAME_RATE') else 0.1)
                    
                except Exception as frame_error:
                    logger.error(f"Error processing frame {frame_count} for camera {camera_id}: {frame_error}")
                    continue
                
        except asyncio.CancelledError:
            logger.info(f"Video stream processing cancelled for camera {camera_id}")
        except Exception as e:
            logger.error(f"Error in video stream processing for camera {camera_id}: {e}")
        finally:
            if cap:
                cap.release()
            logger.info(f"Video stream processing ended for camera {camera_id}")
    
    def _analyze_frame_for_alerts(self, frame: np.ndarray, camera_id: str, 
                                 location_id: str, frame_number: int) -> Optional[Dict[str, Any]]:
        """Analyze a frame for safety violations and determine if alerts are needed."""
        try:
            # Use the enhanced AI engine analysis
            analysis_result = self.ai_engine.analyze_frame(
                frame=frame,
                camera_id=camera_id,
                timestamp=datetime.utcnow(),
                frame_number=frame_number
            )
            
            # Debug logging to see what's returned
            if analysis_result and analysis_result.get("primary_violation"):
                primary_violation = analysis_result["primary_violation"]
                logger.info(f"Primary violation type: {type(primary_violation)}")
                logger.info(f"Primary violation content: {primary_violation}")
                if hasattr(primary_violation, 'violation_type'):
                    logger.info(f"Violation type: {primary_violation.violation_type}")
                else:
                    logger.info(f"Primary violation is not an object with violation_type attribute")
            
            return analysis_result
            
        except Exception as e:
            logger.error(f"Error analyzing frame for alerts: {e}")
            return None
    
    async def _should_create_alert(self, analysis_result: Dict[str, Any], 
                                 last_alert_time: Dict[str, datetime], 
                                 cooldown: int) -> bool:
        """Determine if an alert should be created based on cooldown periods."""
        try:
            if not analysis_result.get("primary_violation"):
                return False
            
            violation_type = analysis_result["primary_violation"].violation_type.value
            current_time = datetime.utcnow()
            
            # Check if enough time has passed since last alert of this type
            if violation_type in last_alert_time:
                time_since_last = (current_time - last_alert_time[violation_type]).total_seconds()
                if time_since_last < cooldown:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error checking alert cooldown: {e}")
            return True  # Default to allowing alert creation
    
    async def _create_alert_from_analysis(self, analysis_result: Dict[str, Any], 
                                        frame: np.ndarray, camera_id: str, 
                                        location_id: str) -> bool:
        """Create an alert in the database from analysis results."""
        try:
            primary_violation = analysis_result["primary_violation"]
            
            # Check if primary_violation is a dictionary or object
            if isinstance(primary_violation, dict):
                # Handle dictionary format
                logger.warning(f"Primary violation is a dictionary, not AlertCreate object: {primary_violation}")
                return False
            else:
                # Handle AlertCreate object format
                # Create snapshot of the frame
                snapshot_url = await self._save_snapshot(frame, camera_id, primary_violation)
                
                # Create alert data
                alert_data = AlertCreate(
                    violation_type=primary_violation.violation_type,
                    severity_level=primary_violation.severity_level,
                    description=primary_violation.description,
                    confidence_score=primary_violation.confidence_score,
                    location_id=location_id,
                    camera_id=camera_id,
                    primary_object=primary_violation.primary_object,
                    snapshot_url=snapshot_url
                )
                
                # Create alert in database
                alert = await self.alert_service.create_alert(alert_data)
                
                if alert:
                    logger.info(f"Successfully created alert {alert.alert_id} for camera {camera_id}")
                    return True
                else:
                    logger.error(f"Failed to create alert for camera {camera_id}")
                    return False
                
        except Exception as e:
            logger.error(f"Error creating alert from analysis: {e}")
            return False
    
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
    
    async def process_video_file(self, upload_id: str, file_path: str, camera_id: str, user_id: str):
        """Process an uploaded video file to test alert generation."""
        try:
            logger.info(f"Starting video file processing: {upload_id}")
            
            # Set a maximum processing time (e.g., 10 minutes)
            max_processing_time = 600  # seconds
            start_time = datetime.utcnow()
            
            # Open video file
            cap = cv2.VideoCapture(file_path)
            if not cap.isOpened():
                logger.error(f"Failed to open video file: {file_path}")
                return
            
            # Get video properties
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            duration = total_frames / fps if fps > 0 else 0
            
            logger.info(f"Video file info: {total_frames} frames, {fps} FPS, {duration:.2f}s duration")
            
            # Process frames
            frame_count = 0
            alerts_generated = 0
            frame_skip = max(1, int(fps / 5))  # Process 5 FPS for performance
            
            while True:
                # Check for timeout
                elapsed_time = (datetime.utcnow() - start_time).total_seconds()
                if elapsed_time > max_processing_time:
                    logger.warning(f"Video processing timeout after {elapsed_time:.1f}s for {upload_id}")
                    break
                
                ret, frame = cap.read()
                if not ret:
                    break
                
                frame_count += 1
                
                # Process every nth frame
                if frame_count % frame_skip == 0:
                    try:
                        # Run AI analysis on frame
                        analysis_result = self.ai_engine.analyze_frame(
                            frame=frame,
                            camera_id=camera_id,
                            timestamp=datetime.utcnow(),
                            frame_number=frame_count
                        )
                        
                        # Check if alert should be generated
                        if analysis_result and analysis_result.get("alert_required"):
                            # Calculate video timestamp
                            video_timestamp = frame_count / fps if fps > 0 else 0
                            
                            # Debug logging for analysis result
                            logger.info(f"Analysis result for frame {frame_count}: {analysis_result}")
                            logger.info(f"Alert required: {analysis_result.get('alert_required')}")
                            logger.info(f"Primary violation: {analysis_result.get('primary_violation')}")
                            
                            # Check if we have a valid primary violation
                            primary_violation = analysis_result.get("primary_violation")
                            if primary_violation is None:
                                logger.warning(f"No primary violation found in analysis result for frame {frame_count}")
                                continue
                            
                            # Create alert using the primary violation data
                            try:
                                if hasattr(primary_violation, 'violation_type'):
                                    # It's an AlertCreate object - use it directly
                                    logger.info(f"Using AlertCreate object directly for alert creation")
                                    
                                    # Update the location_id if it's "unknown" and we have a better one
                                    if primary_violation.location_id == "unknown":
                                        # Create a new AlertCreate object with the correct location_id
                                        from app.models.safety import AlertCreate
                                        updated_alert = AlertCreate(
                                            violation_type=primary_violation.violation_type,
                                            severity_level=primary_violation.severity_level,
                                            description=primary_violation.description,
                                            confidence_score=primary_violation.confidence_score,
                                            location_id="main_entrance",  # Use actual location from context
                                            camera_id=primary_violation.camera_id,
                                            primary_object=primary_violation.primary_object,
                                            snapshot_url=primary_violation.snapshot_url
                                        )
                                        alert_id = await self.alert_service.create_alert(updated_alert)
                                    else:
                                        alert_id = await self.alert_service.create_alert(primary_violation)
                                else:
                                    # It's a dictionary or other format
                                    logger.warning(f"Primary violation is not an AlertCreate object: {type(primary_violation)}")
                                    logger.warning(f"Primary violation content: {primary_violation}")
                                    continue
                            except Exception as alert_data_error:
                                logger.error(f"Error creating alert: {alert_data_error}")
                                continue
                            
                            if alert_id:
                                alerts_generated += 1
                                logger.info(f"Alert generated from video file: {alert_id.alert_id} at frame {frame_count}")
                                
                                # Notify via WebSocket if available
                                try:
                                    # Use the actual alert object for broadcasting
                                    asyncio.create_task(self.websocket_service.broadcast_alert(alert_id))
                                except Exception as ws_error:
                                    logger.warning(f"Failed to broadcast alert via WebSocket: {ws_error}")
                        
                        # Update progress
                        progress = (frame_count / total_frames) * 100
                        
                        # Update upload status in the global dictionary
                        try:
                            # Import the global uploaded_videos dictionary
                            from app.api.v1.endpoints.video import uploaded_videos
                            if upload_id in uploaded_videos:
                                uploaded_videos[upload_id]["processing_progress"] = progress
                                uploaded_videos[upload_id]["alerts_generated"] = alerts_generated
                        except Exception as e:
                            logger.warning(f"Failed to update upload status: {e}")
                        
                        # Log progress
                        if frame_count % 30 == 0:  # Log every 30 frames
                            logger.info(f"Video processing progress: {progress:.1f}% ({frame_count}/{total_frames})")
                    
                    except Exception as frame_error:
                        logger.error(f"Error processing frame {frame_count}: {frame_error}")
                        continue
            
            # Cleanup
            cap.release()
            
            # Update final status
            logger.info(f"Video file processing completed: {upload_id}")
            logger.info(f"Total frames processed: {frame_count}")
            logger.info(f"Alerts generated: {alerts_generated}")
            
            # Update final status in the global dictionary
            try:
                from app.api.v1.endpoints.video import uploaded_videos
                if upload_id in uploaded_videos:
                    # Check if we timed out
                    elapsed_time = (datetime.utcnow() - start_time).total_seconds()
                    if elapsed_time > max_processing_time:
                        uploaded_videos[upload_id]["status"] = "timeout"
                        logger.warning(f"Processing timed out for {upload_id}")
                    else:
                        uploaded_videos[upload_id]["status"] = "completed"
                        logger.info(f"Processing completed for {upload_id}")
                    
                    uploaded_videos[upload_id]["process_end_time"] = datetime.utcnow()
                    uploaded_videos[upload_id]["processing_progress"] = 100
                    uploaded_videos[upload_id]["alerts_generated"] = alerts_generated
                    logger.info(f"Updated upload status for {upload_id}")
            except Exception as e:
                logger.warning(f"Failed to update final upload status: {e}")
            
        except Exception as e:
            logger.error(f"Error processing video file {upload_id}: {e}")
        finally:
            # Ensure video capture is released
            try:
                if 'cap' in locals():
                    cap.release()
            except:
                pass
    
    def get_stream_status(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a video stream."""
        return self.active_streams.get(camera_id)
    
    def get_all_streams_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all active streams."""
        return self.active_streams.copy()
    
    def get_recording_status(self, camera_id: str) -> Optional[Dict[str, Any]]:
        """Get the recording status of a camera."""
        # For now, return None as recording is not implemented yet
        # This could be extended to track actual recording status
        return None
    
    async def get_frame_from_camera(self, camera_id: str) -> Optional[np.ndarray]:
        """Get a single frame from a camera."""
        try:
            # Check if camera is in active streams
            if camera_id not in self.active_streams:
                return None
            
            stream_info = self.active_streams[camera_id]
            if not stream_info["is_active"]:
                return None
            
            # Get frame from stream
            cap = cv2.VideoCapture(stream_info["stream_url"])
            if not cap.isOpened():
                return None
            
            ret, frame = cap.read()
            cap.release()
            
            if ret:
                # Update frame count
                stream_info["frame_count"] += 1
                return frame
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting frame from camera {camera_id}: {e}")
            return None
