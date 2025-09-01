from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
import os

class Settings(BaseSettings):
    # Environment
    APP_ENV: str = os.getenv("APP_ENV", "local")
    APP_ENV_FILE: str | None = os.getenv("APP_ENV_FILE")
    
    # Database
    MONGODB_URL: str = os.getenv("MONGODB_URL")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME")
    
    # API Base URLs (for docs/links)
    API_BASE_URL: str = os.getenv("API_BASE_URL")
    PRODUCTION_API_BASE_URL: str = os.getenv("PRODUCTION_API_BASE_URL")
    WS_BASE_URL: str = os.getenv("WS_BASE_URL")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY")
    ALGORITHM: str = os.getenv("ALGORITHM")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = os.getenv("REFRESH_TOKEN_EXPIRE_DAYS")  # 7 days for remember me
    REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS: int = os.getenv("REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS")  # 30 days for remember me
    
    # CORS
    ALLOWED_ORIGINS: List[str] = os.getenv("ALLOWED_ORIGINS")
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def _parse_allowed_origins(cls, value):
        if isinstance(value, str):
            text = value.strip()
            if text.startswith("[") and text.endswith("]"):
                try:
                    import json
                    return json.loads(text)
                except Exception:
                    pass
            return [item.strip() for item in text.split(",") if item.strip()]
        return value
    
    # AI Model
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    CONFIDENCE_THRESHOLD: float = os.getenv("CONFIDENCE_THRESHOLD", 0.5)
    NMS_THRESHOLD: float = os.getenv("NMS_THRESHOLD", 0.4)
    
    # Video Processing
    FRAME_RATE: int = os.getenv("FRAME_RATE", 30)
    FRAME_WIDTH: int = os.getenv("FRAME_WIDTH", 640)
    FRAME_HEIGHT: int = os.getenv("FRAME_HEIGHT", 480)
    
    # File Storage
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads").lower()
    ALERTS_DIR: str =  os.getenv("ALERTS_DIR", "alerts").lower()
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = os.getenv("LOG_FILE", "logs/app.log")
    
    model_config = {
        "env_file": os.getenv("APP_ENV_FILE", ".env"),
        "case_sensitive": True
    }

# Determine environment-specific .env file order
_app_env = os.getenv("APP_ENV", "local").lower()
_env_file_candidates = []

if _app_env == "local":
    _env_file_candidates = [".env.local", ".env"]
elif _app_env in ("development", "dev"):
    _env_file_candidates = [".env.development", ".env.dev", ".env"]
elif _app_env in ("staging", "stage"):
    _env_file_candidates = [".env.staging", ".env"]
elif _app_env in ("production", "prod"):
    _env_file_candidates = [".env.production", ".env.prod", ".env"]
else:
    _env_file_candidates = [".env"]

# Pick the first existing env file, allow override via APP_ENV_FILE
_explicit_env_file = os.getenv("APP_ENV_FILE")
if _explicit_env_file and os.path.exists(_explicit_env_file):
    selected_env_file = _explicit_env_file
else:
    # Search both CWD and backend/ directory to be robust to run location
    backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    backend_dir = os.path.normpath(backend_dir)
    search_candidates = []
    for f in _env_file_candidates:
        search_candidates.append(f)
        search_candidates.append(os.path.join(backend_dir, f))
    selected_env_file = next((f for f in search_candidates if os.path.exists(f)), ".env")

# Recreate settings with selected env file
class _EnvAwareSettings(Settings):
    model_config = {
        "env_file": selected_env_file,
        "case_sensitive": True,
    }

settings = _EnvAwareSettings()
