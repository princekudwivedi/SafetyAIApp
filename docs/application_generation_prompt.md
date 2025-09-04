# SafetyAI Application Generation Prompt

Please generate a complete SafetyAI application based on the following module-wise documentation.

## Module 1: Authentication System
### Description
A comprehensive authentication system with JWT tokens, role-based access control, and session management for a safety monitoring application.
### Key Features
* JWT-based authentication with access and refresh tokens
* Role-based access control (Administrator, Supervisor, Safety Officer, Operator)
* Remember me functionality with extended session duration
* Automatic token refresh and session management
* Centralized error handling with toast notifications
* Password hashing with bcrypt
* User profile management with last login tracking
### Dependencies
* FastAPI (Python backend)
* Next.js (React frontend)
* JWT tokens (jose library)
* bcrypt for password hashing
* react-hot-toast for notifications
* Axios for API communication
### Example Usage
```python
# Backend - Login endpoint
@router.post("/login")
async def login(user_data: UserLogin):
    user = await authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    
    # Update last login timestamp
    await database.users.update_one(
        {"_id": ObjectId(user.id)},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer"}
```

```typescript
// Frontend - Auth context
const { user, login, logout } = useAuth();
await login({ username: 'admin', password: 'admin123' });
```

---

## Module 2: Real-time Alert System
### Description
A comprehensive alert management system with real-time notifications, severity levels, and status tracking for safety violations.
### Key Features
* Real-time alert generation and notifications
* Severity levels (High, Medium, Low, Critical, Warning, Info)
* Alert status tracking (New, In Progress, Resolved, Dismissed)
* WebSocket integration for live updates
* Alert filtering and search functionality
* Pagination and bulk operations
* Alert details modal with full information
* Notification bell with unread count
### Dependencies
* WebSocket connections
* MongoDB for alert storage
* React hooks for state management
* Lucide React for icons
* React Hot Toast for notifications
### Example Usage
```python
# Backend - Alert creation
@router.post("/alerts")
async def create_alert(alert_data: AlertCreate):
    alert = Alert(
        violation_type=alert_data.violation_type,
        severity=alert_data.severity,
        camera_id=alert_data.camera_id,
        site_id=alert_data.site_id,
        description=alert_data.description,
        timestamp=datetime.utcnow()
    )
    await database.alerts.insert_one(alert.dict())
    return alert
```

```typescript
// Frontend - Alert management
const { alerts, createAlert, updateAlertStatus } = useAlerts();
const { notifications, markAsRead } = useNotifications();
```

---

## Module 3: Camera Management System
### Description
A comprehensive camera management system for monitoring multiple sites with real-time status tracking and configuration management.
### Key Features
* Camera registration and configuration
* Real-time status monitoring (Active, Inactive, Maintenance)
* Site-based camera organization
* Camera streaming and recording capabilities
* Alert generation from camera feeds
* Camera form with validation
* Status indicators and uptime tracking
* Bulk operations and filtering
### Dependencies
* MongoDB for camera data storage
* WebSocket for real-time status updates
* React Hook Form for form management
* Zod for validation
* Lucide React for status icons
### Example Usage
```python
# Backend - Camera management
@router.get("/cameras")
async def get_cameras(site_id: Optional[str] = None):
    filter_query = {}
    if site_id:
        filter_query["site_id"] = site_id
    
    cameras = await database.cameras.find(filter_query).to_list(100)
    return [Camera(**cam) for cam in cameras]
```

```typescript
// Frontend - Camera management
const { cameras, createCamera, updateCamera } = useCameras();
const { sites } = useSites();
```

---

## Module 4: Site Management System
### Description
A site management system for organizing cameras and users across different locations with hierarchical structure.
### Key Features
* Site creation and management
* Site-based user and camera organization
* Site information and configuration
* Site status tracking
* Site form with validation
* Site filtering and search
* Integration with user and camera systems
### Dependencies
* MongoDB for site data storage
* React Hook Form for forms
* Zod for validation
* Lucide React for icons
### Example Usage
```python
# Backend - Site management
@router.post("/sites")
async def create_site(site_data: SiteCreate):
    site = Site(
        site_name=site_data.site_name,
        location=site_data.location,
        description=site_data.description,
        is_active=True,
        created_at=datetime.utcnow()
    )
    await database.sites.insert_one(site.dict())
    return site
```

