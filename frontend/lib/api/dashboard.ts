import { apiClient } from './client';

export interface DashboardStats {
  total_alerts: number;
  today_alerts: number;
  yesterday_alerts: number;
  new_alerts: number;
  in_progress_alerts: number;
  resolved_alerts: number;
  high_severity_alerts: number;
  medium_severity_alerts: number;
  low_severity_alerts: number;
  total_cameras: number;
  total_sites: number;
  safety_score: number;
  weekly_data: Array<{
    day: string;
    alerts: number;
  }>;
  violation_types: Array<{
    _id: string;
    count: number;
  }>;
}

export interface RecentAlert {
  alert_id: string;
  timestamp: string;
  violation_type: string;
  severity_level: string;
  description: string;
  camera_id: string;
  status: string;
  confidence_score: number;
}

export interface AlertsSummary {
  alerts_by_status: Array<{
    status: string;
    count: number;
  }>;
  alerts_by_severity: Array<{
    severity: string;
    count: number;
  }>;
  recent_alerts: RecentAlert[];
}

export const dashboardApi = {
  // Get main dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get('/api/v1/stats/dashboard');
    return response.data;
  },

  // Get alerts summary
  async getAlertsSummary(): Promise<AlertsSummary> {
    const response = await apiClient.get('/api/v1/stats/alerts/summary');
    return response.data;
  },

  // Get alerts trends
  async getAlertsTrends(days: number = 7): Promise<any> {
    const response = await apiClient.get(`/api/v1/stats/alerts/trends?days=${days}`);
    return response.data;
  },

  // Get camera performance
  async getCameraPerformance(): Promise<any> {
    const response = await apiClient.get('/api/v1/stats/cameras/performance');
    return response.data;
  },

  // Get sites overview
  async getSitesOverview(): Promise<any> {
    const response = await apiClient.get('/api/v1/stats/sites/overview');
    return response.data;
  },

  // Get violations analysis
  async getViolationsAnalysis(days: number = 30): Promise<any> {
    const response = await apiClient.get(`/api/v1/stats/violations/analysis?days=${days}`);
    return response.data;
  }
};
