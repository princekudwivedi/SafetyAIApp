# Video Upload Testing Guide for Alert Generation

## Overview

This feature allows you to test your application's alert generation logic by uploading prerecorded video files instead of relying on live camera feeds. This is particularly useful for:

- Testing alert rules and detection algorithms
- Validating AI model performance
- Debugging alert generation logic
- Training and demonstration purposes

## How It Works

### 1. **Video Upload Process**
- Select a camera from the monitoring interface
- Upload a video file (MP4, AVI, MOV, etc.)
- Add an optional description for context
- File size limit: 100MB

### 2. **Video Processing**
- The system processes the video frame by frame
- AI analysis runs on each frame (at 5 FPS for performance)
- Alerts are generated based on detected violations
- Processing progress is tracked in real-time

### 3. **Alert Generation**
- Alerts are created with video-specific metadata
- Timestamps correspond to video playback time
- Frame numbers are recorded for precise event location
- WebSocket notifications are sent for real-time updates

## Usage Instructions

### Step 1: Access the Feature
1. Navigate to **Live Monitoring** in your dashboard
2. Select a camera from the camera list
3. Scroll down to find the **"Video Upload Testing"** section

### Step 2: Upload a Video File
1. Click **"Choose File"** and select your video file
2. Add an optional description (e.g., "Test video for unauthorized access detection")
3. Click **"Upload Video"**
4. Wait for the upload to complete

### Step 3: Process the Video
1. After upload, click **"Process for Alerts"**
2. The system will start analyzing the video frames
3. Monitor progress in the uploads list
4. Processing time depends on video length and frame rate

### Step 4: Review Results
1. Check the uploads list for processing status
2. View generated alerts in the **Alerts** section
3. Each alert includes:
   - Video timestamp (when in the video the event occurred)
   - Frame number
   - AI analysis results
   - Confidence scores

## Technical Details

### Backend Implementation
- **New Endpoints**: `/api/v1/video/upload-video`, `/api/v1/video/process-video/{upload_id}`
- **File Storage**: Temporary storage in system temp directory
- **Video Processing**: OpenCV-based frame extraction and analysis
- **Alert Creation**: Integration with existing alert system

### Frontend Components
- **VideoUploadManager**: Main component for file upload and management
- **Enhanced Monitoring API**: New methods for upload operations
- **Real-time Updates**: Progress tracking and status updates

### AI Integration
- **Frame Analysis**: Each frame is processed through the AI engine
- **Alert Detection**: Violations trigger alert generation
- **Metadata Storage**: Video-specific information is preserved

## Testing Scenarios

### 1. **Safety Violation Detection**
- Upload videos showing workers without proper PPE
- Test detection of unauthorized access to restricted areas
- Verify fall detection and proximity warnings

### 2. **Performance Testing**
- Test with different video formats and resolutions
- Verify processing speed and resource usage
- Check alert accuracy and false positive rates

### 3. **Edge Cases**
- Test with very short or long videos
- Verify handling of corrupted or invalid files
- Test with videos containing no violations

## Best Practices

### Video File Preparation
- Use clear, well-lit footage for best detection results
- Keep file sizes reasonable (under 50MB for faster processing)
- Use common formats (MP4, AVI) for compatibility
- Ensure videos contain the types of events you want to test

### Testing Strategy
- Start with simple, obvious violations
- Gradually test more complex scenarios
- Document which videos generate which alerts
- Compare results with expected outcomes

### Performance Considerations
- Processing speed: ~5 FPS for optimal performance
- Memory usage scales with video resolution
- Longer videos take proportionally longer to process
- Consider processing during off-peak hours

## Troubleshooting

### Common Issues

#### Upload Fails
- Check file size (must be under 100MB)
- Verify file format is supported
- Check network connection and server status

#### Processing Stuck
- Refresh the page and check upload status
- Verify the video file isn't corrupted
- Check server logs for error messages

#### No Alerts Generated
- Verify the video contains detectable violations
- Check AI model configuration
- Review alert rule settings

#### Performance Issues
- Reduce video resolution for faster processing
- Check server resource usage
- Consider processing during low-traffic periods

### Debug Information
- Check browser console for error messages
- Monitor network requests in developer tools
- Review server logs for backend errors
- Use the upload status endpoint for detailed information

## Integration with Existing Systems

### Alert System
- Generated alerts appear in the main alerts list
- WebSocket notifications work as with live camera feeds
- Alert metadata includes video-specific information
- Integration with existing alert management workflows

### Dashboard Updates
- Alert counts update in real-time
- Statistics reflect both live and uploaded video alerts
- Historical data includes video upload results
- Consistent with existing monitoring patterns

## Security Considerations

### File Validation
- Only video files are accepted
- File size limits prevent abuse
- Temporary storage with automatic cleanup
- User authentication required for all operations

### Access Control
- Users can only access their own uploads
- Camera selection validates user permissions
- Upload deletion requires confirmation
- Audit trail maintained for all operations

## Future Enhancements

### Planned Features
- **Batch Processing**: Upload multiple videos simultaneously
- **Scheduled Processing**: Queue videos for off-peak processing
- **Advanced Analytics**: Detailed processing statistics and metrics
- **Export Results**: Download processing reports and analysis data

### Performance Improvements
- **Parallel Processing**: Multiple videos processed simultaneously
- **GPU Acceleration**: Hardware-accelerated video processing
- **Smart Sampling**: Adaptive frame rate based on content
- **Caching**: Reuse analysis results for similar content

## Support and Documentation

### Getting Help
- Check this guide for common solutions
- Review server logs for detailed error information
- Test with simple videos first
- Contact support for persistent issues

### Additional Resources
- API documentation for backend endpoints
- Component documentation for frontend usage
- Performance benchmarks and testing data
- Best practices and optimization tips

---

This feature provides a powerful way to test and validate your safety monitoring system without requiring live camera feeds. Use it to ensure your alert generation logic works correctly across various scenarios and conditions.
