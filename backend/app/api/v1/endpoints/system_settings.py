from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
from app.models.system_settings import (
    SystemSetting, SystemSettingUpdate, SystemSettingsResponse,
    SystemStatus, SystemHealthResponse, SettingCategory
)
from app.api.v1.endpoints.auth import get_current_active_user
from app.models.user import User, UserRole
from app.core.database import get_database
from app.core.ai_engine import AIEngine
import os
import psutil
import time

router = APIRouter()

# Default system settings
DEFAULT_SETTINGS = [
    # AI Settings
    {
        "key": "ai_model_path",
        "value": "/models/yolov8n.pt",
        "type": "string",
        "label": "AI Model Path",
        "description": "Path to the YOLO model file",
        "category": "ai"
    },
    {
        "key": "confidence_threshold",
        "value": 0.5,
        "type": "number",
        "label": "Confidence Threshold",
        "description": "Minimum confidence score for object detection (0.0 - 1.0)",
        "category": "ai",
        "min_value": 0.0,
        "max_value": 1.0
    },
    {
        "key": "nms_threshold",
        "value": 0.4,
        "type": "number",
        "label": "NMS Threshold",
        "description": "Non-maximum suppression threshold (0.0 - 1.0)",
        "category": "ai",
        "min_value": 0.0,
        "max_value": 1.0
    },
    {
        "key": "enable_ai_processing",
        "value": True,
        "type": "boolean",
        "label": "Enable AI Processing",
        "description": "Enable real-time AI object detection",
        "category": "ai"
    },

    # Video Settings
    {
        "key": "frame_rate",
        "value": 30,
        "type": "number",
        "label": "Frame Rate",
        "description": "Video processing frame rate (fps)",
        "category": "video",
        "min_value": 1,
        "max_value": 60
    },
    {
        "key": "frame_width",
        "value": 1920,
        "type": "number",
        "label": "Frame Width",
        "description": "Video frame width in pixels",
        "category": "video",
        "min_value": 320,
        "max_value": 3840
    },
    {
        "key": "frame_height",
        "value": 1080,
        "type": "number",
        "label": "Frame Height",
        "description": "Video frame height in pixels",
        "category": "video",
        "min_value": 240,
        "max_value": 2160
    },
    {
        "key": "enable_recording",
        "value": True,
        "type": "boolean",
        "label": "Enable Recording",
        "description": "Allow video recording functionality",
        "category": "video"
    },

    # Notification Settings
    {
        "key": "email_notifications",
        "value": True,
        "type": "boolean",
        "label": "Email Notifications",
        "description": "Send email alerts for safety violations",
        "category": "notifications"
    },
    {
        "key": "sms_notifications",
        "value": False,
        "type": "boolean",
        "label": "SMS Notifications",
        "description": "Send SMS alerts for critical violations",
        "category": "notifications"
    },
    {
        "key": "notification_frequency",
        "value": "immediate",
        "type": "select",
        "label": "Notification Frequency",
        "description": "How often to send notifications",
        "options": ["immediate", "hourly", "daily", "weekly"],
        "category": "notifications"
    },

    # System Settings
    {
        "key": "log_level",
        "value": "INFO",
        "type": "select",
        "label": "Log Level",
        "description": "System logging verbosity",
        "options": ["DEBUG", "INFO", "WARNING", "ERROR"],
        "category": "system"
    },
    {
        "key": "auto_backup",
        "value": True,
        "type": "boolean",
        "label": "Auto Backup",
        "description": "Automatically backup system data",
        "category": "system"
    },
    {
        "key": "maintenance_mode",
        "value": False,
        "type": "boolean",
        "label": "Maintenance Mode",
        "description": "Enable system maintenance mode",
        "category": "system"
    }
]

# Global variables for system status
start_time = time.time()
ai_engine = None

def get_ai_engine():
    global ai_engine
    if ai_engine is None:
        try:
            ai_engine = AIEngine()
        except Exception:
            ai_engine = None
    return ai_engine

