import cv2
import numpy as np
from ultralytics import YOLO
from typing import List, Dict, Any, Tuple
import logging
from datetime import datetime
import uuid
from app.core.config import settings
from app.models.safety import (
    ObjectType, ViolationType, SeverityLevel, 
    PrimaryObject, AlertCreate, Alert
)

logger = logging.getLogger(__name__)

class AIEngine:
    def __init__(self):
        self.model = None
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD
        self.nms_threshold = settings.NMS_THRESHOLD
        self.initialize_model()
        
    def initialize_model(self):
        """Initialize the YOLO model."""
        try:
            self.model = YOLO(settings.YOLO_MODEL_PATH)
            logger.info(f"YOLO model loaded successfully from {settings.YOLO_MODEL_PATH}")
        except Exception as e:
            logger.error(f"Failed to load YOLO model: {e}")
            # Fallback to default YOLO model
            try:
                self.model = YOLO("yolov8n.pt")
                logger.info("Loaded default YOLOv8n model as fallback")
            except Exception as fallback_error:
                logger.error(f"Failed to load fallback model: {fallback_error}")
                raise fallback_error
    
    def detect_objects(self, frame: np.ndarray) -> List[Dict[str, Any]]:
        """Detect objects in a frame using YOLO."""
        try:
            results = self.model(frame, conf=self.confidence_threshold, iou=self.nms_threshold)
            detections = []
            
            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0].cpu().numpy())
                        class_id = int(box.cls[0].cpu().numpy())
                        class_name = result.names[class_id]
                        
                        # Map YOLO classes to our ObjectType enum
                        mapped_type = self._map_yolo_class(class_name)
                        
                        if mapped_type:
                            detection = {
                                "type": mapped_type,
                                "confidence": confidence,
                                "bbox": [int(x1), int(y1), int(x2), int(y2)],
                                "class_name": class_name,
                                "class_id": class_id
                            }
                            detections.append(detection)
            
            return detections
        except Exception as e:
            logger.error(f"Error in object detection: {e}")
            return []
    
    def _map_yolo_class(self, class_name: str) -> ObjectType:
        """Map YOLO class names to our ObjectType enum."""
        class_mapping = {
            "person": ObjectType.WORKER,
            "hardhat": ObjectType.HARD_HAT,
            "vest": ObjectType.SAFETY_VEST,
            "goggles": ObjectType.SAFETY_GOGGLES,
            "gloves": ObjectType.SAFETY_GLOVES,
            "helmet": ObjectType.HELMET,
            "forklift": ObjectType.FORKLIFT,
            "crane": ObjectType.CRANE,
            "excavator": ObjectType.EXCAVATOR,
            "fire": ObjectType.FIRE_EXTINGUISHER,
            "exit": ObjectType.EMERGENCY_EXIT,
            "spill": ObjectType.SPILL,
            "barrier": ObjectType.SAFETY_BARRIER,
            "tool": ObjectType.TOOLS,
            "machinery": ObjectType.MACHINERY
        }
        
        # Try exact match first
        if class_name in class_mapping:
            return class_mapping[class_name]
        
        # Try partial matching
        for key, value in class_mapping.items():
            if key in class_name.lower() or class_name.lower() in key:
                return value
        
        # Default to worker for person-like objects
        if "person" in class_name.lower():
            return ObjectType.WORKER
        
        return None
    
    def analyze_safety_violations(self, detections: List[Dict[str, Any]], 
                                 frame: np.ndarray, camera_id: str, 
                                 location_id: str) -> List[AlertCreate]:
        """Analyze detections for safety violations and generate alerts."""
        alerts = []
        
        try:
            # Group detections by type
            workers = [d for d in detections if d["type"] == ObjectType.WORKER]
            ppe_items = [d for d in detections if d["type"] in [
                ObjectType.HARD_HAT, ObjectType.SAFETY_VEST, 
                ObjectType.SAFETY_GOGGLES, ObjectType.SAFETY_GLOVES
            ]]
            machinery = [d for d in detections if d["type"] in [
                ObjectType.MACHINERY, ObjectType.FORKLIFT, ObjectType.CRANE, ObjectType.EXCAVATOR
            ]]
            
            # Check PPE compliance
            for worker in workers:
                worker_bbox = worker["bbox"]
                worker_center = self._get_bbox_center(worker_bbox)
                
                # Check if worker has hard hat
                if not self._has_nearby_ppe(worker_center, ppe_items, ObjectType.HARD_HAT):
                    alert = self._create_ppe_violation_alert(
                        worker, ObjectType.HARD_HAT, "No Hard Hat",
                        camera_id, location_id, frame
                    )
                    if alert:
                        alerts.append(alert)
                
                # Check if worker has safety vest
                if not self._has_nearby_ppe(worker_center, ppe_items, ObjectType.SAFETY_VEST):
                    alert = self._create_ppe_violation_alert(
                        worker, ObjectType.SAFETY_VEST, "No Safety Vest",
                        camera_id, location_id, frame
                    )
                    if alert:
                        alerts.append(alert)
                
                # Check proximity to machinery
                for machine in machinery:
                    if self._check_unsafe_proximity(worker_bbox, machine["bbox"]):
                        alert = self._create_proximity_violation_alert(
                            worker, machine, camera_id, location_id, frame
                        )
                        if alert:
                            alerts.append(alert)
            
            # Check for environmental hazards
            spills = [d for d in detections if d["type"] == ObjectType.SPILL]
            for spill in spills:
                alert = self._create_environmental_hazard_alert(
                    spill, "Spill Detected", camera_id, location_id, frame
                )
                if alert:
                    alerts.append(alert)
            
            # Check for blocked exits
            exits = [d for d in detections if d["type"] == ObjectType.EMERGENCY_EXIT]
            for exit_obj in exits:
                if self._is_exit_blocked(exit_obj["bbox"], detections):
                    alert = self._create_environmental_hazard_alert(
                        exit_obj, "Blocked Exit", camera_id, location_id, frame
                    )
                    if alert:
                        alerts.append(alert)
        
        except Exception as e:
            logger.error(f"Error in safety analysis: {e}")
        
        return alerts
    
    def _get_bbox_center(self, bbox: List[int]) -> Tuple[int, int]:
        """Get the center point of a bounding box."""
        x1, y1, x2, y2 = bbox
        return ((x1 + x2) // 2, (y1 + y2) // 2)
    
    def _has_nearby_ppe(self, worker_center: Tuple[int, int], 
                        ppe_items: List[Dict[str, Any]], 
                        ppe_type: ObjectType) -> bool:
        """Check if a worker has nearby PPE of the specified type."""
        proximity_threshold = 100  # pixels
        
        for ppe in ppe_items:
            if ppe["type"] == ppe_type:
                ppe_center = self._get_bbox_center(ppe["bbox"])
                distance = np.sqrt(
                    (worker_center[0] - ppe_center[0])**2 + 
                    (worker_center[1] - ppe_center[1])**2
                )
                if distance < proximity_threshold:
                    return True
        
        return False
    
    def _check_unsafe_proximity(self, worker_bbox: List[int], 
                               machine_bbox: List[int]) -> bool:
        """Check if worker is too close to machinery."""
        # Calculate distance between bounding boxes
        worker_center = self._get_bbox_center(worker_bbox)
        machine_center = self._get_bbox_center(machine_bbox)
        
        distance = np.sqrt(
            (worker_center[0] - machine_center[0])**2 + 
            (worker_center[1] - machine_center[1])**2
        )
        
        # Define unsafe proximity threshold
        unsafe_threshold = 150  # pixels
        return distance < unsafe_threshold
    
    def _is_exit_blocked(self, exit_bbox: List[int], 
                         detections: List[Dict[str, Any]]) -> bool:
        """Check if an emergency exit is blocked."""
        exit_center = self._get_bbox_center(exit_bbox)
        blocking_threshold = 80  # pixels
        
        for detection in detections:
            if detection["type"] not in [ObjectType.WORKER, ObjectType.VISITOR]:
                obj_center = self._get_bbox_center(detection["bbox"])
                distance = np.sqrt(
                    (exit_center[0] - obj_center[0])**2 + 
                    (exit_center[1] - obj_center[1])**2
                )
                if distance < blocking_threshold:
                    return True
        
        return False
    
    def _create_ppe_violation_alert(self, worker: Dict[str, Any], 
                                   ppe_type: ObjectType, violation_desc: str,
                                   camera_id: str, location_id: str, 
                                   frame: np.ndarray) -> AlertCreate:
        """Create a PPE violation alert."""
        try:
            alert_id = f"AL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
            
            primary_object = PrimaryObject(
                object_type=ObjectType.WORKER,
                object_id=f"WORKER_{uuid.uuid4().hex[:8].upper()}",
                bounding_box=worker["bbox"],
                confidence=worker["confidence"]
            )
            
            return AlertCreate(
                violation_type=ViolationType.NO_HARD_HAT if ppe_type == ObjectType.HARD_HAT else ViolationType.NO_SAFETY_VEST,
                severity_level=SeverityLevel.HIGH,
                description=f"Worker identified without {ppe_type.value.lower()} in {location_id}.",
                confidence_score=worker["confidence"],
                location_id=location_id,
                camera_id=camera_id,
                primary_object=primary_object
            )
        except Exception as e:
            logger.error(f"Error creating PPE violation alert: {e}")
            return None
    
    def _create_proximity_violation_alert(self, worker: Dict[str, Any], 
                                        machine: Dict[str, Any],
                                        camera_id: str, location_id: str, 
                                        frame: np.ndarray) -> AlertCreate:
        """Create an unsafe proximity violation alert."""
        try:
            alert_id = f"AL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
            
            primary_object = PrimaryObject(
                object_type=ObjectType.WORKER,
                object_id=f"WORKER_{uuid.uuid4().hex[:8].upper()}",
                bounding_box=worker["bbox"],
                confidence=worker["confidence"]
            )
            
            return AlertCreate(
                violation_type=ViolationType.UNSAFE_PROXIMITY,
                severity_level=SeverityLevel.MEDIUM,
                description=f"Worker too close to {machine['type'].value.lower()} in {location_id}.",
                confidence_score=worker["confidence"],
                location_id=location_id,
                camera_id=camera_id,
                primary_object=primary_object
            )
        except Exception as e:
            logger.error(f"Error creating proximity violation alert: {e}")
            return None
    
    def _create_environmental_hazard_alert(self, hazard: Dict[str, Any], 
                                         violation_desc: str,
                                         camera_id: str, location_id: str, 
                                         frame: np.ndarray) -> AlertCreate:
        """Create an environmental hazard alert."""
        try:
            alert_id = f"AL-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}"
            
            primary_object = PrimaryObject(
                object_type=hazard["type"],
                object_id=f"{hazard['type'].value.upper()}_{uuid.uuid4().hex[:8].upper()}",
                bounding_box=hazard["bbox"],
                confidence=hazard["confidence"]
            )
            
            return AlertCreate(
                violation_type=ViolationType.SPILL if "Spill" in violation_desc else ViolationType.BLOCKED_EXIT,
                severity_level=SeverityLevel.MEDIUM,
                description=f"{violation_desc} detected in {location_id}.",
                confidence_score=hazard["confidence"],
                location_id=location_id,
                camera_id=camera_id,
                primary_object=primary_object
            )
        except Exception as e:
            logger.error(f"Error creating environmental hazard alert: {e}")
            return None
    
    def process_frame(self, frame: np.ndarray, camera_id: str, 
                     location_id: str) -> Tuple[List[Dict[str, Any]], List[AlertCreate]]:
        """Process a single frame and return detections and alerts."""
        # Detect objects
        detections = self.detect_objects(frame)
        
        # Analyze safety violations
        alerts = self.analyze_safety_violations(detections, frame, camera_id, location_id)
        
        return detections, alerts
    
    def draw_detections(self, frame: np.ndarray, 
                       detections: List[Dict[str, Any]]) -> np.ndarray:
        """Draw bounding boxes and labels on the frame."""
        frame_copy = frame.copy()
        
        for detection in detections:
            bbox = detection["bbox"]
            label = f"{detection['type'].value}: {detection['confidence']:.2f}"
            
            # Draw bounding box
            cv2.rectangle(frame_copy, (bbox[0], bbox[1]), (bbox[2], bbox[3]), (0, 255, 0), 2)
            
            # Draw label background
            (label_width, label_height), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(frame_copy, (bbox[0], bbox[1] - label_height - 10), 
                         (bbox[0] + label_width, bbox[1]), (0, 255, 0), -1)
            
            # Draw label text
            cv2.putText(frame_copy, label, (bbox[0], bbox[1] - 5), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        
        return frame_copy
