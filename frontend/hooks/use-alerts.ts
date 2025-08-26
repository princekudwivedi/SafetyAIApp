import { useState, useEffect, useCallback, useRef } from 'react';
import { alertsApi, Alert, AlertsFilter, AlertsSummary } from '@/lib/api/alerts';
import { useWebSocket } from '@/contexts/websocket-context';
import { extractErrorMessage } from '@/lib/utils/error-handling';

interface UseAlertsReturn {
  alerts: Alert[];
  filteredAlerts: Alert[];
  paginatedAlerts: Alert[];
  summary: AlertsSummary | null;
  isLoading: boolean;
  error: string | null;
  filters: AlertsFilter;
  setFilters: (filters: AlertsFilter) => void;
  refreshAlerts: () => Promise<void>;
  updateAlert: (alertId: string, update: any) => Promise<void>;
  deleteAlert: (alertId: string) => Promise<void>;
  // Pagination
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageSize: number;
  setPageSize: (size: number) => void;
  totalCount: number;
  totalPages: number;
  // Unique values for filters
  uniqueStatuses: string[];
  uniqueSeverities: string[];
  uniqueCameras: string[];
  // Loading states
  isLoadingUniqueValues: boolean;
}

export function useAlerts(initialFilters: AlertsFilter = {}): UseAlertsReturn {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [paginatedAlerts, setPaginatedAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<AlertsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AlertsFilter>(initialFilters);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  // Unique values state
  const [uniqueStatuses, setUniqueStatuses] = useState<string[]>([]);
  const [uniqueSeverities, setUniqueSeverities] = useState<string[]>([]);
  const [uniqueCameras, setUniqueCameras] = useState<string[]>([]);
  const [isLoadingUniqueValues, setIsLoadingUniqueValues] = useState(false);
  
  const { subscribe, isConnected } = useWebSocket();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / pageSize);

  // Load unique values for filters
  const loadUniqueValues = useCallback(async () => {
    try {
      setIsLoadingUniqueValues(true);
      
      const [statuses, severities] = await Promise.all([
        alertsApi.getUniqueStatusValues(),
        alertsApi.getUniqueSeverityValues()
      ]);
      
      setUniqueStatuses(statuses);
      setUniqueSeverities(severities);
      
      // Get unique cameras from current alerts (will be updated when alerts load)
      if (alerts.length > 0) {
        const cameras = Array.from(new Set(alerts.map(alert => alert.camera_id)));
        setUniqueCameras(cameras);
      }
      
    } catch (err: any) {
      console.error('Error loading unique values:', err);
    } finally {
      setIsLoadingUniqueValues(false);
    }
  }, [alerts.length]);

  // Load initial alerts data
  const loadAlerts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      // Load alerts with higher limit to get all records
      const [alertsData, summaryData, countData] = await Promise.all([
        alertsApi.getAlerts({ ...filters, limit: 10000 }), // Get all alerts
        alertsApi.getAlertsStatusSummary(),
        alertsApi.getAlertsCount(filters)
      ]);
      
      setAlerts(alertsData);
      setSummary(summaryData);
      setTotalCount(countData.total_count);
      
      // Load unique values after alerts are loaded
      await loadUniqueValues();
      
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(extractErrorMessage(err, 'Failed to load alerts'));
        console.error('Error loading alerts:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [filters, loadUniqueValues]);

  // Refresh alerts data and reset pagination
  const refreshAlerts = useCallback(async () => {
    setCurrentPage(1); // Reset to first page
    setFilters({}); // Clear all filters
    await loadAlerts();
  }, [loadAlerts]);

  // Update alert
  const updateAlert = useCallback(async (alertId: string, update: any) => {
    try {
      const updatedAlert = await alertsApi.updateAlert(alertId, update);
      
      // Update local state
      setAlerts(prev => prev.map(alert => 
        alert.alert_id === alertId ? updatedAlert : alert
      ));
      
      // Refresh summary
      const summaryData = await alertsApi.getAlertsStatusSummary();
      setSummary(summaryData);
      
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to update alert'));
      throw err;
    }
  }, []);

  // Delete alert
  const deleteAlert = useCallback(async (alertId: string) => {
    try {
      await alertsApi.deleteAlert(alertId);
      
      // Remove from local state
      setAlerts(prev => prev.filter(alert => alert.alert_id !== alertId));
      
      // Refresh summary
      const summaryData = await alertsApi.getAlertsStatusSummary();
      setSummary(summaryData);
      
    } catch (err: any) {
      setError(extractErrorMessage(err, 'Failed to delete alert'));
      throw err;
    }
  }, []);

  // Apply filters to alerts with custom sorting
  useEffect(() => {
    let filtered = alerts;

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(alert => alert.status === filters.status);
    }

    if (filters.severity && filters.severity !== 'all') {
      filtered = filtered.filter(alert => alert.severity_level === filters.severity);
    }

    if (filters.camera_id && filters.camera_id !== 'all') {
      filtered = filtered.filter(alert => alert.camera_id === filters.camera_id);
    }

    if (filters.site_id && filters.site_id !== 'all') {
      filtered = filtered.filter(alert => alert.location_id === filters.site_id);
    }

    // Custom sorting: Dismissed alerts after Resolved ones
    filtered.sort((a, b) => {
      // First sort by status priority
      const statusPriority = {
        'new': 1,
        'in_progress': 2,
        'resolved': 3,
        'dismissed': 4
      };
      
      const aPriority = statusPriority[a.status as keyof typeof statusPriority] || 5;
      const bPriority = statusPriority[b.status as keyof typeof statusPriority] || 5;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by timestamp (newest first)
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    setFilteredAlerts(filtered);
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Update unique cameras from filtered alerts
    if (filtered.length > 0) {
      const cameras = Array.from(new Set(filtered.map(alert => alert.camera_id)));
      setUniqueCameras(cameras);
    }
    
  }, [alerts, filters]);

  // Apply pagination to filtered alerts
  useEffect(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginated = filteredAlerts.slice(startIndex, endIndex);
    setPaginatedAlerts(paginated);
  }, [filteredAlerts, currentPage, pageSize]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!isConnected) return;

    // Subscribe to new alerts
    const unsubscribeNewAlert = subscribe('new_alert', (data) => {
      if (data.type === 'new_alert' && data.payload) {
        setAlerts(prev => [data.payload, ...prev]);
        
        // Refresh summary when new alert arrives
        alertsApi.getAlertsStatusSummary().then(setSummary).catch(console.error);
      }
    });

    // Subscribe to alert updates
    const unsubscribeAlertUpdate = subscribe('alert_update', (data) => {
      if (data.type === 'alert_update' && data.payload) {
        setAlerts(prev => prev.map(alert => 
          alert.alert_id === data.payload.alert_id 
            ? { ...alert, ...data.payload }
            : alert
        ));
        
        // Refresh summary when alert is updated
        alertsApi.getAlertsStatusSummary().then(setSummary).catch(console.error);
      }
    });

    // Subscribe to alert deletions
    const unsubscribeAlertDelete = subscribe('alert_delete', (data) => {
      if (data.type === 'alert_delete' && data.payload) {
        setAlerts(prev => prev.filter(alert => alert.alert_id !== data.payload.alert_id));
        
        // Refresh summary when alert is deleted
        alertsApi.getAlertsStatusSummary().then(setSummary).catch(console.error);
      }
    });

    return () => {
      unsubscribeNewAlert();
      unsubscribeAlertUpdate();
      unsubscribeAlertDelete();
    };
  }, [subscribe, isConnected]);

  // Load alerts when filters change
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    alerts,
    filteredAlerts,
    paginatedAlerts,
    summary,
    isLoading,
    error,
    filters,
    setFilters,
    refreshAlerts,
    updateAlert,
    deleteAlert,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    // Unique values for filters
    uniqueStatuses,
    uniqueSeverities,
    uniqueCameras,
    // Loading states
    isLoadingUniqueValues,
  };
}
