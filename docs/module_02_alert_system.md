# Module 2: Real-time Alert System

## Overview
The Real-time Alert System is the core component of the SafetyAI application, providing comprehensive alert management with real-time notifications, severity classification, and status tracking for safety violations across multiple sites and cameras.

## Key Features

### Alert Management
- **Real-time Generation**: Instant alert creation from camera feeds and manual inputs
- **Severity Classification**: 6-level severity system (Critical, High, Medium, Low, Warning, Info)
- **Status Tracking**: 4-stage workflow (New, In Progress, Resolved, Dismissed)
- **Bulk Operations**: Mass status updates and alert management
- **Search and Filtering**: Advanced filtering by severity, status, site, camera, and date range

### Real-time Notifications
- **WebSocket Integration**: Live alert notifications without page refresh
- **Notification Bell**: Unread count indicator with dropdown preview
- **Toast Notifications**: Immediate user feedback for new alerts
- **Auto-mark as Read**: Notifications marked as read when alerts are viewed
- **Notification History**: Complete audit trail of all notifications

### Alert Analytics
- **Trend Analysis**: Historical alert patterns and statistics
- **Site Comparison**: Alert distribution across different sites
- **Severity Breakdown**: Visual representation of alert severity distribution
- **Time-based Analytics**: Alert frequency and timing analysis

## Backend Implementation

### Core Files
- `backend/app/api/v1/endpoints/alerts.py` - Alert API endpoints
- `backend/app/models/safety.py` - Alert data models
- `backend/app/services/alert_service.py` - Alert business logic
- `backend/app/services/websocket_service.py` - Real-time communication

### Data Models
```python
class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    WARNING = "warning"
    INFO = "info"

class AlertStatus(str, Enum):
    NEW = "new"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISMISSED = "dismissed"

class Alert(BaseDBModel):
    alert_id: str = Field(..., description="Unique alert identifier")
    violation_type: str = Field(..., description="Type of safety violation")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    status: AlertStatus = Field(default=AlertStatus.NEW)
    camera_id: str = Field(..., description="Source camera identifier")
    site_id: str = Field(..., description="Site where violation occurred")
    description: str = Field(..., description="Detailed alert description")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
```

### API Endpoints
```python
GET    /api/v1/alerts/              # List alerts with filtering
POST   /api/v1/alerts/              # Create new alert
GET    /api/v1/alerts/{alert_id}    # Get specific alert
PUT    /api/v1/alerts/{alert_id}    # Update alert
DELETE /api/v1/alerts/{alert_id}    # Delete alert
GET    /api/v1/alerts/summary       # Alert statistics
POST   /api/v1/alerts/bulk-update   # Bulk status updates
```

### Alert Creation Process
1. **Trigger Detection**: Camera AI or manual input detects violation
2. **Alert Generation**: System creates alert with metadata
3. **Severity Assignment**: Automatic or manual severity classification
4. **Notification Broadcast**: WebSocket notification to connected clients
5. **Database Storage**: Alert persisted with full audit trail
6. **Status Tracking**: Workflow management through resolution

## Frontend Implementation

### Core Files
- `frontend/components/alerts/alerts-page.tsx` - Main alerts interface
- `frontend/components/alerts/alert-details-modal.tsx` - Alert detail view
- `frontend/hooks/use-alerts.ts` - Alert management hooks
- `frontend/hooks/use-notifications.ts` - Notification system
- `frontend/contexts/websocket-context.tsx` - Real-time communication

### Alert Management Hook
```typescript
interface UseAlertsReturn {
  // Data
  paginatedAlerts: Alert[];
  summary: AlertSummary;
  isLoading: boolean;
  error: string | null;
  
  // Filters and pagination
  filters: AlertFilters;
  setFilters: (filters: AlertFilters) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  
  // Actions
  refreshAlerts: () => Promise<void>;
  createAlert: (alert: AlertCreate) => Promise<void>;
  updateAlert: (id: string, updates: AlertUpdate) => Promise<void>;
  deleteAlert: (id: string) => Promise<void>;
  bulkUpdateStatus: (ids: string[], status: AlertStatus) => Promise<void>;
  
  // Filter options
  uniqueStatuses: string[];
  uniqueSeverities: string[];
  uniqueCameras: string[];
}
```

### Real-time Notification System
```typescript
interface Notification {
  id: string;
  type: 'new_alert' | 'status_update' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  alertId?: string;
  severity?: AlertSeverity;
}

const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
```

### Alert Status Workflow
1. **New Alert**: Automatically created with "new" status
2. **In Progress**: Assigned to safety officer for investigation
3. **Resolved**: Issue addressed and documented
4. **Dismissed**: False positive or non-actionable alert

## User Interface Components

### Alert List View
- **Data Table**: Sortable columns with status indicators
- **Filter Panel**: Collapsible filters for easy access
- **Search Bar**: Real-time search across alert content
- **Bulk Actions**: Select multiple alerts for batch operations
- **Pagination**: Efficient handling of large alert datasets

