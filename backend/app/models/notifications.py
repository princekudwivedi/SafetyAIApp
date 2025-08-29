from app.models.base import BaseDBModel
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class NotificationType(str, Enum):
    ALERT = "Alert"
    SYSTEM = "System"
    MAINTENANCE = "Maintenance"
    USER = "User"
    SAFETY = "Safety"
    COMPLIANCE = "Compliance"

class NotificationPriority(str, Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class NotificationStatus(str, Enum):
    UNREAD = "Unread"
    READ = "Read"
    ARCHIVED = "Archived"
    DELETED = "Deleted"

class NotificationChannel(str, Enum):
    IN_APP = "In App"
    EMAIL = "Email"
    SMS = "SMS"
    PUSH = "Push"
    WEBHOOK = "Webhook"

class Notification(BaseDBModel):
    notification_id: str = Field(..., unique=True)
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    recipient_id: str  # User ID
    sender_id: Optional[str] = None  # User ID or system
    status: NotificationStatus = NotificationStatus.UNREAD
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    read_at: Optional[datetime] = None
    action_url: Optional[str] = None  # URL to navigate to when clicked
    metadata: Dict[str, Any] = {}  # Additional data
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

class NotificationCreate(BaseModel):
    type: NotificationType
    priority: NotificationPriority
    title: str
    message: str
    recipient_id: str
    sender_id: Optional[str] = None
    channels: List[NotificationChannel] = [NotificationChannel.IN_APP]
    action_url: Optional[str] = None
    metadata: Dict[str, Any] = {}
    expires_at: Optional[datetime] = None

class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatus] = None
    read_at: Optional[datetime] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationTemplate(BaseDBModel):
    template_id: str = Field(..., unique=True)
    name: str
    type: NotificationType
    priority: NotificationPriority
    title_template: str  # Template string with placeholders
    message_template: str  # Template string with placeholders
    channels: List[NotificationChannel]
    is_active: bool = True
    created_by: str
    created_at: datetime
    updated_at: datetime

class NotificationTemplateCreate(BaseModel):
    name: str
    type: NotificationType
    priority: NotificationPriority
    title_template: str
    message_template: str
    channels: List[NotificationChannel]

class NotificationTemplateUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[NotificationType] = None
    priority: Optional[NotificationPriority] = None
    title_template: Optional[str] = None
    message_template: Optional[str] = None
    channels: Optional[List[NotificationChannel]] = None
    is_active: Optional[bool] = None

class NotificationPreference(BaseDBModel):
    user_id: str = Field(..., unique=True)
    email_enabled: bool = True
    sms_enabled: bool = False
    push_enabled: bool = True
    in_app_enabled: bool = True
    webhook_enabled: bool = False
    webhook_url: Optional[str] = None
    quiet_hours_start: Optional[str] = None  # "HH:MM" format
    quiet_hours_end: Optional[str] = None  # "HH:MM" format
    timezone: str = "UTC"
    preferences: Dict[str, bool] = {}  # Per-type preferences
    created_at: datetime
    updated_at: datetime

class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    push_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    webhook_enabled: Optional[bool] = None
    webhook_url: Optional[str] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    timezone: Optional[str] = None
    preferences: Optional[Dict[str, bool]] = None
