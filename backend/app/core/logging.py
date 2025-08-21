import logging
import os
from logging.handlers import RotatingFileHandler
from app.core.config import settings

def setup_logging():
    """Setup logging configuration."""
    # Create logs directory if it doesn't exist
    os.makedirs(os.path.dirname(settings.LOG_FILE), exist_ok=True)
    
    # Configure logging
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            RotatingFileHandler(
                settings.LOG_FILE,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            ),
            logging.StreamHandler()
        ]
    )
    
    # Set specific logger levels
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