async def initialize_settings():
    """Initialize default settings in the database if they don't exist."""
    database = get_database()
    
    for setting_data in DEFAULT_SETTINGS:
        # Check if setting already exists
        existing = await database.system_settings.find_one({"key": setting_data["key"]})
        if not existing:
            setting_data["created_at"] = datetime.utcnow()
            setting_data["updated_at"] = datetime.utcnow()
            await database.system_settings.insert_one(setting_data)

@router.get("/", response_model=SystemSettingsResponse,
    summary="Get System Settings",
    description="""
    Retrieve all system settings or filter by category.
    
    Returns a list of system configuration settings organized by category.
    Supports filtering by category (AI, Video, Notifications, System).
    """,
    responses={
        200: {
            "description": "System settings retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "settings": [
                            {
                                "key": "ai_model_path",
                                "value": "/models/yolov8n.pt",
                                "type": "string",
                                "label": "AI Model Path",
                                "description": "Path to the YOLO model file",
                                "category": "ai"
                            },
                            {
                                "key": "confidence_threshold",
                                "value": 0.5,
                                "type": "number",
                                "label": "Confidence Threshold",
                                "description": "Minimum confidence score for object detection (0.0 - 1.0)",
                                "category": "ai",
                                "min_value": 0.0,
                                "max_value": 1.0
                            },
                            {
                                "key": "frame_rate",
                                "value": 30,
                                "type": "number",
                                "label": "Frame Rate",
                                "description": "Video processing frame rate (fps)",
                                "category": "video",
                                "min_value": 1,
                                "max_value": 60
                            }
                        ],
                        "total": 3
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        403: {
            "description": "Insufficient permissions",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Insufficient permissions to view system settings"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving system settings: Database connection failed"
                    }
                }
            }
        }
    }
)
async def get_system_settings(
    category: Optional[SettingCategory] = None,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get all system settings or filter by category.
    
    - **category**: Filter settings by category (optional)
        - `ai`: AI processing settings
        - `video`: Video processing settings  
        - `notifications`: Notification settings
        - `system`: System configuration settings
    
    Returns a list of system settings with their current values and metadata.
    Requires Administrator or Supervisor role.
    """
    try:
        # Check if user has permission to view settings
        if current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view system settings"
            )
        
        database = get_database()
        
        # Initialize default settings if needed
        await initialize_settings()
        
        # Build filter
        filter_query = {}
        if category:
            filter_query["category"] = category.value
        
        # Query database
        cursor = database.system_settings.find(filter_query).sort("category", 1)
        settings = []
        
        async for setting_doc in cursor:
            settings.append(SystemSetting(**setting_doc))
        
        return SystemSettingsResponse(settings=settings, total=len(settings))
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving system settings: {str(e)}"
        )

@router.get("/{setting_key}", response_model=SystemSetting,
    summary="Get System Setting",
    description="""
    Retrieve a specific system setting by its key.
    
    Returns detailed information about a single system setting including
    its current value, type, constraints, and metadata.
    """,
    responses={
        200: {
            "description": "System setting retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "key": "confidence_threshold",
                        "value": 0.5,
                        "type": "number",
                        "label": "Confidence Threshold",
                        "description": "Minimum confidence score for object detection (0.0 - 1.0)",
                        "category": "ai",
                        "min_value": 0.0,
                        "max_value": 1.0
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        403: {
            "description": "Insufficient permissions",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Insufficient permissions to view system settings"
                    }
                }
            }
        },
        404: {
            "description": "Setting not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Setting not found"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving system setting: Database connection failed"
                    }
                }
            }
        }
    }
)
async def get_system_setting(
    setting_key: str,
    current_user: User = Depends(get_current_active_user)
):
    """
    Get a specific system setting by key.
    
    - **setting_key**: The unique identifier of the setting (required)
        - Examples: `ai_model_path`, `confidence_threshold`, `frame_rate`
    
    Returns detailed information about the specified system setting.
    Requires Administrator or Supervisor role.
    """
    try:
        # Check if user has permission to view settings
        if current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view system settings"
            )
        
        database = get_database()
        
        # Initialize default settings if needed
        await initialize_settings()
        
        # Find setting
        setting_doc = await database.system_settings.find_one({"key": setting_key})
        if not setting_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        return SystemSetting(**setting_doc)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving system setting: {str(e)}"
        )

@router.put("/{setting_key}", response_model=SystemSetting,
    summary="Update System Setting",
    description="""
    Update a specific system setting value.
    
    Allows administrators to modify system configuration values.
    The setting must exist and the new value must be valid for the setting type.
    """,
    responses={
        200: {
            "description": "System setting updated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "key": "confidence_threshold",
                        "value": 0.7,
                        "type": "number",
                        "label": "Confidence Threshold",
                        "description": "Minimum confidence score for object detection (0.0 - 1.0)",
                        "category": "ai",
                        "min_value": 0.0,
                        "max_value": 1.0
                    }
                }
            }
        },
        400: {
            "description": "Invalid value or validation error",
            "content": {
                "application/json": {
                    "examples": {
                        "invalid_number": {
                            "summary": "Invalid number value",
                            "value": {
                                "detail": "Value must be a number"
                            }
                        },
                        "out_of_range": {
                            "summary": "Value out of range",
                            "value": {
                                "detail": "Value must be at least 0.0"
                            }
                        },
                        "invalid_boolean": {
                            "summary": "Invalid boolean value",
                            "value": {
                                "detail": "Value must be a boolean"
                            }
                        }
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        403: {
            "description": "Insufficient permissions",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Insufficient permissions to update system settings"
                    }
                }
            }
        },
        404: {
            "description": "Setting not found",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Setting not found"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "value"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error updating system setting: Database connection failed"
                    }
                }
            }
        }
    }
)
async def update_system_setting(
    setting_key: str,
    update_data: SystemSettingUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update a system setting value.
    
    - **setting_key**: The unique identifier of the setting to update (required)
    - **update_data**: The new value for the setting (required)
        - **value**: The new value (must match the setting's type and constraints)
    
    Validates the new value against the setting's type and constraints before updating.
    Requires Administrator role.
    """
    try:
        # Check if user has permission to update settings
        if current_user.role not in [UserRole.ADMINISTRATOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update system settings"
            )
        
        database = get_database()
        
        # Find existing setting
        existing_setting = await database.system_settings.find_one({"key": setting_key})
        if not existing_setting:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Setting not found"
            )
        
        # Validate value based on setting type
        setting_type = existing_setting.get("type")
        new_value = update_data.value
        
        if setting_type == "number":
            if not isinstance(new_value, (int, float)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Value must be a number"
                )
            
            # Check min/max constraints
            min_value = existing_setting.get("min_value")
            max_value = existing_setting.get("max_value")
            
            if min_value is not None and new_value < min_value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Value must be at least {min_value}"
                )
            
            if max_value is not None and new_value > max_value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Value must be at most {max_value}"
                )
        
        elif setting_type == "boolean":
            if not isinstance(new_value, bool):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Value must be a boolean"
                )
        
        elif setting_type == "select":
            if not isinstance(new_value, str):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Value must be a string"
                )
            
            options = existing_setting.get("options", [])
            if options and new_value not in options:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Value must be one of: {', '.join(options)}"
                )
        
        # Update setting
        update_fields = {
            "value": new_value,
            "updated_at": datetime.utcnow()
        }
        
        result = await database.system_settings.update_one(
            {"key": setting_key},
            {"$set": update_fields}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update setting"
            )
        
        # Get updated setting
        updated_setting = await database.system_settings.find_one({"key": setting_key})
        return SystemSetting(**updated_setting)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating system setting: {str(e)}"
        )

