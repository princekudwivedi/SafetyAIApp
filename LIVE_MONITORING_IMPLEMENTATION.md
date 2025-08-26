# Live Monitoring Implementation for Safety AI App

## Overview
This document describes the implementation of live camera monitoring with real-time alert creation for the Safety AI application. The system continuously monitors live camera feeds, analyzes frames for safety violations, and dynamically creates alerts in the database.

## Core Components

### 1. Enhanced AI Engine (`backend/app/core/ai_engine.py`)
The AI engine has been enhanced with a new `analyze_frame` method that provides structured analysis of individual video frames:

```python
def analyze_frame(self, frame: np.ndarray, camera_id: str, 
                 timestamp: datetime, frame_number: int = 0) -> Dict[str, Any]:
    """Analyze a single frame for safety violations and return analysis results."""
```

**Key Features:**
- Object detection using YOLO model
- Safety violation analysis
- Structured return format with alert requirements
- Primary violation identification and scoring

**Return Structure:**
```python
{
    "alert_required": bool,
    "detections": List[Detection],
    "violations": List[AlertCreate],
    "primary_violation": AlertCreate,
    "frame_number": int,
    "timestamp": datetime,
    "camera_id": str
}
```

### 2. Enhanced Video Service (`backend/app/services/video_service.py`)
The video service has been completely refactored to implement continuous live monitoring:

#### Key Methods:

**`_process_video_stream`** - Main processing loop:
- Processes frames at configurable rate (every 3rd frame by default)
- Analyzes each frame for safety violations
- Implements alert cooldown to prevent spam
- Creates alerts dynamically in the database
- Maintains stream statistics

**`_analyze_frame_for_alerts`** - Frame analysis wrapper:
- Calls the AI engine's `analyze_frame` method
- Handles errors gracefully
- Returns structured analysis results

**`_should_create_alert`** - Alert cooldown management:
- Prevents duplicate alerts of the same type
- Configurable cooldown period (default: 30 seconds)
- Tracks last alert time per violation type

**`_create_alert_from_analysis`** - Alert creation:
- Creates `AlertCreate` objects from analysis results
- Saves snapshots of detected events
- Persists alerts to database via alert service
- Logs successful alert creation

**`_save_snapshot`** - Event snapshot capture:
- Saves frames when violations are detected
- Organizes snapshots by camera, date, and time
- Returns relative paths for database storage

## Configuration

### Frame Processing Settings (`backend/app/core/config.py`)
```python
# Video Processing
FRAME_RATE: int = 30          # Target processing rate
FRAME_WIDTH: int = 640        # Standard frame width
FRAME_HEIGHT: int = 480       # Standard frame height

# File Storage
ALERTS_DIR: str = "alerts"    # Snapshot storage directory
```

### Performance Tuning
- **Frame Skip**: Processes every 3rd frame by default for performance
- **Alert Cooldown**: 30-second minimum interval between alerts of the same type
- **Error Handling**: Graceful degradation with detailed logging

## Database Integration

### Alert Creation Flow
1. **Frame Analysis**: AI engine analyzes frame for violations
2. **Alert Decision**: Cooldown check determines if alert should be created
3. **Snapshot Capture**: Frame is saved as evidence
4. **Database Storage**: Alert is created via `AlertService.create_alert()`
5. **Statistics Update**: Stream metrics are updated in real-time

### Alert Data Structure
```python
AlertCreate(
    violation_type=ViolationType.UNAUTHORIZED_ACCESS,
    severity_level=SeverityLevel.HIGH,
    description="Unauthorized person detected in restricted area",
    confidence_score=0.95,
    location_id="site_001",
    camera_id="camera_001",
    primary_object="person",
    snapshot_url="alerts/camera_001/2024/01/15/143022_unauthorized_access.jpg"
)
```

## Real-Time Monitoring

### Stream Management
- **Active Streams**: Tracks all active camera streams
- **Task Management**: Manages async processing tasks
- **Statistics**: Real-time frame count and alert count
- **Graceful Shutdown**: Proper cleanup on stream termination

### Performance Monitoring
- Frame processing rate tracking
- Alert generation frequency
- Error rate monitoring
- Resource usage optimization

## Error Handling and Logging

### Comprehensive Logging
- Stream start/stop events
- Frame processing status
- Alert creation success/failure
- Error details with context
- Performance metrics

### Graceful Degradation
- Continues processing on individual frame errors
- Maintains stream stability
- Logs issues without crashing
- Fallback to default values when needed

## Usage Examples

### Starting Live Monitoring
```python
# Initialize video service
video_service = VideoService()

# Start monitoring a camera
await video_service.start_video_stream(
    camera_id="camera_001",
    stream_url="rtsp://camera.example.com/stream",
    location_id="site_001",
    callback=handle_frame_callback
)
```

### Processing Callback
```python
async def handle_frame_callback(data):
    if data["type"] == "frame_processed":
        print(f"Frame {data['frame_number']} processed")
        print(f"Detections: {len(data['detections'])}")
        print(f"Alerts generated: {data['alerts_generated']}")
```

## Security Considerations

### Access Control
- All endpoints require authentication
- Camera access validation
- Location-based permissions

### Data Privacy
- Snapshots stored securely
- Access logs maintained
- Sensitive data encryption

## Monitoring and Maintenance

### Health Checks
- Stream status monitoring
- Processing rate verification
- Alert generation validation
- Error rate tracking

### Performance Optimization
- Frame skip rate adjustment
- Alert cooldown tuning
- Resource usage monitoring
- Scaling considerations

## Future Enhancements

### Planned Features
- Multi-camera synchronization
- Advanced alert correlation
- Machine learning model updates
- Real-time dashboard metrics
- Alert escalation workflows

### Scalability Improvements
- Distributed processing
- Load balancing
- Database optimization
- Caching strategies

## Troubleshooting

### Common Issues
1. **High CPU Usage**: Reduce frame processing rate
2. **Memory Leaks**: Check for proper cleanup in callbacks
3. **Database Connection**: Verify MongoDB connectivity
4. **File Permissions**: Ensure alerts directory is writable

### Debug Mode
Enable detailed logging by setting `LOG_LEVEL=DEBUG` in configuration.

## Conclusion

The live monitoring implementation provides a robust, scalable solution for real-time safety monitoring. The system automatically detects safety violations, creates detailed alerts with visual evidence, and maintains continuous operation with comprehensive error handling and performance monitoring.

The modular design allows for easy extension and customization while maintaining high performance and reliability standards.
