import { apiClient } from './client';

export interface SystemSetting {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description: string;
  category: 'ai' | 'video' | 'notifications' | 'system';
  options?: string[];
  min_value?: number;
  max_value?: number;
  created_at: string;
  updated_at: string;
}

export interface SystemSettingUpdate {
  value: string | number | boolean;
}

export interface SystemSettingsResponse {
  settings: SystemSetting[];
  total: number;
}

export interface SystemStatus {
  websocket_connected: boolean;
  database_connected: boolean;
  ai_model_loaded: boolean;
  file_system_ready: boolean;
  last_updated: string;
}

export interface SystemHealthResponse {
  status: SystemStatus;
  version: string;
  uptime?: string;
}

export type SettingCategory = 'ai' | 'video' | 'notifications' | 'system';

class SystemSettingsApi {
  async getSettings(category?: SettingCategory): Promise<SystemSettingsResponse> {
    const params = new URLSearchParams();
    if (category) {
      params.append('category', category);
    }
    
    const response = await apiClient.get(`/api/v1/system-settings/?${params.toString()}`);
    return response.data;
  }

  async getSetting(key: string): Promise<SystemSetting> {
    const response = await apiClient.get(`/api/v1/system-settings/${key}`);
    return response.data;
  }

  async updateSetting(key: string, updateData: SystemSettingUpdate): Promise<SystemSetting> {
    const response = await apiClient.put(`/api/v1/system-settings/${key}`, updateData);
    return response.data;
  }

  async resetSettings(): Promise<SystemSettingsResponse> {
    const response = await apiClient.post('/api/v1/system-settings/reset');
    return response.data;
  }

  async getSystemHealth(): Promise<SystemHealthResponse> {
    const response = await apiClient.get('/api/v1/system-settings/health/status');
    return response.data;
  }

  // Batch update multiple settings
  async updateMultipleSettings(updates: { key: string; value: string | number | boolean }[]): Promise<SystemSetting[]> {
    const promises = updates.map(update => 
      this.updateSetting(update.key, { value: update.value })
    );
    return Promise.all(promises);
  }
}

export const systemSettingsApi = new SystemSettingsApi();