```typescript
// Frontend - Site management
const { sites, createSite, updateSite } = useSites();
```

---

## Module 5: User Management System
### Description
A comprehensive user management system with role-based permissions, site assignments, and user lifecycle management.
### Key Features
* User creation, editing, and deletion
* Role-based access control
* Site assignment for users
* User status management (Active/Inactive)
* User profile management
* Last login tracking
* User filtering and search
* Dynamic site dropdown integration
* Automatic refresh for real-time updates
### Dependencies
* MongoDB for user data storage
* React Hook Form for user forms
* Zod for validation
* Role-based permissions system
* Site management integration
### Example Usage
```python
# Backend - User management
@router.get("/users")
async def get_users(role: Optional[UserRole] = None, is_active: Optional[bool] = None):
    filter_query = {}
    if role:
        filter_query["role"] = role
    if is_active is not None:
        filter_query["is_active"] = is_active
    
    users = await database.users.find(filter_query).to_list(100)
    return [User(**user) for user in users]
```

```typescript
// Frontend - User management
const { users, createUser, updateUser, deleteUser } = useUsers();
const { sites } = useSites(); // For site assignment dropdown
```

---

## Module 6: Dashboard and Analytics
### Description
A comprehensive dashboard system with real-time metrics, charts, and system status monitoring for safety management.
### Key Features
* Real-time dashboard metrics
* Safety violation charts and trends
* System status monitoring
* Alert summaries and statistics
* Metric cards with trend indicators
* Safety chart with violation types
* System health indicators
* Responsive grid layout
### Dependencies
* Chart.js or similar for data visualization
* WebSocket for real-time updates
* React hooks for data fetching
* Tailwind CSS for styling
* Lucide React for icons
### Example Usage
```python
# Backend - Dashboard data
@router.get("/dashboard/stats")
async def get_dashboard_stats():
    total_alerts = await database.alerts.count_documents({})
    active_cameras = await database.cameras.count_documents({"status": "Active"})
    total_users = await database.users.count_documents({"is_active": True})
    
    return {
        "total_alerts": total_alerts,
        "active_cameras": active_cameras,
        "total_users": total_users,
        "system_health": "Healthy"
    }
```

```typescript
// Frontend - Dashboard
const { dashboardData, isLoading } = useDashboard();
const { alertsSummary } = useAlerts();
```

---

## Module 7: Live Monitoring System
### Description
A real-time monitoring system for camera feeds with video upload capabilities and live stream management.
### Key Features
* Live camera feed monitoring
* Video upload and management
* Real-time status updates
* Stream quality indicators
* Recording capabilities
* Video playback controls
* Upload progress tracking
* File validation and processing
### Dependencies
* WebSocket for real-time updates
* Video.js or similar for video playback
* File upload handling
* Progress tracking components
* React hooks for state management
### Example Usage
```python
# Backend - Video upload
@router.post("/video/upload")
async def upload_video(file: UploadFile):
    # Process video file
    video_data = await process_video_file(file)
    await database.videos.insert_one(video_data)
    return {"message": "Video uploaded successfully"}
```

```typescript
// Frontend - Live monitoring
const { isConnected } = useWebSocket();
const { uploadVideo, uploadProgress } = useVideoUpload();
```

---

## Module 8: Reporting System
### Description
A comprehensive reporting system for generating safety reports, analytics, and compliance documentation.
### Key Features
* Report generation and export
* Safety compliance reporting
* Alert trend analysis
* Custom date range filtering
* PDF and Excel export capabilities
* Report scheduling
* Historical data analysis
* Compliance metrics
### Dependencies
* Report generation libraries
* PDF generation (jsPDF or similar)
* Excel export capabilities
* Date range pickers
* Chart generation for reports
### Example Usage
```python
# Backend - Report generation
@router.get("/reports/safety")
async def generate_safety_report(start_date: datetime, end_date: datetime):
    alerts = await database.alerts.find({
        "timestamp": {"$gte": start_date, "$lte": end_date}
    }).to_list(1000)
    
    return {
        "total_alerts": len(alerts),
        "by_severity": group_by_severity(alerts),
        "by_site": group_by_site(alerts),
        "trends": calculate_trends(alerts)
    }
```

