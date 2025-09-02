# Railway Deployment Guide for SafetyAI Backend

## Overview
This guide provides step-by-step instructions for deploying the SafetyAI backend application to Railway.

## Prerequisites
- Railway account
- MongoDB database (can be provisioned through Railway)
- Environment variables configured

## Deployment Steps

### 1. Environment Variables Setup
Configure the following environment variables in Railway:

#### Required Variables:
```
MONGODB_URL=mongodb://username:password@host:port/database
DATABASE_NAME=safetyai_db
SECRET_KEY=your-secret-key-here
```

#### Optional Variables (with defaults):
```
APP_ENV=production
LOG_LEVEL=INFO
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS=30
ALLOWED_ORIGINS=["*"]
YOLO_MODEL_PATH=yolov8n.pt
CONFIDENCE_THRESHOLD=0.5
NMS_THRESHOLD=0.4
FRAME_RATE=30
FRAME_WIDTH=640
FRAME_HEIGHT=480
UPLOAD_DIR=uploads
ALERTS_DIR=alerts
```

### 2. Database Setup
1. Add a MongoDB service to your Railway project
2. Copy the connection string to `MONGODB_URL`
3. Set `DATABASE_NAME` to your preferred database name

### 3. Deployment Methods

#### Method 1: Nixpacks (Recommended)
Railway will automatically detect and use the `nixpacks.toml` configuration.

#### Method 2: Docker
If Nixpacks fails, Railway can use the provided `Dockerfile`:
1. Ensure Docker is enabled in Railway settings
2. The `Dockerfile` will be used automatically

### 4. Health Check
The application includes a health check endpoint at `/` that returns:
```json
{
  "message": "Welcome to Construction Site Safety AI",
  "version": "1.0.0",
  "status": "running"
}
```

### 5. Troubleshooting

#### Common Issues:

1. **Nixpacks Build Failed**
   - Check that all dependencies in `requirements.txt` are compatible
   - Verify system dependencies in `nixpacks.toml`
   - Try using Docker deployment instead

2. **Import Errors**
   - Ensure all Python files are properly structured
   - Check that `__init__.py` files exist in all packages

3. **Database Connection Issues**
   - Verify `MONGODB_URL` is correctly formatted
   - Check that the database is accessible from Railway

4. **Port Issues**
   - Railway automatically sets the `PORT` environment variable
   - The application is configured to use this port

#### Debugging Steps:
1. Check Railway logs for detailed error messages
2. Use the startup script (`start.py`) for better error reporting
3. Verify environment variables are set correctly
4. Test the application locally with the same configuration

### 6. Post-Deployment
1. Verify the health check endpoint responds
2. Test API endpoints using the provided documentation
3. Monitor logs for any runtime errors
4. Set up monitoring and alerts as needed

## File Structure
```
backend/
├── main.py                 # Main FastAPI application
├── start.py               # Startup script with debugging
├── requirements.txt       # Python dependencies
├── nixpacks.toml         # Nixpacks configuration
├── Procfile              # Process configuration
├── Dockerfile            # Docker configuration
├── railway.toml          # Railway-specific settings
└── app/                  # Application code
    ├── api/              # API endpoints
    ├── core/             # Core functionality
    ├── models/           # Database models
    └── services/         # Business logic
```

## Support
If you encounter issues:
1. Check the Railway logs
2. Verify all environment variables are set
3. Test locally with the same configuration
4. Review the application logs for specific error messages
