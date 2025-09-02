from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import uvicorn
from app.core.config import settings
from app.core.database import init_db
from app.api.v1.api import api_router
from app.core.logging import setup_logging
from app.core.auth_middleware import add_global_auth_middleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    setup_logging()
    await init_db()
    yield
    # Shutdown
    pass

app = FastAPI(
    title="Construction Site Safety AI",
    description="""
    # Construction Site Safety AI - API Documentation
    
    ## Overview
    AI-Powered Construction Site Safety Monitoring System with real-time video analysis, alert management, and comprehensive reporting.
    
    ## Features
    - 🔐 **Authentication & Authorization**: JWT-based authentication with role-based access control
    - 📹 **Video Processing**: Real-time AI-powered safety violation detection
    - 🚨 **Alert Management**: Comprehensive alert system with severity levels and status tracking
    - 👥 **User Management**: Multi-role user system (Administrator, Supervisor, Safety Officer, Operator)
    - 📊 **Analytics & Reporting**: Detailed statistics and report generation
    - ⚙️ **System Settings**: Dynamic configuration management
    - 📍 **Site & Camera Management**: Multi-site support with camera configuration
    
    ## Authentication
    Most endpoints require authentication using JWT Bearer tokens. Include the token in the Authorization header:
    ```
    Authorization: Bearer <your_access_token>
    ```
    
    ## User Roles
    - **Administrator**: Full system access
    - **Supervisor**: Site management and reporting
    - **Safety Officer**: Alert management and monitoring
    - **Operator**: Basic viewing and alert acknowledgment
    
    ## API Base URL
    ```
    {settings.API_BASE_URL}/api/v1
    ```
    
    ## Rate Limiting
    - Standard endpoints: 100 requests per minute
    - Video processing: 10 requests per minute
    - Authentication: 5 attempts per minute
    
    ## Error Codes
    - `400` - Bad Request (invalid input)
    - `401` - Unauthorized (missing/invalid token)
    - `403` - Forbidden (insufficient permissions)
    - `404` - Not Found (resource doesn't exist)
    - `422` - Validation Error (invalid data format)
    - `500` - Internal Server Error
    
    ## Support
    For technical support, contact the development team.
    """,
    version="1.0.0",
    contact={
        "name": "Development Team",
        "email": "support@safetyai.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
    servers=[
        {
            "url": settings.API_BASE_URL,
            "description": "Development server"
        },
        {
            "url": settings.PRODUCTION_API_BASE_URL,
            "description": "Production server"
        }
    ],
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "Authentication",
            "description": "User authentication and authorization endpoints"
        },
        {
            "name": "Users",
            "description": "User management operations (CRUD)"
        },
        {
            "name": "Sites",
            "description": "Construction site management"
        },
        {
            "name": "Cameras",
            "description": "Camera configuration and management"
        },
        {
            "name": "Alerts",
            "description": "Safety alert management and processing"
        },
        {
            "name": "Video",
            "description": "Video processing and AI analysis"
        },
        {
            "name": "Statistics",
            "description": "Analytics and dashboard statistics"
        },
        {
            "name": "Reports",
            "description": "Report generation and export"
        },
        {
            "name": "Profile",
            "description": "User profile management"
        },
        {
            "name": "System Settings",
            "description": "System configuration and settings management"
        }
    ]
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global authentication middleware - must be added before including routers
add_global_auth_middleware(app)

# Include API router
app.include_router(api_router, prefix="/api/v1")

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Welcome to Construction Site Safety AI",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    return {"ok": True}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
