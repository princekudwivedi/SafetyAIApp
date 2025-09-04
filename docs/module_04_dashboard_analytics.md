# Module 4: Dashboard and Analytics System

## Overview
The Dashboard and Analytics System provides a comprehensive real-time monitoring interface for the SafetyAI application. It delivers key performance indicators, safety metrics, system status, and visual analytics to help users understand system performance and safety trends at a glance.

## Key Features

### Real-time Dashboard Metrics
- **Live Statistics**: Real-time updates of key safety and system metrics
- **Performance Indicators**: System health, camera status, and alert trends
- **User Activity**: Active users, login statistics, and system usage
- **Safety Metrics**: Alert counts, resolution times, and violation trends

### Visual Analytics
- **Safety Charts**: Interactive charts showing violation types and trends
- **Trend Analysis**: Historical data visualization with time-based filtering
- **Site Comparison**: Comparative analytics across different sites
- **Performance Graphs**: System performance and uptime visualizations

### System Status Monitoring
- **Health Indicators**: Real-time system health status
- **Service Status**: Database, API, and WebSocket connection status
- **Performance Metrics**: Response times, error rates, and throughput
- **Alert Status**: Current alert distribution and resolution status

## Backend Implementation

### Core Files
- `backend/app/api/v1/endpoints/stats.py` - Dashboard statistics endpoints
- `backend/app/api/v1/endpoints/dashboard.py` - Dashboard data aggregation
- `backend/app/models/reports.py` - Analytics data models
- `backend/app/services/analytics_service.py` - Analytics processing

### Data Models
```python
class DashboardStats(BaseModel):
    total_alerts: int
    active_cameras: int
    total_users: int
    system_health: str
    alerts_today: int
    alerts_this_week: int
    alerts_this_month: int
    resolution_rate: float
    average_resolution_time: float
    top_violation_types: List[ViolationTypeStats]
    site_performance: List[SitePerformanceStats]

class AlertsSummary(BaseModel):
    total: int
    by_status: Dict[AlertStatus, int]
    by_severity: Dict[AlertSeverity, int]
    by_site: Dict[str, int]
    trends: AlertTrends
    average_resolution_time: float
    top_violation_types: List[Tuple[str, int]]

class AlertTrends(BaseModel):
    daily: List[int]
    weekly: List[int]
    monthly: List[int]
    hourly: List[int]

class SystemHealth(BaseModel):
    status: str  # "Healthy", "Warning", "Critical"
    database_status: str
    api_status: str
    websocket_status: str
    last_updated: datetime
    uptime_percentage: float
    error_rate: float
```

### API Endpoints
```python
GET /api/v1/dashboard/stats        # Main dashboard statistics
GET /api/v1/dashboard/alerts-summary  # Alert analytics summary
GET /api/v1/dashboard/system-health   # System health status
GET /api/v1/dashboard/trends          # Historical trend data
GET /api/v1/dashboard/site-performance # Site performance metrics
```

### Analytics Processing
```python
@router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    # Parallel data fetching for performance
    stats_tasks = [
        get_alert_statistics(),
        get_camera_statistics(),
        get_user_statistics(),
        get_system_health(),
        get_resolution_metrics()
    ]
    
    results = await asyncio.gather(*stats_tasks)
    
    return DashboardStats(
        total_alerts=results[0]['total'],
        active_cameras=results[1]['active'],
        total_users=results[2]['active_users'],
        system_health=results[3]['status'],
        alerts_today=results[0]['today'],
        alerts_this_week=results[0]['week'],
        alerts_this_month=results[0]['month'],
        resolution_rate=results[4]['rate'],
        average_resolution_time=results[4]['avg_time'],
        top_violation_types=results[0]['top_types'],
        site_performance=results[1]['site_performance']
    )
```

## Frontend Implementation

