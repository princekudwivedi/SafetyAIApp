# Construction Site Safety AI - Backend

A comprehensive AI-powered construction site safety monitoring system built with FastAPI, OpenCV, and YOLO object detection.

## Features

- **Real-time Video Processing**: Live video stream analysis with computer vision
- **AI-Powered Object Detection**: YOLO-based detection of safety equipment, workers, and hazards
- **Safety Rule Engine**: Automated violation detection and alert generation
- **Real-time Alerts**: WebSocket-based instant notifications
- **Comprehensive API**: RESTful endpoints for all system operations
- **Role-based Access Control**: Multi-level user permissions
- **MongoDB Integration**: Scalable data storage with proper indexing

## Technology Stack

- **Framework**: FastAPI
- **Computer Vision**: OpenCV + Ultralytics YOLO
- **Database**: MongoDB with Motor (async driver)
- **Authentication**: JWT with bcrypt password hashing
- **Real-time**: WebSocket support
- **API Documentation**: Auto-generated OpenAPI/Swagger docs

## Installation

### Prerequisites

- Python 3.8+
- MongoDB 4.4+
- OpenCV dependencies

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SafetyAIApp/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment configuration**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

5. **Start MongoDB**
   ```bash
   # Ensure MongoDB is running on localhost:27017
   # Or update MONGODB_URL in .env
   ```

6. **Run the application**
   ```bash
   python main.py
   ```

The API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/token` - Get access token
- `GET /api/v1/auth/me` - Get current user info

### Users
- `GET /api/v1/users/` - List users (Admin/Supervisor only)
- `POST /api/v1/users/` - Create user (Admin/Supervisor only)
- `PUT /api/v1/users/{user_id}` - Update user
- `DELETE /api/v1/users/{user_id}` - Delete user (Admin only)

### Sites
- `GET /api/v1/sites/` - List construction sites
- `POST /api/v1/sites/` - Create site (Admin/Supervisor only)
- `PUT /api/v1/sites/{site_id}` - Update site
- `DELETE /api/v1/sites/{site_id}` - Delete site (Admin only)

### Cameras
- `GET /api/v1/cameras/` - List cameras
- `POST /api/v1/cameras/` - Create camera (Admin/Supervisor only)
- `PUT /api/v1/cameras/{camera_id}` - Update camera
- `DELETE /api/v1/cameras/{camera_id}` - Delete camera (Admin only)

### Video Processing
- `GET /api/v1/video/stream/{camera_id}` - Get video stream
- `POST /api/v1/video/start/{camera_id}` - Start video processing
- `POST /api/v1/video/stop/{camera_id}` - Stop video processing
- `POST /api/v1/video/process-file` - Process video file

### Alerts
- `GET /api/v1/alerts/` - List safety alerts
- `GET /api/v1/alerts/{alert_id}` - Get specific alert
- `PUT /api/v1/alerts/{alert_id}` - Update alert
- `POST /api/v1/alerts/{alert_id}/resolve` - Resolve alert
- `POST /api/v1/alerts/{alert_id}/assign` - Assign alert

### Statistics
- `GET /api/v1/stats/dashboard` - Dashboard overview
- `GET /api/v1/stats/alerts/summary` - Alert statistics
- `GET /api/v1/stats/cameras/performance` - Camera performance
- `GET /api/v1/stats/sites/overview` - Sites overview

## WebSocket Endpoints

- `/api/v1/video/ws/alerts` - Real-time alert notifications
- `/api/v1/video/ws/video` - Video stream updates
- `/api/v1/video/ws/dashboard` - Dashboard updates

## Data Models

### Users
- **Administrator**: Full system access
- **Supervisor**: Site and camera management
- **Safety Officer**: Alert management and monitoring
- **Operator**: View-only access to assigned areas

### Safety Objects
- Workers, Visitors
- PPE: Hard hats, safety vests, goggles, gloves
- Machinery: Forklifts, cranes, excavators
- Hazards: Spills, blocked exits, fire hazards

### Alerts
- Violation types with severity levels
- Real-time detection and notification
- Assignment and resolution tracking
- Snapshot capture for evidence

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URL` | MongoDB connection string | `mongodb://localhost:27017` |
| `DATABASE_NAME` | Database name | `safety_ai_db` |
| `SECRET_KEY` | JWT secret key | `your-secret-key-change-in-production` |
| `YOLO_MODEL_PATH` | Path to YOLO model | `yolov8n.pt` |
| `CONFIDENCE_THRESHOLD` | Object detection confidence | `0.5` |
| `FRAME_RATE` | Video processing frame rate | `30` |

### AI Model Configuration

The system uses YOLO (You Only Look Once) for object detection:

- **Default Model**: YOLOv8n (nano) for fast processing
- **Custom Training**: Can be fine-tuned on construction-specific datasets
- **Object Classes**: 20+ safety-related object types
- **Performance**: Real-time processing at 30 FPS

## Development

### Project Structure

```
backend/
├── app/
│   ├── api/v1/endpoints/     # API endpoints
│   ├── core/                 # Core configuration
│   ├── models/               # Data models
│   └── services/             # Business logic
├── logs/                     # Application logs
├── uploads/                  # File uploads
├── alerts/                   # Alert snapshots
├── main.py                   # Application entry point
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

### Adding New Features

1. **Models**: Define data structures in `app/models/`
2. **Services**: Implement business logic in `app/services/`
3. **Endpoints**: Create API routes in `app/api/v1/endpoints/`
4. **Tests**: Add unit and integration tests

### Database Migrations

The system automatically creates collections and indexes on startup. For schema changes:

1. Update the model definitions
2. Add migration scripts if needed
3. Test with existing data

## Testing

### Manual Testing

1. **Start the application**
2. **Access Swagger UI** at `/docs`
3. **Test endpoints** with sample data
4. **Verify WebSocket connections**

### Sample Data

Create test users and sites through the API:

```bash
# Register a test user
curl -X POST "http://localhost:8000/api/v1/auth/register" \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "testpass123"}'

# Login to get token
curl -X POST "http://localhost:8000/api/v1/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "testpass123"}'
```

## Deployment

### Production Considerations

1. **Security**: Change default secrets and enable HTTPS
2. **Database**: Use MongoDB Atlas or managed MongoDB service
3. **Scaling**: Deploy with multiple workers behind a load balancer
4. **Monitoring**: Add logging, metrics, and health checks
5. **Backup**: Implement database backup and recovery procedures

### Docker Deployment

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection**: Ensure MongoDB is running and accessible
2. **YOLO Model**: Download model file or use default YOLOv8n
3. **OpenCV**: Install system dependencies for video processing
4. **Permissions**: Check file permissions for logs and uploads

### Logs

Application logs are stored in `logs/app.log` with configurable levels:
- `DEBUG`: Detailed debugging information
- `INFO`: General application flow
- `WARNING`: Potential issues
- `ERROR`: Error conditions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API specification at `/docs`