```typescript
// Frontend - Reports
const { generateReport, exportToPDF } = useReports();
```

---

## Module 9: System Settings and Configuration
### Description
A system configuration module for managing application settings, user preferences, and system parameters.
### Key Features
* System-wide configuration management
* User preference settings
* Security settings
* Performance configuration
* Debug mode settings
* Auto-refresh configuration
* Theme and appearance settings
* Data privacy controls
### Dependencies
* MongoDB for settings storage
* React Hook Form for settings forms
* Local storage for user preferences
* Theme context for appearance
### Example Usage
```python
# Backend - Settings management
@router.get("/settings")
async def get_system_settings():
    settings = await database.settings.find_one({"type": "system"})
    return settings or default_settings
```

```typescript
// Frontend - Settings
const { settings, updateSettings } = useSystemSettings();
```

---

## Module 10: WebSocket and Real-time Communication
### Description
A real-time communication system using WebSockets for live updates, notifications, and system monitoring.
### Key Features
* WebSocket connection management
* Real-time alert notifications
* Live status updates
* Connection health monitoring
* Automatic reconnection
* Event subscription system
* Message broadcasting
* Connection state management
### Dependencies
* WebSocket client libraries
* React context for state management
* Event handling system
* Connection monitoring
### Example Usage
```python
# Backend - WebSocket handling
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(data)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

```typescript
// Frontend - WebSocket context
const { subscribe, isConnected } = useWebSocket();
subscribe('new_alert', (data) => {
    addNotification(data);
});
```

---

## Module 11: Error Handling and Logging
### Description
A centralized error handling and logging system for robust application monitoring and debugging.
### Key Features
* Centralized error handling
* API error interception
* User-friendly error messages
* Error logging and monitoring
* Toast notification system
* Error boundary components
* Debug mode logging
* Error recovery mechanisms
### Dependencies
* React Error Boundaries
* Toast notification library
* Logging service
* Error monitoring tools
### Example Usage
```typescript
// Frontend - Error handling
const errorHandler = createErrorHandler({
    onUnauthorized: () => logout(false),
    onServerError: (error) => toast.error('Server error occurred'),
    onNetworkError: (error) => toast.error('Network connection failed')
});
```

---

## Module 12: UI Components and Design System
### Description
A comprehensive UI component library with consistent design patterns and reusable components.
### Key Features
* Reusable UI components
* Consistent design system
* Responsive layouts
* Dark/light theme support
* Accessibility features
* Form components with validation
* Data tables with pagination
* Modal and dialog components
* Loading states and animations
### Dependencies
* Tailwind CSS for styling
* React Hook Form for forms
* Lucide React for icons
* Framer Motion for animations
* Radix UI for accessible components
### Example Usage
```typescript
// UI Components
<Button variant="primary" size="lg" onClick={handleClick}>
    Save Changes
</Button>

<Card>
    <CardHeader>
        <CardTitle>User Management</CardTitle>
    </CardHeader>
    <CardContent>
        <UserTable users={users} onEdit={handleEdit} />
    </CardContent>
</Card>
```

---

## Technical Requirements

### Backend (Python/FastAPI)
- FastAPI framework with async/await support
- MongoDB with Motor async driver
- JWT authentication with jose library
- bcrypt for password hashing
- WebSocket support for real-time features
- Pydantic for data validation
- CORS configuration for frontend integration

### Frontend (React/Next.js)
- Next.js 14+ with App Router
- React 18+ with hooks and context
- TypeScript for type safety
- Tailwind CSS for styling
- React Hook Form with Zod validation
- Axios for API communication
- React Hot Toast for notifications
- WebSocket client for real-time updates

### Database
- MongoDB for primary data storage
- Document-based schema design
- Indexing for performance optimization
- Data validation with Pydantic models

### Deployment
- Railway or similar cloud platform
- Environment variable configuration
- Docker containerization (optional)
- CI/CD pipeline setup
- Database seeding and migration scripts

### Security
- JWT token-based authentication
- Role-based access control
- Password hashing with bcrypt
- CORS configuration
- Input validation and sanitization
- Error handling without information leakage

This application should be a complete, production-ready safety monitoring system with real-time capabilities, comprehensive user management, and robust error handling.
