import { useState, useCallback, useEffect } from 'react';
import { alertsApi } from '@/lib/api/alerts';
import { monitoringApi } from '@/lib/api/monitoring';
import { sitesApi } from '@/lib/api/sites';
import { Alert } from '@/lib/api/alerts';
import { CameraMonitoringStatus } from '@/lib/api/monitoring';
import { Site } from '@/lib/api/sites';

export interface SearchResult {
  type: 'alert' | 'camera' | 'site';
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  data: Alert | CameraMonitoringStatus | Site;
}

export interface UseSearchReturn {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchError: string | null;
  performSearch: (query: string) => Promise<void>;
  clearSearch: () => void;
  setSearchQuery: (query: string) => void;
}

export function useSearch(): UseSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    setIsSearching(true);
    setSearchError(null);

    try {
      const [alerts, cameras, sites] = await Promise.all([
        alertsApi.searchAlerts(query, 5),
        monitoringApi.searchCameras(query, 5),
        sitesApi.searchSites(query, 5)
      ]);

      const results: SearchResult[] = [];

      // Process alerts
      alerts.forEach((alert) => {
        results.push({
          type: 'alert',
          id: alert._id,
          title: alert.violation_type,
          subtitle: `Camera ${alert.camera_id}`,
          description: alert.description,
          data: alert
        });
      });

      // Process cameras
      cameras.forEach((camera) => {
        results.push({
          type: 'camera',
          id: camera.camera_id,
          title: camera.name,
          subtitle: camera.location,
          description: `Zone: ${camera.zone} • Status: ${camera.status}`,
          data: camera
        });
      });

      // Process sites
      sites.forEach((site) => {
        results.push({
          type: 'site',
          id: site.site_id,
          title: site.site_name,
          subtitle: site.location,
          description: `Contact: ${site.contact_person} • ${site.contact_email}`,
          data: site
        });
      });

      // Sort results by relevance (alerts first, then cameras, then sites)
      const sortedResults = results.sort((a, b) => {
        const typeOrder = { alert: 0, camera: 1, site: 2 };
        return typeOrder[a.type] - typeOrder[b.type];
      });

      setSearchResults(sortedResults);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError('Failed to perform search. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
  }, []);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
        setSearchError(null);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, performSearch]);

  return {
    searchQuery,
    searchResults,
    isSearching,
    searchError,
    performSearch,
    clearSearch,
    setSearchQuery
  };
}
