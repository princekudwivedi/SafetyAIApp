from app.models.base import BaseDBModel, PyObjectId
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class SeverityLevel(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class AlertStatus(str, Enum):
    NEW = "New"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    DISMISSED = "Dismissed"

class ViolationType(str, Enum):
    NO_HARD_HAT = "No Hard Hat"
    NO_SAFETY_VEST = "No Safety Vest"
    NO_SAFETY_GOGGLES = "No Safety Goggles"
    NO_SAFETY_GLOVES = "No Safety Gloves"
    NO_FALL_PROTECTION = "No Fall Protection"
    UNSAFE_PROXIMITY = "Unsafe Proximity"
    BLOCKED_EXIT = "Blocked Exit"
    FIRE_HAZARD = "Fire Hazard"
    SPILL = "Spill"
    UNATTENDED_OBJECT = "Unattended Object"
    UNSAFE_BEHAVIOR = "Unsafe Behavior"

class ObjectType(str, Enum):
    WORKER = "Worker"
    VISITOR = "Visitor"
    HARD_HAT = "Hard Hat"
    SAFETY_VEST = "Safety Vest"
    SAFETY_GOGGLES = "Safety Goggles"
    SAFETY_GLOVES = "Safety Gloves"
    FALL_PROTECTION_HARNESS = "Fall Protection Harness"
    HELMET = "Helmet"
    MACHINERY = "Machinery"
    FORKLIFT = "Forklift"
    CRANE = "Crane"
    EXCAVATOR = "Excavator"
    TOOLS = "Tools"
    HAZARDOUS_MATERIAL = "Hazardous Material"
    SAFETY_BARRIER = "Safety Barrier"
    FIRE_EXTINGUISHER = "Fire Extinguisher"
    EMERGENCY_EXIT = "Emergency Exit"
    SPILL = "Spill"
    UNATTENDED_OBJECT = "Unattended Object"

class PrimaryObject(BaseModel):
    object_type: ObjectType
    object_id: str
    bounding_box: List[int]  # [x1, y1, x2, y2]
    confidence: float

class Alert(BaseDBModel):
    alert_id: str = Field(..., unique=True)
    timestamp: datetime
    violation_type: ViolationType
    severity_level: SeverityLevel
    description: str
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    location_id: str
    camera_id: str
    primary_object: PrimaryObject
    snapshot_url: Optional[str] = None
    status: AlertStatus = AlertStatus.NEW
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class AlertCreate(BaseModel):
    violation_type: ViolationType
    severity_level: SeverityLevel
    description: str
    confidence_score: float
    location_id: str
    camera_id: str
    primary_object: PrimaryObject
    snapshot_url: Optional[str] = None

class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None

class Site(BaseDBModel):
    site_id: str = Field(..., unique=True)
    site_name: str
    location: str
    contact_person: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: bool = True

class SiteCreate(BaseModel):
    site_name: str
    location: str
    contact_person: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

class SiteUpdate(BaseModel):
    site_name: Optional[str] = None
    location: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    is_active: Optional[bool] = None

class Camera(BaseDBModel):
    camera_id: str = Field(..., unique=True)
    site_id: str
    camera_name: str
    stream_url: str
    status: str = "Active"  # Active, Inactive, Maintenance
    installation_date: datetime
    settings: Dict[str, Any] = {}
    location_description: Optional[str] = None

class CameraCreate(BaseModel):
    site_id: str
    camera_name: str
    stream_url: str
    installation_date: datetime
    settings: Dict[str, Any] = {}
    location_description: Optional[str] = None

class CameraUpdate(BaseModel):
    camera_name: Optional[str] = None
    stream_url: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    location_description: Optional[str] = None

class SafetyRule(BaseDBModel):
    rule_id: str = Field(..., unique=True)
    rule_name: str
    violation_type: ViolationType
    description: str
    is_active: bool = True
    parameters: Dict[str, Any] = {}
    severity_level: SeverityLevel
    applicable_zones: List[str] = []

class SafetyRuleCreate(BaseModel):
    rule_name: str
    violation_type: ViolationType
    description: str
    parameters: Dict[str, Any] = {}
    severity_level: SeverityLevel
    applicable_zones: List[str] = []

class SafetyRuleUpdate(BaseModel):
    rule_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    parameters: Optional[Dict[str, Any]] = None
    severity_level: Optional[SeverityLevel] = None
    applicable_zones: Optional[List[str]] = None
