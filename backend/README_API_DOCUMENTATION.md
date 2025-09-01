# API Documentation Guide

## Overview

The Construction Site Safety AI system provides comprehensive API documentation using Swagger/OpenAPI 3.x. This guide explains how to access and use the documentation.

## Accessing the API Documentation

### 1. Swagger UI (Interactive Documentation)

**URL**: `http://localhost:8000/docs`

This provides an interactive web interface where you can:
- Browse all available endpoints
- Test API calls directly from the browser
- View request/response schemas
- See authentication requirements
- Try out different parameters

### 2. ReDoc (Alternative Documentation)

**URL**: `http://localhost:8000/redoc`

This provides a more detailed, static documentation view that's great for:
- Reading comprehensive API documentation
- Understanding data models
- Viewing examples

### 3. OpenAPI JSON Schema

**URL**: `http://localhost:8000/openapi.json`

This provides the raw OpenAPI 3.x specification in JSON format, useful for:
- Integration with other tools
- Code generation
- API testing tools

## Features of the Documentation

### 🔐 Authentication
- **JWT Bearer Token**: Most endpoints require authentication
- **Token Management**: Login, refresh, and token validation endpoints
- **Role-Based Access**: Different permissions for different user roles

### 📋 Comprehensive Coverage
- **10 API Categories**: Authentication, Users, Sites, Cameras, Alerts, Video, Statistics, Reports, Profile, System Settings
- **50+ Endpoints**: Complete CRUD operations for all resources
- **Detailed Examples**: Request/response examples for all endpoints

### 🎯 Detailed Information
- **HTTP Methods**: GET, POST, PUT, DELETE for each endpoint
- **Request Parameters**: Query, path, and body parameters
- **Response Schemas**: Success and error response formats
- **Status Codes**: All possible HTTP status codes with explanations
- **Validation Rules**: Input validation requirements

### 🔧 Interactive Testing
- **Try It Out**: Test endpoints directly from Swagger UI
- **Authentication**: Enter your JWT token to test protected endpoints
- **Parameter Input**: Fill in forms for request parameters
- **Response Viewing**: See actual API responses

## API Categories

### 1. Authentication (`/auth`)
- **POST /auth/token** - OAuth2 login
- **POST /auth/login** - Custom login with remember me
- **POST /auth/refresh** - Refresh access token
- **GET /auth/me** - Get current user info
- **POST /auth/register** - Register new user

### 2. Users (`/users`)
- **GET /users/** - List users with pagination
- **POST /users/** - Create new user
- **GET /users/{id}** - Get specific user
- **PUT /users/{id}** - Update user
- **DELETE /users/{id}** - Delete user

### 3. Sites (`/sites`)
- **GET /sites/** - List construction sites
- **POST /sites/** - Create new site
- **GET /sites/{id}** - Get specific site
- **PUT /sites/{id}** - Update site
- **DELETE /sites/{id}** - Delete site

### 4. Cameras (`/cameras`)
- **GET /cameras/** - List cameras
- **POST /cameras/** - Add new camera
- **GET /cameras/{id}** - Get specific camera
- **PUT /cameras/{id}** - Update camera
- **DELETE /cameras/{id}** - Delete camera

### 5. Alerts (`/alerts`)
- **GET /alerts/** - List safety alerts
- **PUT /alerts/{id}/status** - Update alert status
- **GET /alerts/count** - Get alert counts
- **GET /alerts/summary** - Get alert summaries

### 6. Video (`/video`)
- **POST /video/process** - Process video stream
- **GET /video/stream/{camera_id}** - Get live stream
- **POST /video/analyze** - Analyze video for violations

### 7. Statistics (`/stats`)
- **GET /stats/dashboard** - Dashboard statistics
- **GET /stats/alerts/summary** - Alert statistics
- **GET /stats/violations** - Violation statistics

### 8. Reports (`/reports`)
- **GET /reports/** - List reports
- **POST /reports/generate** - Generate new report
- **GET /reports/{id}** - Get specific report
- **GET /reports/{id}/download** - Download report

### 9. Profile (`/profile`)
- **GET /profile/** - Get user profile
- **PUT /profile/** - Update profile
- **PUT /profile/password** - Change password

### 10. System Settings (`/system-settings`)
- **GET /system-settings/** - List all settings
- **GET /system-settings/{key}** - Get specific setting
- **PUT /system-settings/{key}** - Update setting
- **POST /system-settings/reset** - Reset to defaults
- **GET /system-settings/health/status** - System health

## Getting Started

### 1. Start the Backend Server
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Access the Documentation
Open your browser and navigate to:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### 3. Authenticate (for Protected Endpoints)
1. Use the `/auth/login` endpoint to get a JWT token
2. Click the "Authorize" button in Swagger UI
3. Enter your token: `Bearer <your_token>`
4. Now you can test protected endpoints

### 4. Test Endpoints
1. Find the endpoint you want to test
2. Click "Try it out"
3. Fill in the required parameters
4. Click "Execute"
5. View the response

## Example Usage

### Authentication Flow
```bash
# 1. Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin123"}'

# 2. Use token for protected endpoints
curl -X GET "http://localhost:8000/api/v1/users/" \
  -H "Authorization: Bearer <your_token>"
```

### System Settings Example
```bash
# Get all system settings
curl -X GET "http://localhost:8000/api/v1/system-settings/" \
  -H "Authorization: Bearer <your_token>"

# Update a setting
curl -X PUT "http://localhost:8000/api/v1/system-settings/confidence_threshold" \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"value": 0.7}'
```

## Error Handling

The API uses standard HTTP status codes:

- **200** - Success
- **201** - Created
- **400** - Bad Request
- **401** - Unauthorized
- **403** - Forbidden
- **404** - Not Found
- **422** - Validation Error
- **500** - Internal Server Error

## Rate Limiting

- **Standard endpoints**: 100 requests per minute
- **Video processing**: 10 requests per minute
- **Authentication**: 5 attempts per minute

## User Roles and Permissions

### Administrator
- Full system access
- Can manage all users, sites, cameras, and settings
- Can view all reports and statistics

### Supervisor
- Site management and reporting
- Can view and manage alerts
- Can access system settings (read-only)

### Safety Officer
- Alert management and monitoring
- Can update alert statuses
- Can view reports and statistics

### Operator
- Basic viewing and alert acknowledgment
- Can view assigned cameras and alerts
- Limited access to reports

## Support

For technical support or questions about the API:
- **Email**: support@safetyai.com
- **Documentation**: http://localhost:8000/docs
- **OpenAPI Schema**: http://localhost:8000/openapi.json

## Additional Resources

- **Complete API Documentation**: `backend/API_DOCUMENTATION.md`
- **Backend Source Code**: `backend/app/api/v1/endpoints/`
- **Data Models**: `backend/app/models/`
- **Configuration**: `backend/app/core/config.py`
