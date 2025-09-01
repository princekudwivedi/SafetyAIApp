import { apiClient } from './client';

export interface Camera {
  camera_id: string;
  site_id: string;
  camera_name: string;
  stream_url: string;
  status: string;
  installation_date: string;
  settings: Record<string, any>;
  location_description?: string;
  id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CameraCreate {
  site_id: string;
  camera_name: string;
  stream_url: string;
  installation_date: string;
  settings?: Record<string, any>;
  location_description?: string;
}

export interface CameraUpdate {
  camera_name?: string;
  stream_url?: string;
  status?: string;
  settings?: Record<string, any>;
  location_description?: string;
}

export interface CameraFilters {
  site_id?: string;
  status?: string;
  skip?: number;
  limit?: number;
}

export interface CameraStatus {
  camera_id: string;
  camera_name: string;
  site_id: string;
  site_name: string;
  status: string;
  stream_url: string;
  installation_date: string;
  total_alerts: number;
  recent_alerts_24h: number;
  last_updated: string;
}

export interface CameraMonitoringStatus {
  camera_id: string;
  name: string;
  location: string;
  zone: string;
  status: string;
  stream_url: string;
  is_streaming: boolean;
  is_recording: boolean;
  last_frame?: string;
  installation_date?: string;
  settings: Record<string, any>;
}

export interface CameraTestResult {
  camera_id: string;
  status: 'connected' | 'disconnected' | 'error';
  message: string;
  stream_available: boolean;
}

export interface SiteCameras {
  site_id: string;
  cameras: Camera[];
  total_cameras: number;
}

export interface CameraAlerts {
  camera_id: string;
  alerts: any[];
  total_alerts: number;
}

class CameraAPI {
  /**
   * Get all cameras with optional filtering
   */
  async getCameras(filters?: CameraFilters): Promise<Camera[]> {
    const params = new URLSearchParams();
    
    if (filters?.site_id) params.append('site_id', filters.site_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.skip) params.append('skip', filters.skip.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    
    const response = await apiClient.get(`/api/v1/cameras/?${params.toString()}`);
    return response.data;
  }

  /**
   * Get a specific camera by ID
   */
  async getCamera(cameraId: string): Promise<Camera> {
    const response = await apiClient.get(`/api/v1/cameras/${cameraId}`);
    return response.data;
  }

  /**
   * Create a new camera
   */
  async createCamera(cameraData: CameraCreate): Promise<Camera> {
    const response = await apiClient.post('/api/v1/cameras/', cameraData);
    return response.data;
  }

  /**
   * Update an existing camera
   */
  async updateCamera(cameraId: string, updateData: CameraUpdate): Promise<Camera> {
    const response = await apiClient.put(`/api/v1/cameras/${cameraId}`, updateData);
    return response.data;
  }

  /**
   * Delete a camera
   */
  async deleteCamera(cameraId: string): Promise<{ message: string }> {
    const response = await apiClient.delete(`/api/v1/cameras/${cameraId}`);
    return response.data;
  }

  /**
   * Get camera status and statistics
   */
  async getCameraStatus(cameraId: string): Promise<CameraStatus> {
    const response = await apiClient.get(`/api/v1/cameras/${cameraId}/status`);
    return response.data;
  }

  /**
   * Test camera connection
   */
  async testCameraConnection(cameraId: string): Promise<CameraTestResult> {
    const response = await apiClient.post(`/api/v1/cameras/${cameraId}/test`);
    return response.data;
  }

  /**
   * Get cameras for a specific site
   */
  async getCamerasBySite(siteId: string): Promise<SiteCameras> {
    const response = await apiClient.get(`/api/v1/cameras/site/${siteId}/list`);
    return response.data;
  }

  /**
   * Get camera alerts
   */
  async getCameraAlerts(cameraId: string, limit: number = 100): Promise<CameraAlerts> {
    const response = await apiClient.get(`/api/v1/cameras/${cameraId}/alerts?limit=${limit}`);
    return response.data;
  }

  /**
   * Get cameras monitoring status for live monitoring
   */
  async getCamerasMonitoringStatus(): Promise<CameraMonitoringStatus[]> {
    const response = await apiClient.get('/api/v1/cameras/monitoring/status');
    return response.data;
  }
}

export const cameraAPI = new CameraAPI();