### Core Files
- `frontend/components/dashboard/dashboard-overview.tsx` - Main dashboard component
- `frontend/components/dashboard/metric-card.tsx` - Metric display cards
- `frontend/components/dashboard/safety-chart.tsx` - Safety analytics charts
- `frontend/components/dashboard/system-status.tsx` - System health display
- `frontend/hooks/use-dashboard.ts` - Dashboard data management

### Dashboard Overview Component
```typescript
interface DashboardData {
  stats: DashboardStats;
  alertsSummary: AlertsSummary;
  systemHealth: SystemHealth;
  trends: AlertTrends;
  isLoading: boolean;
  error: string | null;
}

const DashboardOverview: React.FC = () => {
  const { dashboardData, isLoading, error } = useDashboard();
  const { alertsSummary } = useAlerts();
  
  if (isLoading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} />;
  
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Alerts"
          value={dashboardData.stats.total_alerts}
          change={dashboardData.stats.alerts_today}
          changeType="increase"
          icon={AlertTriangle}
        />
        <MetricCard
          title="Active Cameras"
          value={dashboardData.stats.active_cameras}
          change={dashboardData.stats.camera_uptime}
          changeType="neutral"
          icon={Camera}
        />
        <MetricCard
          title="Active Users"
          value={dashboardData.stats.total_users}
          change={dashboardData.stats.user_activity}
          changeType="increase"
          icon={Users}
        />
        <MetricCard
          title="Resolution Rate"
          value={`${dashboardData.stats.resolution_rate}%`}
          change={dashboardData.stats.resolution_trend}
          changeType="increase"
          icon={CheckCircle}
        />
      </div>
      
      {/* Safety Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Safety Analytics</h2>
        <SafetyChart
          dashboardData={dashboardData}
          alertsSummary={alertsSummary}
          isLoading={isLoading}
        />
      </div>
      
      {/* System Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <SystemStatus />
      </div>
    </div>
  );
};
```

### Metric Card Component
```typescript
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
  description?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  description
}) => {
  const changeColor = {
    increase: 'text-green-600',
    decrease: 'text-red-600',
    neutral: 'text-gray-600'
  }[changeType];
  
  const changeIcon = {
    increase: TrendingUp,
    decrease: TrendingDown,
    neutral: Minus
  }[changeType];
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={`flex items-center text-sm ${changeColor}`}>
              <ChangeIcon className="h-4 w-4 mr-1" />
              {change}
            </div>
          )}
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          <Icon className="h-6 w-6 text-primary-600" />
        </div>
      </div>
      {description && (
        <p className="text-xs text-gray-500 mt-2">{description}</p>
      )}
    </div>
  );
};
```

### Safety Chart Component
```typescript
const SafetyChart: React.FC<SafetyChartProps> = ({
  dashboardData,
  alertsSummary,
  isLoading
}) => {
  const chartData = useMemo(() => {
    if (!alertsSummary) return null;
    
    return {
      labels: Object.keys(alertsSummary.by_severity),
      datasets: [
        {
          label: 'Alerts by Severity',
          data: Object.values(alertsSummary.by_severity),
          backgroundColor: [
            '#ef4444', // Critical - Red
            '#f97316', // High - Orange
            '#eab308', // Medium - Yellow
            '#22c55e', // Low - Green
            '#3b82f6', // Warning - Blue
            '#8b5cf6'  // Info - Purple
          ],
          borderWidth: 0
        }
      ]
    };
  }, [alertsSummary]);
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };
  
  if (isLoading) return <ChartSkeleton />;
  if (!chartData) return <NoDataMessage />;
  
  return (
    <div className="h-80">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};
```

## Real-time Features

### Live Data Updates
```typescript
// Dashboard data refresh
const useDashboard = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [stats, alertsSummary, systemHealth] = await Promise.all([
        dashboardApi.getDashboardStats(),
        dashboardApi.getAlertsSummary(),
        dashboardApi.getSystemHealth()
      ]);
      
      setDashboardData({
        stats,
        alertsSummary,
        systemHealth,
        trends: alertsSummary.trends,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setDashboardData(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);
  
  // Auto-refresh every 30 seconds
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [loadDashboardData]);
  
  return { dashboardData, isLoading: dashboardData?.isLoading, error: dashboardData?.error };
};
```

