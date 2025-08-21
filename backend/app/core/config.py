from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    # Database
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "safety_ai_db"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000"
    ]
    
    # AI Model
    YOLO_MODEL_PATH: str = "yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.5
    NMS_THRESHOLD: float = 0.4
    
    # Video Processing
    FRAME_RATE: int = 30
    FRAME_WIDTH: int = 640
    FRAME_HEIGHT: int = 480
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    ALERTS_DIR: str = "alerts"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "logs/app.log"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
