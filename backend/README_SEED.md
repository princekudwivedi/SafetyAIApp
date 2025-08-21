# Safety AI Application - Database Seeding Guide

This guide explains how to seed the MongoDB database with dummy data and run the application with dynamic data.

## Prerequisites

1. **MongoDB**: Make sure MongoDB is running on your system
2. **Python Dependencies**: Install required packages from `requirements.txt`
3. **Backend Setup**: Ensure the backend is properly configured

## Database Seeding

### 1. Run the Seed Script

The seed script will populate your MongoDB database with realistic dummy data:

```bash
cd backend
python seed_data.py
```

### 2. What Gets Created

The seed script creates the following data:

- **3 Sites**: Downtown Construction, Highway Bridge, Shopping Mall
- **5 Cameras**: Distributed across the sites with realistic configurations
- **4 Users**: Admin, Supervisor, Safety Officer, Operator (with hashed passwords)
- **5 Zones**: Different zone types (DANGER, WORK, STORAGE, ENTRANCE)
- **7 Safety Rules**: Comprehensive safety rule definitions
- **150 Alerts**: Generated over the past 30 days with realistic patterns
- **8 Weeks of Statistics**: Weekly safety trends and violation data

### 3. Database Collections

After seeding, you'll have these collections:

- `sites` - Construction site information
- `cameras` - Camera configurations and status
- `users` - User accounts and permissions (with password hashes)
- `zones` - Safety zones and access control
- `safety_rules` - Safety rule definitions and parameters
- `alerts` - Safety violation alerts
- `statistics` - Weekly and daily statistics

## User Authentication

### Login Credentials

The seed script creates users with the following credentials:

| Username | Password | Role | Access |
|----------|----------|------|---------|
| `admin` | `admin123` | Administrator | All sites |
| `supervisor` | `supervisor123` | Supervisor | SITE_001 |
| `safety` | `safety123` | Safety Officer | SITE_001 |
| `operator` | `operator123` | Operator | SITE_002 |

**Note**: Passwords are hashed using SHA-256 for security.

## Running the Application

### 1. Start MongoDB

```bash
# Start MongoDB service
mongod
```

### 2. Start the Backend

```bash
cd backend
python main.py
```

The backend will run on `http://localhost:8000`

### 3. Start the Frontend

