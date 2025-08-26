# Alerts Database Integration - Safety AI App

## Overview
This document describes the complete refactoring of the `/dashboard/alerts` page to display real-time alert data from the database instead of static placeholder data. The implementation provides dynamic, real-time updates with comprehensive filtering and management capabilities.

## 🎯 **Implementation Summary**

### **What Was Changed:**
- ✅ **Removed static mock data** - Replaced hardcoded alert array with database-driven data
- ✅ **Added real-time database listener** - Integrated with backend alerts collection
- ✅ **Dynamic UI updates** - Page refreshes automatically when new alerts are added
- ✅ **Real-time filtering** - Advanced search and filter capabilities
- ✅ **Live statistics** - Dynamic count updates from database
- ✅ **WebSocket integration** - Real-time updates without page refresh

## 🏗️ **Architecture Components**

### 1. **Frontend API Client** (`frontend/lib/api/alerts.ts`)
Complete API client for all alert operations:

```typescript
export class AlertsApi {
  // Core CRUD operations
  async getAlerts(filters: AlertsFilter): Promise<Alert[]>
  async getAlert(alertId: string): Promise<Alert>
  async createAlert(alert: AlertCreate): Promise<Alert>
  async updateAlert(alertId: string, update: AlertUpdate): Promise<Alert>
  async deleteAlert(alertId: string): Promise<{ message: string }>
  
  // Specialized queries
  async getRecentActiveAlerts(limit: number): Promise<RecentActiveAlerts>
  async getAlertsStatusSummary(): Promise<AlertsSummary>
  async getAlertsSeveritySummary(): Promise<AlertsSummary>
}
```

**Key Features:**
- **Filtering Support**: Status, severity, camera, site, date range
- **Pagination**: Skip/limit parameters for large datasets
- **Real-time Ready**: WebSocket integration preparation
- **Type Safety**: Full TypeScript interfaces

### 2. **Custom Hook** (`frontend/hooks/use-alerts.ts`)
React hook for managing alerts state and real-time updates:

```typescript
export function useAlerts(initialFilters: AlertsFilter = {}): UseAlertsReturn {
  // State management
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  
  // Real-time operations
  const refreshAlerts = useCallback(async () => Promise<void>;
  const updateAlert = useCallback(async (alertId: string, update: any) => Promise<void>;
  const deleteAlert = useCallback(async (alertId: string) => Promise<void>;
  
  // WebSocket integration
  useEffect(() => {
    // Subscribe to new alerts, updates, and deletions
  }, [subscribe, isConnected]);
}
```

**Key Features:**
- **Automatic Filtering**: Real-time filter application
- **WebSocket Integration**: Live updates for new alerts
- **Error Handling**: Graceful error management with retry
- **Performance Optimization**: Request cancellation and caching

### 3. **Refactored Alerts Page** (`frontend/components/alerts/alerts-page.tsx`)
Complete rewrite using real-time database data:

```typescript
export function AlertsPage() {
  // Use custom hook for data management
  const {
    alerts,
    filteredAlerts,
    summary,
    isLoading,
    error,
    filters,
    setFilters,
    refreshAlerts,
    updateAlert,
    deleteAlert,
  } = useAlerts();

  // Real-time search and filtering
  const searchFilteredAlerts = filteredAlerts.filter(alert =>
    alert.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.camera_id.toLowerCase().includes(searchTerm.toLowerCase())
  );
}
```

## 🔄 **Real-Time Data Flow**

### **Data Loading Process:**
1. **Initial Load**: Page loads with `useAlerts()` hook
2. **API Calls**: Parallel requests for alerts and summary data
3. **State Update**: Data stored in React state
4. **UI Rendering**: Components render with real data
5. **Filter Application**: Real-time filtering based on user selections

### **WebSocket Integration:**
```typescript
// Subscribe to real-time updates
useEffect(() => {
  const unsubscribeNewAlert = subscribe('new_alert', (data) => {
    if (data.type === 'new_alert' && data.payload) {
      setAlerts(prev => [data.payload, ...prev]);
      // Refresh summary automatically
      alertsApi.getAlertsStatusSummary().then(setSummary);
    }
  });

  const unsubscribeAlertUpdate = subscribe('alert_update', (data) => {
    if (data.type === 'alert_update' && data.payload) {
      setAlerts(prev => prev.map(alert => 
        alert.alert_id === data.payload.alert_id 
          ? { ...alert, ...data.payload }
          : alert
      ));
    }
  });

  return () => {
    unsubscribeNewAlert();
    unsubscribeAlertUpdate();
  };
}, [subscribe, isConnected]);
```

## 📊 **Database Schema Integration**

### **Alert Document Structure:**
```typescript
interface Alert {
  _id: string;                    // MongoDB ObjectId
  alert_id: string;               // Custom alert identifier
  timestamp: string;              // ISO timestamp string
  violation_type: string;         // Type of safety violation
  severity_level: string;         // HIGH, MEDIUM, LOW
  description: string;            // Detailed description
  confidence_score: number;       // AI confidence (0-1)
  location_id: string;            // Site/location identifier
  camera_id: string;              // Source camera identifier
  primary_object: any;            // Detected object details
  snapshot_url?: string;          // Event snapshot image
  status: string;                 // NEW, ASSIGNED, RESOLVED, DISMISSED
  assigned_to?: string;           // Assigned user
  resolution_notes?: string;      // Resolution details
  updated_at?: string;            // Last update timestamp
}
```

