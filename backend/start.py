#!/usr/bin/env python3
"""
Startup script for the SafetyAI Application
This script helps with debugging and ensures proper startup
"""

import os
import sys
import logging
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Ensure we're in the right directory
os.chdir(backend_dir)

def setup_environment():
    """Setup environment variables and logging"""
    # Set default environment variables if not set
    os.environ.setdefault("APP_ENV", "production")
    os.environ.setdefault("LOG_LEVEL", "INFO")
    os.environ.setdefault("PYTHONPATH", str(backend_dir))
    
    # Setup basic logging
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    
    logger = logging.getLogger(__name__)
    logger.info("Environment setup completed")
    return logger

def check_dependencies():
    """Check if all required dependencies are available"""
    logger = logging.getLogger(__name__)
    
    try:
        import fastapi
        import uvicorn
        import pymongo
        import cv2
        import ultralytics
        logger.info("All dependencies imported successfully")
        return True
    except ImportError as e:
        logger.error(f"Missing dependency: {e}")
        return False

def main():
    """Main startup function"""
    logger = setup_environment()
    
    logger.info("Starting SafetyAI Application...")
    
    # Check dependencies
    if not check_dependencies():
        logger.error("Dependency check failed. Exiting.")
        sys.exit(1)
    
    # Import and run the application
    try:
        from main import app
        import uvicorn
        
        port = int(os.getenv("PORT", 8000))
        host = os.getenv("HOST", "0.0.0.0")
        
        logger.info(f"Starting server on {host}:{port}")
        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level=os.getenv("LOG_LEVEL", "info").lower()
        )
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
