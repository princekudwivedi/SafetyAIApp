# Construction Site Safety AI - API Documentation

## Overview

This document provides comprehensive documentation for all APIs in the Construction Site Safety AI system. The API follows RESTful principles and uses JWT-based authentication.

**Base URL**: `http://localhost:8000/api/v1`

**Authentication**: Most endpoints require a JWT Bearer token in the Authorization header:
```
Authorization: Bearer <your_access_token>
```

## Table of Contents

1. [Authentication](#authentication)
2. [Users](#users)
3. [Sites](#sites)
4. [Cameras](#cameras)
5. [Alerts](#alerts)
6. [Video](#video)
7. [Statistics](#statistics)
8. [Reports](#reports)
9. [Profile](#profile)
10. [System Settings](#system-settings)

---

## Authentication

### POST /auth/token

**OAuth2 Login** - Authenticate user using OAuth2 password flow and return access/refresh tokens.

**Request Body** (form-data):
```
username: string (required)
password: string (required)
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_expires_in": 604800
}
```

**Error Responses**:
- `401` - Incorrect username or password
- `422` - Validation error

### POST /auth/login

**Custom Login** - Custom login endpoint with remember me functionality.

**Request Body**:
```json
{
  "username": "admin",
  "password": "admin123",
  "remember_me": false
}
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_expires_in": 604800
}
```

**Error Responses**:
- `401` - Incorrect username or password
- `422` - Validation error

### POST /auth/refresh

**Refresh Token** - Refresh an expired access token using a valid refresh token.

**Request Body**:
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_expires_in": 604800
}
```

**Error Responses**:
- `401` - Invalid refresh token
- `422` - Validation error

### GET /auth/me

**Get Current User** - Retrieve information about the currently authenticated user.

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "admin",
  "email": "admin@safetyai.com",
  "first_name": "System",
  "last_name": "Administrator",
  "role": "Administrator",
  "site_id": "SITE_001",
  "is_active": true,
  "permissions": ["read", "write", "delete", "admin"],
  "created_at": "2025-08-29T17:13:29.182000",
  "updated_at": "2025-08-30T09:36:54.128000",
  "last_login": "2025-08-31T03:53:08.930000"
}
```

**Error Responses**:
- `401` - Invalid or missing token
- `400` - Inactive user

### POST /auth/register

**Register User** - Register a new user account (development/testing purposes only).

**Request Body**:
```json
{
  "username": "newuser",
  "password": "password123",
  "remember_me": false
}
```

**Response** (200):
```json
{
  "message": "User registered successfully",
  "user_id": "68b3c724f7dd9b36dd0b01e6"
}
```

**Error Responses**:
- `400` - Username already exists
- `422` - Validation error
- `500` - Internal server error

---

## Users

### GET /users/

**Get Users List** - Retrieve a paginated list of users.

**Query Parameters**:
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `search`: string (optional)
- `role`: string (optional)
- `status`: string (optional)

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "users": [
    {
      "id": "68b3c724f7dd9b36dd0b01e6",
      "username": "admin",
      "email": "admin@safetyai.com",
      "first_name": "System",
      "last_name": "Administrator",
      "role": "Administrator",
      "site_id": "SITE_001",
      "is_active": true,
      "permissions": ["read", "write", "delete", "admin"],
      "created_at": "2025-08-29T17:13:29.182000",
      "updated_at": "2025-08-30T09:36:54.128000",
      "last_login": "2025-08-31T03:53:08.930000"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

**Error Responses**:
- `401` - Unauthorized
- `403` - Insufficient permissions

### POST /users/

**Create User** - Create a new user account.

**Request Body**:
```json
{
  "username": "newuser",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "Operator",
  "site_id": "SITE_001",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "newuser",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "Operator",
  "site_id": "SITE_001",
  "is_active": true,
  "permissions": ["read"],
  "created_at": "2025-08-31T04:00:00.000000",
  "updated_at": "2025-08-31T04:00:00.000000"
}
```

**Error Responses**:
- `400` - Validation error
- `401` - Unauthorized
- `403` - Insufficient permissions
- `409` - Username/email already exists

### GET /users/{user_id}

**Get User** - Retrieve a specific user by ID.

**Path Parameters**:
- `user_id`: string (required)

**Response** (200):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "admin",
  "email": "admin@safetyai.com",
  "first_name": "System",
  "last_name": "Administrator",
  "role": "Administrator",
  "site_id": "SITE_001",
  "is_active": true,
  "permissions": ["read", "write", "delete", "admin"],
  "created_at": "2025-08-29T17:13:29.182000",
  "updated_at": "2025-08-30T09:36:54.128000",
  "last_login": "2025-08-31T03:53:08.930000"
}
```

**Error Responses**:
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - User not found

### PUT /users/{user_id}

**Update User** - Update an existing user's information.

**Path Parameters**:
- `user_id`: string (required)

**Request Body**:
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "email": "updated@example.com",
  "role": "Supervisor",
  "site_id": "SITE_002",
  "is_active": true
}
```

**Response** (200):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "admin",
  "email": "updated@example.com",
  "first_name": "Updated",
  "last_name": "Name",
  "role": "Supervisor",
  "site_id": "SITE_002",
  "is_active": true,
  "permissions": ["read", "write"],
  "created_at": "2025-08-29T17:13:29.182000",
  "updated_at": "2025-08-31T04:00:00.000000",
  "last_login": "2025-08-31T03:53:08.930000"
}
```

**Error Responses**:
- `400` - Validation error
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - User not found

### DELETE /users/{user_id}

**Delete User** - Delete a user account.

**Path Parameters**:
- `user_id`: string (required)

**Response** (204): No content

**Error Responses**:
- `401` - Unauthorized
- `403` - Insufficient permissions
- `404` - User not found

---

## Sites

### GET /sites/

**Get Sites List** - Retrieve a paginated list of construction sites.

**Query Parameters**:
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `search`: string (optional)

**Response** (200):
```json
{
  "sites": [
    {
      "id": "SITE_001",
      "name": "Main Construction Site",
      "location": "123 Main St, City",
      "description": "Primary construction site for the new building project",
      "status": "active",
      "created_at": "2025-08-29T17:13:29.182000",
      "updated_at": "2025-08-30T09:36:54.128000"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

### POST /sites/

**Create Site** - Create a new construction site.

**Request Body**:
```json
{
  "name": "New Site",
  "location": "456 Oak Ave, Town",
  "description": "Secondary construction site"
}
```

**Response** (201):
```json
{
  "id": "SITE_002",
  "name": "New Site",
  "location": "456 Oak Ave, Town",
  "description": "Secondary construction site",
  "status": "active",
  "created_at": "2025-08-31T04:00:00.000000",
  "updated_at": "2025-08-31T04:00:00.000000"
}
```

---

## Cameras

### GET /cameras/

**Get Cameras List** - Retrieve a paginated list of cameras.

**Query Parameters**:
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `site_id`: string (optional)
- `status`: string (optional)

**Response** (200):
```json
{
  "cameras": [
    {
      "id": "CAM_001",
      "name": "Main Entrance Camera",
      "site_id": "SITE_001",
      "location": "Main entrance",
      "ip_address": "192.168.1.100",
      "port": 554,
      "username": "admin",
      "status": "active",
      "created_at": "2025-08-29T17:13:29.182000",
      "updated_at": "2025-08-30T09:36:54.128000"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

### POST /cameras/

**Create Camera** - Add a new camera to the system.

**Request Body**:
```json
{
  "name": "New Camera",
  "site_id": "SITE_001",
  "location": "Side entrance",
  "ip_address": "192.168.1.101",
  "port": 554,
  "username": "admin",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "id": "CAM_002",
  "name": "New Camera",
  "site_id": "SITE_001",
  "location": "Side entrance",
  "ip_address": "192.168.1.101",
  "port": 554,
  "username": "admin",
  "status": "active",
  "created_at": "2025-08-31T04:00:00.000000",
  "updated_at": "2025-08-31T04:00:00.000000"
}
```

---

## Alerts

### GET /alerts/

**Get Alerts List** - Retrieve a paginated list of safety alerts.

**Query Parameters**:
- `page`: int (default: 1)
- `limit`: int (default: 10)
- `status`: string (optional)
- `severity`: string (optional)
- `violation_type`: string (optional)
- `camera_id`: string (optional)
- `start_date`: string (optional)
- `end_date`: string (optional)

**Response** (200):
```json
{
  "alerts": [
    {
      "alert_id": "68b1dfba5468ac2df51670e4",
      "timestamp": "2025-08-29T15:51:30.669000",
      "violation_type": "no_hard_hat",
      "severity_level": "medium",
      "description": "No Hard Hat detected in Main entrance monitoring construction site access",
      "camera_id": "CAM_001",
      "status": "resolved",
      "confidence_score": 0.97
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "total_pages": 1
}
```

### PUT /alerts/{alert_id}/status

**Update Alert Status** - Update the status of a safety alert.

**Path Parameters**:
- `alert_id`: string (required)

**Request Body**:
```json
{
  "status": "resolved",
  "notes": "Issue has been addressed"
}
```

**Response** (200):
```json
{
  "alert_id": "68b1dfba5468ac2df51670e4",
  "status": "resolved",
  "notes": "Issue has been addressed",
  "updated_at": "2025-08-31T04:00:00.000000"
}
```

---

## Video

### POST /video/process

**Process Video Stream** - Process a video stream for safety violations.

**Request Body**:
```json
{
  "camera_id": "CAM_001",
  "stream_url": "rtsp://192.168.1.100:554/stream",
  "duration": 30
}
```

**Response** (200):
```json
{
  "processing_id": "proc_123456",
  "status": "processing",
  "estimated_completion": "2025-08-31T04:00:30.000000"
}
```

### GET /video/stream/{camera_id}

**Get Video Stream** - Get live video stream from a camera.

**Path Parameters**:
- `camera_id`: string (required)

**Response**: Video stream (multipart/x-mixed-replace)

---

## Statistics

### GET /stats/dashboard

**Get Dashboard Statistics** - Retrieve comprehensive dashboard statistics.

**Response** (200):
```json
{
  "total_alerts": 150,
  "today_alerts": 5,
  "yesterday_alerts": 12,
  "new_alerts": 47,
  "in_progress_alerts": 31,
  "resolved_alerts": 37,
  "high_severity_alerts": 43,
  "medium_severity_alerts": 51,
  "low_severity_alerts": 56,
  "total_cameras": 5,
  "total_sites": 3,
  "safety_score": 87.7,
  "recent_alerts": [...],
  "violation_types": [...],
  "weekly_data": [...],
  "severity_levels": ["high", "low", "medium"],
  "last_updated": "2025-08-31T03:45:56.769677+00:00"
}
```

### GET /stats/alerts/summary

**Get Alerts Summary** - Get summary statistics for alerts.

**Response** (200):
```json
{
  "alerts_by_status": [
    {"status": "resolved", "count": 33},
    {"status": "new", "count": 40},
    {"status": "in_progress", "count": 29},
    {"status": "dismissed", "count": 31}
  ],
  "alerts_by_severity": [
    {"severity": "high", "count": 39},
    {"severity": "low", "count": 51},
    {"severity": "medium", "count": 43}
  ],
  "recent_alerts": [...],
  "weekly_violations": 34
}
```

---

## Reports

### GET /reports/

**Get Reports List** - Retrieve a list of available reports.

**Response** (200):
```json
{
  "reports": [
    {
      "id": "report_001",
      "name": "Daily Safety Report",
      "type": "daily",
      "description": "Daily safety violation summary",
      "generated_at": "2025-08-31T04:00:00.000000",
      "status": "completed"
    }
  ]
}
```

### POST /reports/generate

**Generate Report** - Generate a new report.

**Request Body**:
```json
{
  "report_type": "daily",
  "start_date": "2025-08-30",
  "end_date": "2025-08-31",
  "site_id": "SITE_001"
}
```

**Response** (202):
```json
{
  "report_id": "report_002",
  "status": "generating",
  "estimated_completion": "2025-08-31T04:05:00.000000"
}
```

### GET /reports/{report_id}

**Get Report** - Retrieve a specific report.

**Path Parameters**:
- `report_id`: string (required)

**Response** (200):
```json
{
  "id": "report_001",
  "name": "Daily Safety Report",
  "type": "daily",
  "content": {...},
  "generated_at": "2025-08-31T04:00:00.000000",
  "status": "completed"
}
```

---

## Profile

### GET /profile/

**Get User Profile** - Get the current user's profile information.

**Response** (200):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "admin",
  "email": "admin@safetyai.com",
  "first_name": "System",
  "last_name": "Administrator",
  "role": "Administrator",
  "site_id": "SITE_001",
  "is_active": true,
  "permissions": ["read", "write", "delete", "admin"],
  "created_at": "2025-08-29T17:13:29.182000",
  "updated_at": "2025-08-30T09:36:54.128000",
  "last_login": "2025-08-31T03:53:08.930000"
}
```

### PUT /profile/

**Update Profile** - Update the current user's profile information.

**Request Body**:
```json
{
  "first_name": "Updated",
  "last_name": "Name",
  "email": "updated@example.com"
}
```

**Response** (200):
```json
{
  "id": "68b3c724f7dd9b36dd0b01e6",
  "username": "admin",
  "email": "updated@example.com",
  "first_name": "Updated",
  "last_name": "Name",
  "role": "Administrator",
  "site_id": "SITE_001",
  "is_active": true,
  "permissions": ["read", "write", "delete", "admin"],
  "created_at": "2025-08-29T17:13:29.182000",
  "updated_at": "2025-08-31T04:00:00.000000",
  "last_login": "2025-08-31T03:53:08.930000"
}
```

### PUT /profile/password

**Change Password** - Change the current user's password.

**Request Body**:
```json
{
  "current_password": "oldpassword",
  "new_password": "newpassword123"
}
```

**Response** (200):
```json
{
  "message": "Password updated successfully"
}
```

---

## System Settings

### GET /system-settings/

**Get System Settings** - Retrieve all system settings or filter by category.

**Query Parameters**:
- `category`: string (optional) - Filter by category (ai, video, notifications, system)

**Response** (200):
```json
{
  "settings": [
    {
      "key": "ai_model_path",
      "value": "/models/yolov8n.pt",
      "type": "string",
      "label": "AI Model Path",
      "description": "Path to the YOLO model file",
      "category": "ai"
    },
    {
      "key": "confidence_threshold",
      "value": 0.5,
      "type": "number",
      "label": "Confidence Threshold",
      "description": "Minimum confidence score for object detection (0.0 - 1.0)",
      "category": "ai",
      "min_value": 0.0,
      "max_value": 1.0
    },
    {
      "key": "frame_rate",
      "value": 30,
      "type": "number",
      "label": "Frame Rate",
      "description": "Video processing frame rate (fps)",
      "category": "video",
      "min_value": 1,
      "max_value": 60
    }
  ],
  "total": 3
}
```

### GET /system-settings/{setting_key}

**Get System Setting** - Retrieve a specific system setting by key.

**Path Parameters**:
- `setting_key`: string (required)

**Response** (200):
```json
{
  "key": "confidence_threshold",
  "value": 0.5,
  "type": "number",
  "label": "Confidence Threshold",
  "description": "Minimum confidence score for object detection (0.0 - 1.0)",
  "category": "ai",
  "min_value": 0.0,
  "max_value": 1.0
}
```

### PUT /system-settings/{setting_key}

**Update System Setting** - Update a specific system setting value.

**Path Parameters**:
- `setting_key`: string (required)

**Request Body**:
```json
{
  "value": 0.7
}
```

**Response** (200):
```json
{
  "key": "confidence_threshold",
  "value": 0.7,
  "type": "number",
  "label": "Confidence Threshold",
  "description": "Minimum confidence score for object detection (0.0 - 1.0)",
  "category": "ai",
  "min_value": 0.0,
  "max_value": 1.0
}
```

### POST /system-settings/reset

**Reset System Settings** - Reset all system settings to default values.

**Response** (200):
```json
{
  "settings": [
    {
      "key": "ai_model_path",
      "value": "/models/yolov8n.pt",
      "type": "string",
      "label": "AI Model Path",
      "description": "Path to the YOLO model file",
      "category": "ai"
    }
  ],
  "total": 1
}
```

### GET /system-settings/health/status

**Get System Health** - Retrieve system health and status information.

**Response** (200):
```json
{
  "status": {
    "websocket_connected": true,
    "database_connected": true,
    "ai_model_loaded": true,
    "file_system_ready": true,
    "last_updated": "2025-08-31T04:00:00.000000"
  },
  "version": "1.0.0",
  "uptime": "2h 30m 45s"
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Validation Error - Invalid data format |
| 500 | Internal Server Error |

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

For technical support or questions about the API, contact the development team at support@safetyai.com.
