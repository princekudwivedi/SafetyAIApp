import { apiClient } from './client';

// Alert interfaces based on backend models
export interface Alert {
  _id: string;
  alert_id: string;
  timestamp: string;
  violation_type: string;
  severity_level: string;
  description: string;
  confidence_score: number;
  location_id: string;
  camera_id: string;
  primary_object: any;
  snapshot_url?: string;
  status: string;
  assigned_to?: string;
  resolution_notes?: string;
  updated_at?: string;
}

export interface AlertCreate {
  violation_type: string;
  severity_level: string;
  description: string;
  confidence_score: number;
  location_id: string;
  camera_id: string;
  primary_object: any;
  snapshot_url?: string;
}

export interface AlertUpdate {
  status?: string;
  assigned_to?: string;
  resolution_notes?: string;
}

export interface AlertsFilter {
  status?: string;
  severity?: string;
  camera_id?: string;
  site_id?: string;
  start_date?: string;
  end_date?: string;
  skip?: number;
  limit?: number;
}

export interface AlertsSummary {
  total_alerts: number;
  by_status: Record<string, number>;
  by_severity: Record<string, number>;
}

export interface RecentActiveAlerts {
  alerts: Alert[];
  total: number;
}

// Alerts API client
export class AlertsApi {
  // Get all alerts with optional filtering
  async getAlerts(filters: AlertsFilter = {}): Promise<Alert[]> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.camera_id) params.append('camera_id', filters.camera_id);
    if (filters.site_id) params.append('site_id', filters.site_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.skip) params.append('skip', filters.skip.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get(`/api/v1/alerts/?${params.toString()}`);
    return response.data;
  }

  // Get total count of alerts with optional filtering
  async getAlertsCount(filters: AlertsFilter = {}): Promise<{ total_count: number }> {
    const params = new URLSearchParams();
    
    if (filters.status) params.append('status', filters.status);
    if (filters.severity) params.append('severity', filters.severity);
    if (filters.camera_id) params.append('camera_id', filters.camera_id);
    if (filters.site_id) params.append('site_id', filters.site_id);
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);

    const response = await apiClient.get(`/api/v1/alerts/count?${params.toString()}`);
    return response.data;
  }

  // Get all unique status values
  async getUniqueStatusValues(): Promise<string[]> {
    const response = await apiClient.get('/api/v1/alerts/unique/status');
    return response.data;
  }

  // Get all unique severity values
  async getUniqueSeverityValues(): Promise<string[]> {
    const response = await apiClient.get('/api/v1/alerts/unique/severity');
    return response.data;
  }

  // Get a specific alert by ID
  async getAlert(alertId: string): Promise<Alert> {
    const response = await apiClient.get(`/api/v1/alerts/${alertId}`);
    return response.data;
  }

  // Create a new alert
  async createAlert(alert: AlertCreate): Promise<Alert> {
    const response = await apiClient.post('/api/v1/alerts/', alert);
    return response.data;
  }

  // Update an existing alert
  async updateAlert(alertId: string, update: AlertUpdate): Promise<Alert> {
    const response = await apiClient.put(`/api/v1/alerts/${alertId}`, update);
    return response.data;
  }

  // Delete an alert
  async deleteAlert(alertId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/v1/alerts/${alertId}`);
    return response.data;
  }

  // Get recent active alerts
  async getRecentActiveAlerts(limit: number = 10): Promise<RecentActiveAlerts> {
    const response = await apiClient.get(`/api/v1/alerts/recent/active?limit=${limit}`);
    return {
      alerts: response.data,
      total: response.data.length
    };
  }

  // Get alerts status summary
  async getAlertsStatusSummary(): Promise<AlertsSummary> {
    const response = await apiClient.get('/api/v1/alerts/summary/status');
    return response.data;
  }

  // Get alerts severity summary
  async getAlertsSeveritySummary(): Promise<AlertsSummary> {
    const response = await apiClient.get('/api/v1/alerts/summary/severity');
    return response.data;
  }

  // Get alerts with real-time updates (for WebSocket integration)
  async getAlertsRealtime(filters: AlertsFilter = {}): Promise<Alert[]> {
    // This method can be extended to work with WebSocket for real-time updates
    return this.getAlerts(filters);
  }
}

// Export singleton instance
export const alertsApi = new AlertsApi();
