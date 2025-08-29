from app.models.base import BaseDBModel
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ZoneType(str, Enum):
    RESTRICTED = "Restricted"
    DANGER = "Danger"
    SAFETY = "Safety"
    WORK = "Work"
    EXIT = "Exit"
    ENTRANCE = "Entrance"
    STORAGE = "Storage"
    EQUIPMENT = "Equipment"

class ZoneStatus(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    CLOSED = "Closed"

class Zone(BaseDBModel):
    zone_id: str = Field(..., unique=True)
    zone_name: str
    zone_type: ZoneType
    site_id: str
    description: Optional[str] = None
    status: ZoneStatus = ZoneStatus.ACTIVE
    coordinates: List[List[float]] = []  # [[x1, y1], [x2, y2], ...] for polygon
    center_point: List[float] = []  # [x, y] for center
    radius: Optional[float] = None  # For circular zones
    max_occupancy: Optional[int] = None
    restricted_roles: List[str] = []  # User roles that can't enter
    safety_rules: List[str] = []  # Associated safety rule IDs
    created_at: datetime
    updated_at: datetime
    metadata: Dict[str, Any] = {}

class ZoneCreate(BaseModel):
    zone_name: str
    zone_type: ZoneType
    site_id: str
    description: Optional[str] = None
    coordinates: List[List[float]] = []
    center_point: List[float] = []
    radius: Optional[float] = None
    max_occupancy: Optional[int] = None
    restricted_roles: List[str] = []
    safety_rules: List[str] = []

class ZoneUpdate(BaseModel):
    zone_name: Optional[str] = None
    zone_type: Optional[ZoneType] = None
    description: Optional[str] = None
    status: Optional[ZoneStatus] = None
    coordinates: Optional[List[List[float]]] = None
    center_point: Optional[List[float]] = None
    radius: Optional[float] = None
    max_occupancy: Optional[int] = None
    restricted_roles: Optional[List[str]] = None
    safety_rules: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class ZoneViolation(BaseDBModel):
    violation_id: str = Field(..., unique=True)
    zone_id: str
    user_id: str
    violation_type: str  # "Unauthorized Entry", "Overcrowding", etc.
    timestamp: datetime
    description: str
    severity: str  # "Low", "Medium", "High"
    resolved: bool = False
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None

class ZoneViolationCreate(BaseModel):
    zone_id: str
    user_id: str
    violation_type: str
    description: str
    severity: str

class ZoneViolationUpdate(BaseModel):
    resolved: Optional[bool] = None
    resolution_notes: Optional[str] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
