from app.models.base import BaseDBModel
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class AuditAction(str, Enum):
    CREATE = "Create"
    READ = "Read"
    UPDATE = "Update"
    DELETE = "Delete"
    LOGIN = "Login"
    LOGOUT = "Logout"
    EXPORT = "Export"
    IMPORT = "Import"
    APPROVE = "Approve"
    REJECT = "Reject"
    ASSIGN = "Assign"
    RESOLVE = "Resolve"
    ENABLE = "Enable"
    DISABLE = "Disable"
    START = "Start"
    STOP = "Stop"
    CONFIGURE = "Configure"

class AuditResource(str, Enum):
    USER = "User"
    ALERT = "Alert"
    CAMERA = "Camera"
    SITE = "Site"
    SAFETY_RULE = "Safety Rule"
    ZONE = "Zone"
    REPORT = "Report"
    NOTIFICATION = "Notification"
    SYSTEM = "System"
    AUTH = "Authentication"

class AuditStatus(str, Enum):
    SUCCESS = "Success"
    FAILURE = "Failure"
    PENDING = "Pending"
    CANCELLED = "Cancelled"

class AuditLog(BaseDBModel):
    audit_id: str = Field(..., unique=True)
    timestamp: datetime
    user_id: str  # User who performed the action
    action: AuditAction
    resource: AuditResource
    resource_id: str  # ID of the affected resource
    details: str  # Human-readable description
    status: AuditStatus = AuditStatus.SUCCESS
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = {}  # Additional context
    changes: Optional[Dict[str, Any]] = None  # Before/after values
    error_message: Optional[str] = None  # For failed actions

class AuditLogCreate(BaseModel):
    user_id: str
    action: AuditAction
    resource: AuditResource
    resource_id: str
    details: str
    status: AuditStatus = AuditStatus.SUCCESS
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    session_id: Optional[str] = None
    metadata: Dict[str, Any] = {}
    changes: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None

class AuditLogQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[str] = None
    action: Optional[AuditAction] = None
    resource: Optional[AuditResource] = None
    resource_id: Optional[str] = None
    status: Optional[AuditStatus] = None
    skip: int = 0
    limit: int = 100

class AuditSummary(BaseModel):
    total_actions: int
    actions_by_type: Dict[str, int]
    actions_by_resource: Dict[str, int]
    actions_by_status: Dict[str, int]
    actions_by_user: Dict[str, int]
    recent_activity: List[AuditLog]

class SystemEvent(BaseDBModel):
    event_id: str = Field(..., unique=True)
    timestamp: datetime
    event_type: str  # "System Startup", "Maintenance", "Error", etc.
    severity: str  # "Info", "Warning", "Error", "Critical"
    description: str
    source: str  # Component or service name
    details: Dict[str, Any] = {}
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None

class SystemEventCreate(BaseModel):
    event_type: str
    severity: str
    description: str
    source: str
    details: Dict[str, Any] = {}

class SystemEventUpdate(BaseModel):
    resolved: Optional[bool] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None