### Alert Details Modal
- **Full Information**: Complete alert details and metadata
- **Status Management**: Quick status updates with comments
- **Camera Context**: Related camera and site information
- **Timeline**: Alert history and status changes
- **Actions**: Edit, resolve, or dismiss alert options

### Notification System
- **Bell Icon**: Unread count badge with visual indicator
- **Dropdown Preview**: Recent notifications with quick actions
- **Toast Messages**: Immediate feedback for new alerts
- **Auto-refresh**: Real-time updates without page reload

## Real-time Features

### WebSocket Integration
```typescript
// Subscribe to alert events
const { subscribe, isConnected } = useWebSocket();

useEffect(() => {
  const unsubscribe = subscribe('new_alert', (data) => {
    addNotification({
      id: `alert-${data.payload.alert_id}`,
      type: 'new_alert',
      title: 'New Safety Alert',
      message: data.payload.description,
      severity: data.payload.severity,
      alertId: data.payload.alert_id
    });
  });
  
  return unsubscribe;
}, []);
```

### Live Updates
- **Alert Creation**: Instant notification of new alerts
- **Status Changes**: Real-time status update propagation
- **Count Updates**: Live unread count in notification bell
- **Filter Sync**: Automatic refresh when filters change

## Analytics and Reporting

### Alert Statistics
```typescript
interface AlertSummary {
  total: number;
  byStatus: Record<AlertStatus, number>;
  bySeverity: Record<AlertSeverity, number>;
  bySite: Record<string, number>;
  trends: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  averageResolutionTime: number;
  topViolationTypes: Array<{
    type: string;
    count: number;
  }>;
}
```

### Dashboard Integration
- **Metric Cards**: Key alert statistics on dashboard
- **Charts**: Visual representation of alert trends
- **Site Comparison**: Alert distribution across sites
- **Performance Metrics**: Resolution time and efficiency tracking

## Performance Optimization

### Data Loading
- **Pagination**: Efficient loading of large alert datasets
- **Lazy Loading**: On-demand loading of alert details
- **Caching**: Intelligent caching of frequently accessed data
- **Debounced Search**: Optimized search with debouncing

### Real-time Efficiency
- **Selective Updates**: Only update changed data
- **Connection Management**: Efficient WebSocket connection handling
- **Memory Management**: Proper cleanup of event listeners
- **Error Recovery**: Automatic reconnection on connection loss

## Security and Permissions

### Access Control
- **Role-based Access**: Different alert management permissions by role
- **Site-based Filtering**: Users only see alerts from their assigned sites
- **Audit Trail**: Complete history of alert modifications
- **Data Validation**: Input validation and sanitization

### Data Protection
- **Sensitive Information**: Proper handling of personal data in alerts
- **Retention Policies**: Configurable alert data retention
- **Export Controls**: Secure export of alert data
- **Privacy Compliance**: GDPR and privacy regulation compliance

## Configuration

### Alert Settings
```typescript
interface AlertConfig {
  defaultSeverity: AlertSeverity;
  autoResolution: boolean;
  notificationEnabled: boolean;
  retentionDays: number;
  escalationRules: EscalationRule[];
  severityThresholds: Record<string, number>;
}
```

### Notification Preferences
- **Email Notifications**: Configurable email alerts
- **SMS Alerts**: Critical alert SMS notifications
- **Push Notifications**: Browser push notification support
- **Quiet Hours**: Configurable notification quiet periods

## Testing

### Unit Tests
- Alert creation and validation
- Status transition logic
- Notification generation
- Filter and search functionality

### Integration Tests
- End-to-end alert workflow
- Real-time notification delivery
- WebSocket communication
- Bulk operations

### Performance Tests
- Large dataset handling
- Real-time update performance
- Memory usage optimization
- Connection stability

## Dependencies

### Backend Dependencies
```
fastapi>=0.104.0
motor>=3.3.0
pydantic>=2.5.0
websockets>=12.0
python-dateutil>=2.8.0
```

### Frontend Dependencies
```
react>=18.0.0
next>=14.0.0
axios>=1.6.0
react-hot-toast>=2.4.0
lucide-react>=0.300.0
recharts>=2.8.0
```

## Monitoring and Analytics

### Key Metrics
- **Alert Volume**: Total alerts per time period
- **Resolution Time**: Average time to resolve alerts
- **False Positive Rate**: Percentage of dismissed alerts
- **System Uptime**: Alert system availability
- **User Engagement**: Alert interaction rates

### Performance Monitoring
- **Response Times**: API endpoint performance
- **WebSocket Latency**: Real-time update delays
- **Database Performance**: Query optimization metrics
- **Memory Usage**: System resource utilization

This alert system provides a comprehensive, real-time safety monitoring solution with advanced features for alert management, notification delivery, and analytics reporting.