### WebSocket Integration
```typescript
// Real-time dashboard updates
useEffect(() => {
  const unsubscribe = subscribe('dashboard_update', (data) => {
    setDashboardData(prev => ({
      ...prev,
      stats: { ...prev.stats, ...data.stats },
      systemHealth: { ...prev.systemHealth, ...data.systemHealth }
    }));
  });
  
  return unsubscribe;
}, [subscribe]);
```

## Analytics and Reporting

### Trend Analysis
- **Daily Trends**: 24-hour alert and activity patterns
- **Weekly Trends**: 7-day performance and safety metrics
- **Monthly Trends**: 30-day historical analysis
- **Yearly Trends**: Annual performance and growth metrics

### Performance Metrics
- **Resolution Time**: Average time to resolve alerts
- **System Uptime**: Overall system availability
- **User Activity**: Login patterns and system usage
- **Camera Performance**: Camera uptime and stream quality

### Comparative Analytics
- **Site Comparison**: Performance metrics across sites
- **Time Period Comparison**: Historical performance comparison
- **User Role Analytics**: Activity patterns by user role
- **Alert Type Analysis**: Violation type frequency and trends

## Performance Optimization

### Data Loading
- **Parallel Fetching**: Concurrent API calls for faster loading
- **Caching**: Intelligent caching of dashboard data
- **Lazy Loading**: On-demand loading of detailed analytics
- **Debounced Updates**: Optimized real-time update handling

### Rendering Optimization
- **Memoization**: Cached chart data and calculations
- **Virtual Scrolling**: Efficient rendering of large datasets
- **Component Splitting**: Modular components for better performance
- **Error Boundaries**: Graceful error handling and recovery

## Configuration

### Dashboard Settings
```typescript
interface DashboardConfig {
  refreshInterval: number;
  chartTypes: string[];
  defaultTimeRange: string;
  metricsToShow: string[];
  autoRefresh: boolean;
  theme: 'light' | 'dark';
  layout: 'grid' | 'list';
}
```

### Analytics Configuration
- **Time Ranges**: Configurable analysis periods
- **Chart Types**: Selectable visualization types
- **Metric Selection**: Customizable metric display
- **Export Options**: Data export and sharing capabilities

## Testing

### Unit Tests
- Dashboard data processing
- Chart data transformation
- Metric calculations
- Component rendering

### Integration Tests
- End-to-end dashboard workflow
- Real-time data updates
- API integration
- Error handling scenarios

### Performance Tests
- Large dataset rendering
- Real-time update performance
- Memory usage optimization
- Chart rendering performance

## Dependencies

### Backend Dependencies
```
fastapi>=0.104.0
motor>=3.3.0
pydantic>=2.5.0
asyncio>=3.4.3
python-dateutil>=2.8.0
```

### Frontend Dependencies
```
react>=18.0.0
next>=14.0.0
chart.js>=4.4.0
react-chartjs-2>=5.2.0
lucide-react>=0.300.0
recharts>=2.8.0
```

## Monitoring and Analytics

### Key Metrics
- **Dashboard Load Time**: Page load and data fetch performance
- **Chart Rendering**: Visualization performance metrics
- **Data Accuracy**: Real-time data synchronization
- **User Engagement**: Dashboard interaction rates
- **System Performance**: Overall dashboard system health

### Performance Monitoring
- **API Response Times**: Dashboard endpoint performance
- **Real-time Latency**: WebSocket update delays
- **Memory Usage**: Frontend memory consumption
- **Error Rates**: Dashboard error frequency and types

This dashboard and analytics system provides a comprehensive, real-time monitoring solution with advanced visualization capabilities, performance optimization, and seamless integration with all SafetyAI system components.