@router.post("/reset", response_model=SystemSettingsResponse,
    summary="Reset System Settings",
    description="""
    Reset all system settings to their default values.
    
    This operation will clear all current settings and restore them to the
    predefined default values. This action cannot be undone.
    """,
    responses={
        200: {
            "description": "System settings reset successfully",
            "content": {
                "application/json": {
                    "example": {
                        "settings": [
                            {
                                "key": "ai_model_path",
                                "value": "/models/yolov8n.pt",
                                "type": "string",
                                "label": "AI Model Path",
                                "description": "Path to the YOLO model file",
                                "category": "ai"
                            }
                        ],
                        "total": 1
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        403: {
            "description": "Insufficient permissions",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Insufficient permissions to reset system settings"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error resetting system settings: Database connection failed"
                    }
                }
            }
        }
    }
)
async def reset_system_settings(
    current_user: User = Depends(get_current_active_user)
):
    """
    Reset all system settings to default values.
    
    This operation will:
    - Clear all current system settings
    - Restore default values for all settings
    - Return the updated settings list
    
    **Warning**: This action cannot be undone.
    Requires Administrator role.
    """
    try:
        # Check if user has permission to reset settings
        if current_user.role not in [UserRole.ADMINISTRATOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to reset system settings"
            )
        
        database = get_database()
        
        # Clear existing settings
        await database.system_settings.delete_many({})
        
        # Reinitialize with default settings
        await initialize_settings()
        
        # Return all settings
        cursor = database.system_settings.find().sort("category", 1)
        settings = []
        
        async for setting_doc in cursor:
            settings.append(SystemSetting(**setting_doc))
        
        return SystemSettingsResponse(settings=settings, total=len(settings))
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting system settings: {str(e)}"
        )