### **Backend API Endpoints:**
- `GET /api/v1/alerts/` - List alerts with filtering
- `GET /api/v1/alerts/{alert_id}` - Get specific alert
- `POST /api/v1/alerts/` - Create new alert
- `PUT /api/v1/alerts/{alert_id}` - Update alert
- `DELETE /api/v1/alerts/{alert_id}` - Delete alert
- `GET /api/v1/alerts/recent/active` - Recent active alerts
- `GET /api/v1/alerts/summary/status` - Status summary
- `GET /api/v1/alerts/summary/severity` - Severity summary

## 🎨 **UI Features**

### **Dynamic Statistics Cards:**
- **New Alerts**: Real-time count from database
- **Assigned Alerts**: Live status tracking
- **Resolved Alerts**: Automatic resolution counting
- **Total Alerts**: Dynamic total calculation

### **Advanced Filtering:**
- **Search**: Text search across violation type, description, camera
- **Status Filter**: NEW, ASSIGNED, RESOLVED, DISMISSED
- **Severity Filter**: HIGH, MEDIUM, LOW
- **Camera Filter**: Dynamic camera list from alerts
- **Real-time Updates**: Filters apply instantly

### **Interactive Alert Management:**
- **Status Changes**: Assign, resolve, dismiss alerts
- **Delete Alerts**: Remove alerts with confirmation
- **View Details**: Expandable alert information
- **Real-time Updates**: Changes reflect immediately

## 🚀 **Performance Optimizations**

### **Request Management:**
- **Abort Controller**: Cancel ongoing requests on filter changes
- **Parallel Loading**: Alerts and summary loaded simultaneously
- **Debounced Updates**: Efficient filter application
- **Memory Management**: Proper cleanup on component unmount

### **State Management:**
- **Optimistic Updates**: Immediate UI feedback
- **Error Boundaries**: Graceful error handling
- **Loading States**: Clear user feedback during operations
- **Cache Strategy**: Minimize redundant API calls

## 🔌 **WebSocket Integration**

### **Real-Time Events:**
- **new_alert**: New alert created (adds to top of list)
- **alert_update**: Alert status/assignment changed
- **alert_delete**: Alert removed from system

### **Automatic Updates:**
- **Live Statistics**: Counts update in real-time
- **List Refresh**: New alerts appear immediately
- **Status Changes**: Updates reflect without refresh
- **Summary Updates**: Dashboard stats stay current

## 🧪 **Testing & Validation**

### **Data Validation:**
- **Type Safety**: Full TypeScript coverage
- **API Response Handling**: Proper error management
- **State Consistency**: Data integrity validation
- **Filter Accuracy**: Correct data filtering

### **User Experience:**
- **Loading States**: Clear feedback during operations
- **Error Handling**: User-friendly error messages
- **Empty States**: Helpful guidance when no data
- **Responsive Design**: Mobile-friendly interface

## 📈 **Monitoring & Debugging**

### **Real-Time Monitoring:**
- **WebSocket Status**: Connection indicator
- **API Performance**: Request timing tracking
- **Error Rates**: Failed operation monitoring
- **Data Freshness**: Last update timestamps

### **Debug Features:**
- **Console Logging**: Detailed operation logging
- **State Inspection**: React DevTools integration
- **Network Monitoring**: API call tracking
- **Error Tracking**: Comprehensive error logging

## 🔮 **Future Enhancements**

### **Planned Features:**
- **Bulk Operations**: Multi-select alert management
- **Advanced Analytics**: Trend analysis and reporting
- **Export Functionality**: CSV/PDF alert export
- **Notification System**: Email/SMS alert notifications
- **Mobile App**: Native mobile alert management

### **Scalability Improvements:**
- **Virtual Scrolling**: Handle large alert volumes
- **Database Indexing**: Optimize query performance
- **Caching Layer**: Redis-based caching
- **Load Balancing**: Distribute API requests

## 📋 **Implementation Checklist**

### **✅ Completed:**
- [x] Remove static mock data
- [x] Create alerts API client
- [x] Implement useAlerts custom hook
- [x] Refactor alerts page component
- [x] Add real-time WebSocket integration
- [x] Implement dynamic filtering
- [x] Add error handling and loading states
- [x] Create comprehensive documentation

### **🔧 Technical Requirements Met:**
- [x] Real-time listener using onSnapshot equivalent (WebSocket)
- [x] Fetch all documents from alerts collection
- [x] Replace static data with database data
- [x] Dynamic updates without page refresh
- [x] Display alert_type, timestamp, description, camera_id
- [x] Clean and organized list UI

## 🎉 **Conclusion**

The `/dashboard/alerts` page has been successfully refactored to provide a fully dynamic, real-time experience powered by the database. The implementation delivers:

- **Real-time Data**: Live updates from the alerts collection
- **Advanced Filtering**: Comprehensive search and filter capabilities
- **Interactive Management**: Full CRUD operations on alerts
- **Performance Optimized**: Efficient data loading and updates
- **User Experience**: Intuitive interface with clear feedback
- **Scalability Ready**: Architecture prepared for growth

The system now provides a production-ready alerts management interface that automatically stays synchronized with the database and provides immediate feedback for all user actions.
