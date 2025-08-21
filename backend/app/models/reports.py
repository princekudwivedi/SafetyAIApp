from app.models.base import BaseDBModel, PyObjectId
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class ReportType(str, Enum):
    DAILY = "Daily"
    WEEKLY = "Weekly"
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    ANNUAL = "Annual"
    INCIDENT = "Incident"
    COMPLIANCE = "Compliance"
    PERFORMANCE = "Performance"

class ReportStatus(str, Enum):
    DRAFT = "Draft"
    GENERATED = "Generated"
    APPROVED = "Approved"
    ARCHIVED = "Archived"

class ReportFormat(str, Enum):
    PDF = "PDF"
    CSV = "CSV"
    EXCEL = "Excel"
    JSON = "JSON"

class Report(BaseDBModel):
    report_id: str = Field(..., unique=True)
    report_type: ReportType
    title: str
    description: Optional[str] = None
    generated_by: str  # User ID
    generated_at: datetime
    status: ReportStatus = ReportStatus.GENERATED
    format: ReportFormat
    file_url: Optional[str] = None
    parameters: Dict[str, Any] = {}  # Report generation parameters
    data_period: Dict[str, datetime] = {}  # Start and end dates
    site_id: Optional[str] = None
    camera_ids: List[str] = []
    metadata: Dict[str, Any] = {}

class ReportCreate(BaseModel):
    report_type: ReportType
    title: str
    description: Optional[str] = None
    format: ReportFormat
    parameters: Dict[str, Any] = {}
    data_period: Dict[str, datetime] = {}
    site_id: Optional[str] = None
    camera_ids: List[str] = []

class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ReportStatus] = None
    file_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class ReportTemplate(BaseDBModel):
    template_id: str = Field(..., unique=True)
    name: str
    description: Optional[str] = None
    report_type: ReportType
    parameters_schema: Dict[str, Any] = {}  # JSON schema for parameters
    is_active: bool = True
    created_by: str
    created_at: datetime
    updated_at: datetime

class ReportTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    report_type: ReportType
    parameters_schema: Dict[str, Any] = {}

class ReportTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters_schema: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