@router.get("/health/status", response_model=SystemHealthResponse,
    summary="Get System Health",
    description="""
    Retrieve system health and status information.
    
    Returns comprehensive system status including database connectivity,
    AI model status, file system readiness, and system metrics.
    """,
    responses={
        200: {
            "description": "System health information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "status": {
                            "websocket_connected": True,
                            "database_connected": True,
                            "ai_model_loaded": True,
                            "file_system_ready": True,
                            "last_updated": "2025-08-31T04:00:00.000000"
                        },
                        "version": "1.0.0",
                        "uptime": "2h 30m 45s"
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Error retrieving system health: Database connection failed"
                    }
                }
            }
        }
    }
)
async def get_system_health(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get system health and status information.
    
    Returns:
    - **websocket_connected**: WebSocket connection status
    - **database_connected**: Database connectivity status
    - **ai_model_loaded**: AI model loading status
    - **file_system_ready**: File system accessibility
    - **version**: Current system version
    - **uptime**: System uptime duration
    
    This endpoint provides real-time system health monitoring.
    """
    try:
        database = get_database()
        
        # Check database connection
        try:
            await database.command("ping")
            database_connected = True
        except Exception:
            database_connected = False
        
        # Check AI model status
        ai_engine_instance = get_ai_engine()
        ai_model_loaded = ai_engine_instance is not None and hasattr(ai_engine_instance, 'model') and ai_engine_instance.model is not None
        
        # Check file system
        try:
            # Check if we can read/write to a test directory
            test_dir = "/tmp" if os.name != 'nt' else "C:\\temp"
            if not os.path.exists(test_dir):
                os.makedirs(test_dir, exist_ok=True)
            file_system_ready = os.access(test_dir, os.R_OK | os.W_OK)
        except Exception:
            file_system_ready = False
        
        # Calculate uptime
        uptime_seconds = time.time() - start_time
        uptime_str = f"{int(uptime_seconds // 3600)}h {int((uptime_seconds % 3600) // 60)}m {int(uptime_seconds % 60)}s"
        
        # Get system info
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        status = SystemStatus(
            websocket_connected=True,  # This will be updated by WebSocket context
            database_connected=database_connected,
            ai_model_loaded=ai_model_loaded,
            file_system_ready=file_system_ready,
            last_updated=datetime.utcnow()
        )
        
        return SystemHealthResponse(
            status=status,
            version="1.0.0",
            uptime=uptime_str
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving system health: {str(e)}"
        )
