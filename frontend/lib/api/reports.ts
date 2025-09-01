import { apiClient } from './client';

export interface ReportOverview {
  weeklyData: Array<{
    period: string;
    violations: number;
    alerts: number;
    safetyScore: number;
  }>;
  violationTypes: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  cameraPerformance: Array<{
    camera: string;
    violations: number;
    uptime: number;
    alerts: number;
  }>;
  keyMetrics: {
    totalViolations: number;
    totalAlerts: number;
    activeCameras: number;
    overallSafetyScore: number;
  };
}

export interface ViolationsAnalysis {
  timeAnalysis: Array<{
    _id: number;
    count: number;
  }>;
  dayAnalysis: Array<{
    _id: number;
    count: number;
  }>;
  locationAnalysis: Array<{
    _id: string;
    count: number;
  }>;
}

export interface CameraPerformanceAnalysis {
  cameras: Array<{
    cameraId: string;
    cameraName: string;
    siteId: string;
    totalAlerts: number;
    violations: number;
    uptime: number;
    avgResponseTime: number;
    lastAlert: string;
    status: string;
    performanceScore: number;
    performanceLevel: string;
  }>;
  summary: {
    totalCameras: number;
    excellentPerformance: number;
    goodPerformance: number;
    fairPerformance: number;
    poorPerformance: number;
  };
}

export interface TrendsAnalysis {
  historicalData: Array<{
    _id: {
      week: number;
      year: number;
    };
    violations: number;
    alerts: number;
    avgSeverity: number;
  }>;
  forecastData: Array<{
    period: string;
    violations: number;
    alerts: number;
    isForecast: boolean;
  }>;
  trends: {
    violationTrend: number;
    trendDirection: string;
    confidence: number;
  };
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  parameters: string[];
  formats: string[];
}

export class ReportsAPI {
  /**
   * Get comprehensive overview analytics for reports
   */
  static async getOverview(
    period: string = "8",
    siteId?: string
  ): Promise<ReportOverview> {
    const params = new URLSearchParams({ period });
    if (siteId) params.append('site_id', siteId);
    
    const response = await apiClient.get(`/api/v1/reports/analytics/overview?${params}`);
    return response.data;
  }

  /**
   * Get detailed violations analysis
   */
  static async getViolationsAnalysis(
    period: string = "8",
    violationType?: string,
    siteId?: string
  ): Promise<ViolationsAnalysis> {
    const params = new URLSearchParams({ period });
    if (violationType) params.append('violation_type', violationType);
    if (siteId) params.append('site_id', siteId);
    
    const response = await apiClient.get(`/api/v1/reports/analytics/violations?${params}`);
    return response.data;
  }

  /**
   * Get detailed camera performance analysis
   */
  static async getCameraPerformanceAnalysis(
    period: string = "8",
    siteId?: string
  ): Promise<CameraPerformanceAnalysis> {
    const params = new URLSearchParams({ period });
    if (siteId) params.append('site_id', siteId);
    
    const response = await apiClient.get(`/api/v1/reports/analytics/cameras?${params}`);
    return response.data;
  }

  /**
   * Get trends analysis and forecasting
   */
  static async getTrendsAnalysis(
    period: string = "26",
    forecastWeeks: number = 4
  ): Promise<TrendsAnalysis> {
    const params = new URLSearchParams({ 
      period, 
      forecast_weeks: forecastWeeks.toString() 
    });
    
    const response = await apiClient.get(`/api/v1/reports/analytics/trends?${params}`);
    return response.data;
  }

  /**
   * Get available report templates
   */
  static async getTemplates(): Promise<{ templates: ReportTemplate[] }> {
    const response = await apiClient.get('/api/v1/reports/templates');
    return response.data;
  }

  /**
   * Export report data
   */
  static async exportReport(
    reportType: string,
    format: string = "csv",
    period: string = "8",
    siteId?: string
  ): Promise<Blob> {
    const params = new URLSearchParams({ 
      report_type: reportType,
      format,
      period
    });
    if (siteId) params.append('site_id', siteId);
    
    const response = await apiClient.post(`/api/v1/reports/export?${params}`, {}, {
      responseType: 'blob'
    });
    
    return response.data;
  }

  /**
   * Download report as file
   */
  static async downloadReport(
    reportType: string,
    format: string = "csv",
    period: string = "8",
    siteId?: string
  ): Promise<void> {
    try {
      const blob = await this.exportReport(reportType, format, period, siteId);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_report_${period}weeks_${new Date().toISOString().split('T')[0]}.${format}`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading report:', error);
      throw error;
    }
  }
}
