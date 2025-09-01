from pydantic import BaseModel, Field
from typing import Optional, Union, List
from datetime import datetime
from enum import Enum

class SettingType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    SELECT = "select"

class SettingCategory(str, Enum):
    AI = "ai"
    VIDEO = "video"
    NOTIFICATIONS = "notifications"
    SYSTEM = "system"

class NotificationFrequency(str, Enum):
    IMMEDIATE = "immediate"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"

class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"

class SystemSetting(BaseModel):
    key: str = Field(..., description="Unique setting key")
    value: Union[str, int, float, bool] = Field(..., description="Setting value")
    type: SettingType = Field(..., description="Data type of the setting")
    label: str = Field(..., description="Human-readable label")
    description: str = Field(..., description="Setting description")
    category: SettingCategory = Field(..., description="Setting category")
    options: Optional[List[str]] = Field(None, description="Available options for select type")
    min_value: Optional[Union[int, float]] = Field(None, description="Minimum value for number type")
    max_value: Optional[Union[int, float]] = Field(None, description="Maximum value for number type")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SystemSettingUpdate(BaseModel):
    value: Union[str, int, float, bool] = Field(..., description="New setting value")

class SystemSettingsResponse(BaseModel):
    settings: List[SystemSetting]
    total: int

class SystemStatus(BaseModel):
    websocket_connected: bool
    database_connected: bool
    ai_model_loaded: bool
    file_system_ready: bool
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class SystemHealthResponse(BaseModel):
    status: SystemStatus
    version: str = "1.0.0"
    uptime: Optional[str] = None
