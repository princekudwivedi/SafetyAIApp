# Module 3: Camera Management System

## Overview
The Camera Management System provides comprehensive camera registration, configuration, and monitoring capabilities for the SafetyAI application. It enables real-time status tracking, site-based organization, and integration with the alert system for automated safety monitoring.

## Key Features

### Camera Registration and Configuration
- **Camera Registration**: Add new cameras with detailed configuration
- **Site Assignment**: Organize cameras by physical locations
- **Configuration Management**: Camera settings, resolution, and capabilities
- **Status Monitoring**: Real-time camera health and connectivity status
- **Bulk Operations**: Mass camera configuration and management

### Real-time Monitoring
- **Live Status Updates**: WebSocket-based real-time status monitoring
- **Health Indicators**: Camera uptime, connectivity, and performance metrics
- **Stream Management**: Live video feed monitoring and control
- **Recording Capabilities**: Video recording and storage management
- **Alert Integration**: Automatic alert generation from camera feeds

### Site-based Organization
- **Hierarchical Structure**: Cameras organized by sites and zones
- **Location Management**: Physical location tracking and mapping
- **Access Control**: Site-based camera access permissions
- **Site Analytics**: Camera distribution and performance by site

## Backend Implementation

### Core Files
- `backend/app/api/v1/endpoints/cameras.py` - Camera API endpoints
- `backend/app/models/safety.py` - Camera data models
- `backend/app/services/video_service.py` - Video processing service
- `backend/app/services/websocket_service.py` - Real-time status updates

### Data Models
```python
class CameraStatus(str, Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"
    MAINTENANCE = "Maintenance"
    OFFLINE = "Offline"

class Camera(BaseDBModel):
    camera_id: str = Field(..., description="Unique camera identifier")
    camera_name: str = Field(..., description="Human-readable camera name")
    site_id: str = Field(..., description="Associated site identifier")
    location_description: Optional[str] = Field(None, description="Physical location details")
    status: CameraStatus = Field(default=CameraStatus.ACTIVE)
    ip_address: Optional[str] = Field(None, description="Camera IP address")
    port: Optional[int] = Field(None, description="Camera port number")
    resolution: str = Field(default="1920x1080", description="Video resolution")
    fps: int = Field(default=30, description="Frames per second")
    is_streaming: bool = Field(default=False, description="Current streaming status")
    is_recording: bool = Field(default=False, description="Current recording status")
    last_seen: Optional[datetime] = Field(None, description="Last connectivity timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional camera data")
```

### API Endpoints
```python
GET    /api/v1/cameras/              # List cameras with filtering
POST   /api/v1/cameras/              # Create new camera
GET    /api/v1/cameras/{camera_id}   # Get specific camera
PUT    /api/v1/cameras/{camera_id}   # Update camera configuration
DELETE /api/v1/cameras/{camera_id}   # Delete camera
GET    /api/v1/cameras/status        # Get camera status summary
POST   /api/v1/cameras/bulk-update   # Bulk camera operations
```

### Camera Status Management
```python
@router.get("/cameras/status")
async def get_camera_status():
    """Get real-time camera status summary"""
    active_cameras = await database.cameras.count_documents({"status": "Active"})
    inactive_cameras = await database.cameras.count_documents({"status": "Inactive"})
    maintenance_cameras = await database.cameras.count_documents({"status": "Maintenance"})
    
    return {
        "total": active_cameras + inactive_cameras + maintenance_cameras,
        "active": active_cameras,
        "inactive": inactive_cameras,
        "maintenance": maintenance_cameras,
        "uptime_percentage": calculate_uptime_percentage()
    }
```

## Frontend Implementation

### Core Files
- `frontend/components/cameras/cameras-page.tsx` - Main camera interface
- `frontend/components/cameras/camera-form.tsx` - Camera configuration form
- `frontend/hooks/use-cameras.ts` - Camera management hooks
- `frontend/hooks/use-sites.ts` - Site integration hooks

### Camera Management Hook
```typescript
interface UseCamerasReturn {
  // Data
  cameras: EnhancedCamera[];
  loading: boolean;
  error: string | null;
  
  // Actions
  createCamera: (camera: CameraCreate) => Promise<void>;
  updateCamera: (id: string, updates: CameraUpdate) => Promise<void>;
  deleteCamera: (id: string) => Promise<void>;
  refreshCameras: () => Promise<void>;
  
  // Status
  isConnected: boolean;
  statusSummary: CameraStatusSummary;
}

interface EnhancedCamera extends Camera {
  siteName?: string;
  isStreaming?: boolean;
  isRecording?: boolean;
  uptime?: number;
  alertsGenerated?: number;
  resolution?: string;
  fps?: number;
}
```

### Camera Form Component
```typescript
interface CameraFormData {
  camera_name: string;
  site_id: string;
  location_description?: string;
  ip_address?: string;
  port?: number;
  resolution: string;
  fps: number;
  status: CameraStatus;
}

const CameraForm: React.FC<CameraFormProps> = ({ camera, onSubmit, onCancel }) => {
  const { sites } = useSites();
  const form = useForm<CameraFormData>({
    resolver: zodResolver(cameraFormSchema),
    defaultValues: {
      camera_name: camera?.camera_name || '',
      site_id: camera?.site_id || '',
      location_description: camera?.location_description || '',
      ip_address: camera?.ip_address || '',
      port: camera?.port || 80,
      resolution: camera?.resolution || '1920x1080',
      fps: camera?.fps || 30,
      status: camera?.status || CameraStatus.ACTIVE
    }
  });
  
  // Form implementation with validation and submission
};
```

