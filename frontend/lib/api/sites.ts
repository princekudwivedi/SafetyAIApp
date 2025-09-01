import { apiClient } from './client';

export interface Site {
  site_id: string;
  site_name: string;
  location: string;
  contact_person: string;
  contact_email?: string;
  contact_phone?: string;
  is_active: boolean;
  status: 'active' | 'inactive' | 'maintenance';
  camera_count: number;
  worker_count: number;
  active_alerts: number;
  created_at?: string;
  updated_at?: string;
}

export interface SiteCreate {
  site_name: string;
  location: string;
  contact_person: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  worker_count?: number;
}

export interface SiteUpdate {
  site_name?: string;
  location?: string;
  contact_person?: string;
  contact_email?: string;
  contact_phone?: string;
  status?: 'active' | 'inactive' | 'maintenance';
  worker_count?: number;
  is_active?: boolean;
}

export interface SiteFilters {
  is_active?: boolean;
  status?: string;
  search?: string;
}

export interface SiteStats {
  total_sites: number;
  active_sites: number;
  total_workers: number;
  total_cameras: number;
  total_alerts: number;
}

export const sitesApi = {
  // Get all sites with optional filtering
  getSites: async (filters?: SiteFilters) => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) {
      params.append('is_active', filters.is_active.toString());
    }
    if (filters?.status) {
      params.append('status', filters.status);
    }
    
    const response = await apiClient.get(`/api/v1/sites/?${params.toString()}`);
    return response.data as Site[];
  },

  // Get a specific site by ID
  getSite: async (siteId: string) => {
    const response = await apiClient.get(`/api/v1/sites/${siteId}`);
    return response.data as Site;
  },

  // Create a new site
  createSite: async (siteData: SiteCreate) => {
    const response = await apiClient.post('/api/v1/sites/', siteData);
    return response.data as Site;
  },

  // Update an existing site
  updateSite: async (siteId: string, siteData: SiteUpdate) => {
    const response = await apiClient.put(`/api/v1/sites/${siteId}`, siteData);
    return response.data as Site;
  },

  // Delete a site
  deleteSite: async (siteId: string) => {
    const response = await apiClient.delete(`/api/v1/sites/${siteId}`);
    return response.data;
  },

  // Get site statistics
  getSiteStats: async () => {
    const sites = await sitesApi.getSites();
    const stats: SiteStats = {
      total_sites: sites.length,
      active_sites: sites.filter(site => site.status === 'active').length,
      total_workers: sites.reduce((sum, site) => sum + site.worker_count, 0),
      total_cameras: sites.reduce((sum, site) => sum + site.camera_count, 0),
      total_alerts: sites.reduce((sum, site) => sum + site.active_alerts, 0),
    };
    return stats;
  },

  // Get cameras for a specific site
  getSiteCameras: async (siteId: string) => {
    const response = await apiClient.get(`/api/v1/sites/${siteId}/cameras`);
    return response.data;
  },

  // Get alerts for a specific site
  getSiteAlerts: async (siteId: string, limit: number = 100) => {
    const response = await apiClient.get(`/api/v1/sites/${siteId}/alerts?limit=${limit}`);
    return response.data;
  },
};