```bash
cd frontend
npm run dev
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Dashboard Statistics
- `GET /api/v1/stats/dashboard` - Real-time dashboard data
- `GET /api/v1/stats/alerts/summary` - Alert summaries
- `GET /api/v1/stats/cameras/performance` - Camera performance data
- `GET /api/v1/stats/sites/overview` - Site overview data

### Alerts
- `GET /api/v1/alerts/` - Get all alerts with filtering
- `GET /api/v1/alerts/{alert_id}` - Get specific alert
- `POST /api/v1/alerts/` - Create new alert
- `PUT /api/v1/alerts/{alert_id}` - Update alert
- `DELETE /api/v1/alerts/{alert_id}` - Delete alert

### Real-time Data

All APIs now fetch data directly from MongoDB, providing:
- **Dynamic Content**: Real data instead of static mock data
- **Real-time Updates**: Data changes are reflected immediately
- **Realistic Patterns**: Generated data follows realistic safety violation patterns
- **Performance Metrics**: Actual camera and site performance data

## Data Structure

### User Data
```json
{
  "username": "admin",
  "email": "admin@safetyai.com",
  "full_name": "System Administrator",
  "role": "Administrator",
  "password_hash": "sha256_hash_of_password",
  "is_active": true,
  "permissions": ["read", "write", "delete", "admin"],
  "site_id": null
}
```

### Camera Data
```json
{
  "camera_id": "CAM_001",
  "site_id": "SITE_001",
  "camera_name": "Main Entrance Camera",
  "stream_url": "rtsp://192.168.1.101:554/stream1",
  "status": "Active",
  "installation_date": "2024-10-20T10:00:00Z",
  "settings": {
    "resolution": "1920x1080",
    "fps": 30,
    "bitrate": "4000k",
    "night_vision": true,
    "motion_detection": true
  },
  "location_description": "Main entrance monitoring construction site access"
}
```

### Zone Data
```json
{
  "zone_id": "ZONE_001",
  "zone_name": "Foundation Work Area",
  "zone_type": "DANGER",
  "site_id": "SITE_001",
  "description": "High-risk foundation excavation and construction zone",
  "status": "ACTIVE",
  "coordinates": [[100, 100], [300, 100], [300, 300], [100, 300]],
  "center_point": [200, 200],
  "max_occupancy": 15,
  "restricted_roles": ["Operator"],
  "safety_rules": ["RULE_001", "RULE_002"]
}
```

### Safety Rule Data
```json
{
  "rule_id": "RULE_001",
  "rule_name": "Hard Hat Requirement",
  "violation_type": "No Hard Hat",
  "description": "All personnel must wear approved hard hats in construction zones",
  "is_active": true,
  "parameters": {
    "detection_confidence": 0.8,
    "min_face_visibility": 0.6
  },
  "severity_level": "High",
  "applicable_zones": ["ZONE_001", "ZONE_002", "ZONE_004"]
}
```

### Alert Data
```json
{
  "alert_id": "AL-202501201430-1234",
  "timestamp": "2025-01-20T14:30:00Z",
  "violation_type": "No Hard Hat",
  "severity_level": "High",
  "description": "No Hard Hat detected in Zone A - Foundation work area monitoring",
  "confidence_score": 0.95,
  "location_id": "SITE_001",
  "camera_id": "CAM_002",
  "primary_object": {
    "object_type": "Worker",
    "object_id": "OBJ_5678",
    "bounding_box": [150, 200, 300, 400],
    "confidence": 0.92
  },
  "snapshot_url": "/snapshots/CAM_002/20250120_143000.jpg",
  "status": "New",
  "assigned_to": null,
  "resolution_notes": null
}
```

### Statistics Data
```json
{
  "week_start": "2025-01-13T00:00:00Z",
  "week_end": "2025-01-20T00:00:00Z",
  "total_violations": 45,
  "total_alerts": 52,
  "safety_score": 78.5,
  "daily_violations": [8, 5, 12, 7, 15, 3, 2],
  "daily_alerts": [12, 8, 15, 10, 18, 5, 3]
}
```

## Customization

### Modify Seed Data

Edit `seed_data.py` to customize:
- Number of sites, cameras, and users
- Alert generation patterns
- Violation types and severity distributions
- Time ranges for historical data
- Zone configurations and safety rules
- User roles and permissions

### Add New Data Types

To add new types of data:
1. Define the data structure in the seed file
2. Add the insertion logic in `seed_database()`
3. Create corresponding API endpoints
4. Update frontend components to display the new data

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in `seed_data.py`

2. **Import Errors**
   - Install required packages: `pip install -r requirements.txt`
   - Check Python path and virtual environment

3. **Data Not Appearing**
   - Verify seed script completed successfully
   - Check MongoDB collections exist
   - Ensure API endpoints are working

4. **Authentication Issues**
   - Verify user credentials are correct
   - Check that password hashing is working
   - Ensure user roles and permissions are properly set

### Verification Commands

```bash
# Check MongoDB collections
mongo safety_ai_db --eval "db.getCollectionNames()"

# Count documents in collections
mongo safety_ai_db --eval "db.alerts.countDocuments()"
mongo safety_ai_db --eval "db.cameras.countDocuments()"
mongo safety_ai_db --eval "db.sites.countDocuments()"
mongo safety_ai_db --eval "db.users.countDocuments()"
mongo safety_ai_db --eval "db.zones.countDocuments()"
mongo safety_ai_db --eval "db.safety_rules.countDocuments()"

# View sample data
mongo safety_ai_db --eval "db.alerts.findOne()"
mongo safety_ai_db --eval "db.users.findOne()"
```

## Performance Considerations

- **Indexes**: The seed script creates indexes for optimal query performance
- **Data Volume**: 150 alerts provide realistic data without overwhelming the system
- **Real-time Updates**: APIs are optimized for quick response times
- **Scalability**: Data structure supports future expansion
- **Security**: Passwords are properly hashed for production use

## Next Steps

After seeding the database:

1. **Test APIs**: Use the interactive API docs at `http://localhost:8000/docs`
2. **Verify Frontend**: Check that all dashboard components display real data
3. **Test Authentication**: Verify login functionality with the provided credentials
4. **Monitor Performance**: Watch for any performance issues with larger datasets
5. **Customize Data**: Modify seed data to match your specific use case

## Security Notes

- **Password Hashing**: All passwords are hashed using SHA-256
- **Role-based Access**: Users have specific permissions based on their roles
- **Site Restrictions**: Users can only access data from their assigned sites
- **API Authentication**: All endpoints require valid user authentication

## Support

If you encounter issues:
1. Check the console logs for error messages
2. Verify MongoDB is running and accessible
3. Ensure all dependencies are installed
4. Check the API documentation for endpoint details
5. Verify user credentials and permissions