## User Interface Components

### Camera List View
- **Data Table**: Sortable camera list with status indicators
- **Status Badges**: Visual status indicators (Active, Inactive, Maintenance)
- **Site Filtering**: Filter cameras by assigned site
- **Search Functionality**: Search by camera name, location, or IP
- **Bulk Actions**: Select multiple cameras for batch operations

### Camera Configuration Form
- **Basic Information**: Camera name, site assignment, location
- **Network Settings**: IP address, port, connection details
- **Video Settings**: Resolution, frame rate, quality settings
- **Status Management**: Camera status and operational settings
- **Validation**: Real-time form validation with error messages

### Status Monitoring Dashboard
- **Status Overview**: Visual summary of camera health
- **Uptime Tracking**: Camera availability and performance metrics
- **Alert Integration**: Cameras with recent alerts highlighted
- **Quick Actions**: Start/stop streaming, maintenance mode toggle

## Real-time Features

### WebSocket Integration
```typescript
// Subscribe to camera status updates
useEffect(() => {
  const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
    updateCameraStatus(data.camera_id, data.status);
  });

  const unsubscribeCameraStream = subscribe('camera_stream_update', (data) => {
    updateStreamStatus(data.camera_id, data.is_streaming);
  });

  return () => {
    unsubscribeCameraStatus();
    unsubscribeCameraStream();
  };
}, [subscribe]);
```

### Live Status Updates
- **Connection Status**: Real-time camera connectivity monitoring
- **Stream Status**: Live streaming status updates
- **Recording Status**: Recording state changes
- **Performance Metrics**: Uptime and performance data updates

## Integration with Alert System

### Automatic Alert Generation
```python
async def process_camera_feed(camera_id: str, frame_data: bytes):
    """Process camera feed and generate alerts for violations"""
    # AI processing of camera feed
    violations = await ai_engine.detect_violations(frame_data)
    
    for violation in violations:
        alert = Alert(
            alert_id=generate_alert_id(),
            violation_type=violation.type,
            severity=violation.severity,
            camera_id=camera_id,
            site_id=get_camera_site(camera_id),
            description=violation.description,
            metadata={"ai_confidence": violation.confidence}
        )
        await create_alert(alert)
```

### Camera-Alert Relationship
- **Alert Attribution**: Alerts linked to specific cameras
- **Camera Performance**: Alert generation rate per camera
- **Site Analytics**: Alert distribution by camera and site
- **Maintenance Alerts**: System-generated maintenance notifications

## Performance Optimization

### Data Loading
- **Lazy Loading**: On-demand loading of camera details
- **Pagination**: Efficient handling of large camera datasets
- **Caching**: Intelligent caching of camera status data
- **Debounced Updates**: Optimized real-time update handling

### Real-time Efficiency
- **Selective Updates**: Only update changed camera data
- **Connection Pooling**: Efficient WebSocket connection management
- **Memory Management**: Proper cleanup of camera event listeners
- **Error Recovery**: Automatic reconnection on connection loss

## Security and Permissions

### Access Control
- **Role-based Access**: Different camera management permissions by role
- **Site-based Filtering**: Users only see cameras from their assigned sites
- **Configuration Protection**: Secure camera configuration management
- **Audit Trail**: Complete history of camera modifications

### Network Security
- **IP Validation**: Secure camera IP address management
- **Port Security**: Controlled camera port access
- **Stream Encryption**: Secure video stream transmission
- **Access Logging**: Comprehensive camera access audit logs

## Configuration

### Camera Settings
```typescript
interface CameraConfig {
  defaultResolution: string;
  defaultFps: number;
  maxCamerasPerSite: number;
  statusCheckInterval: number;
  streamTimeout: number;
  recordingRetentionDays: number;
  maintenanceModeEnabled: boolean;
}
```

### Site Integration
- **Site Assignment**: Automatic site-based camera organization
- **Location Mapping**: Physical location tracking and visualization
- **Access Permissions**: Site-based camera access control
- **Performance Monitoring**: Site-level camera performance metrics

## Testing

### Unit Tests
- Camera creation and validation
- Status update logic
- Site assignment functionality
- Configuration management

### Integration Tests
- End-to-end camera workflow
- Real-time status updates
- WebSocket communication
- Alert integration

### Performance Tests
- Large camera dataset handling
- Real-time update performance
- Memory usage optimization
- Connection stability

## Dependencies

### Backend Dependencies
```
fastapi>=0.104.0
motor>=3.3.0
pydantic>=2.5.0
websockets>=12.0
opencv-python>=4.8.0
pillow>=10.0.0
```

### Frontend Dependencies
```
react>=18.0.0
next>=14.0.0
react-hook-form>=7.48.0
zod>=3.22.0
lucide-react>=0.300.0
recharts>=2.8.0
```

## Monitoring and Analytics

### Key Metrics
- **Camera Uptime**: Availability percentage per camera
- **Stream Quality**: Video quality and performance metrics
- **Alert Generation**: Alerts per camera and time period
- **System Performance**: Overall camera system health
- **User Engagement**: Camera management interaction rates

### Performance Monitoring
- **Response Times**: API endpoint performance
- **WebSocket Latency**: Real-time update delays
- **Database Performance**: Query optimization metrics
- **Memory Usage**: System resource utilization

This camera management system provides a robust, scalable solution for managing surveillance cameras with real-time monitoring, comprehensive configuration management, and seamless integration with the alert system.
