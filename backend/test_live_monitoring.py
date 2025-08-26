#!/usr/bin/env python3
"""
Test script for live monitoring functionality.
This script tests the enhanced video service with live camera monitoring.
"""

import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from app.services.video_service import VideoService
from app.core.logging import get_logger

logger = get_logger(__name__)

async def test_live_monitoring():
    """Test the live monitoring functionality."""
    try:
        logger.info("Starting live monitoring test...")
        
        # Initialize video service
        video_service = VideoService()
        
        # Test data
        test_camera_id = "test_camera_001"
        test_location_id = "test_site_001"
        test_stream_url = "0"  # Use default webcam for testing
        
        # Callback function to handle frame processing
        async def frame_callback(data):
            """Handle frame processing callbacks."""
            if data["type"] == "frame_processed":
                logger.info(f"Frame {data['frame_number']} processed for camera {data['camera_id']}")
                logger.info(f"Detections: {len(data['detections'])}")
                logger.info(f"Alerts generated: {data['alerts_generated']}")
                
                # Check if we should stop the test
                if data['frame_number'] >= 30:  # Stop after 30 frames
                    logger.info("Reached 30 frames, stopping test...")
                    await video_service.stop_video_stream(test_camera_id)
        
        # Start video stream
        logger.info(f"Starting video stream for camera {test_camera_id}")
        await video_service.start_video_stream(
            camera_id=test_camera_id,
            stream_url=test_stream_url,
            location_id=test_location_id,
            callback=frame_callback
        )
        
        # Wait for processing to complete
        logger.info("Waiting for video processing to complete...")
        while test_camera_id in video_service.active_streams:
            await asyncio.sleep(1)
        
        # Check final statistics
        if test_camera_id in video_service.active_streams:
            stats = video_service.active_streams[test_camera_id]
            logger.info(f"Final statistics: {stats}")
        else:
            logger.info("Stream processing completed")
        
        logger.info("Live monitoring test completed successfully!")
        
    except Exception as e:
        logger.error(f"Error during live monitoring test: {e}")
        raise

async def test_alert_creation():
    """Test alert creation functionality."""
    try:
        logger.info("Testing alert creation...")
        
        # Initialize video service
        video_service = VideoService()
        
        # Test data
        test_camera_id = "test_camera_002"
        test_location_id = "test_site_001"
        
        # Simulate analysis result
        mock_analysis = {
            "alert_required": True,
            "primary_violation": type('MockViolation', (), {
                'violation_type': type('MockType', (), {'value': 'test_violation'})(),
                'severity_level': type('MockSeverity', (), {'value': 'high'})(),
                'description': 'Test violation for testing',
                'confidence_score': 0.95,
                'primary_object': 'person'
            })()
        }
        
        # Test alert creation
        should_create = await video_service._should_create_alert(
            mock_analysis, {}, 30
        )
        logger.info(f"Should create alert: {should_create}")
        
        # Test with cooldown
        last_alert_time = {"test_violation": asyncio.get_event_loop().time()}
        should_create_with_cooldown = await video_service._should_create_alert(
            mock_analysis, last_alert_time, 30
        )
        logger.info(f"Should create alert with cooldown: {should_create_with_cooldown}")
        
        logger.info("Alert creation test completed!")
        
    except Exception as e:
        logger.error(f"Error during alert creation test: {e}")
        raise

async def main():
    """Main test function."""
    try:
        logger.info("=== Live Monitoring Test Suite ===")
        
        # Test alert creation logic
        await test_alert_creation()
        
        # Test live monitoring (uncomment to test with actual camera)
        # await test_live_monitoring()
        
        logger.info("All tests completed successfully!")
        
    except Exception as e:
        logger.error(f"Test suite failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    # Run the test suite
    asyncio.run(main())
