import { useState, useEffect, useCallback } from 'react';
import { sitesApi, Site, SiteCreate, SiteUpdate, SiteFilters, SiteStats } from '@/lib/api/sites';

interface UseSitesReturn {
  sites: Site[];
  loading: boolean;
  error: string | null;
  stats: SiteStats | null;
  refreshSites: () => Promise<void>;
  createSite: (siteData: SiteCreate) => Promise<Site>;
  updateSite: (siteId: string, siteData: SiteUpdate) => Promise<Site>;
  deleteSite: (siteId: string) => Promise<void>;
  getSitesWithFilters: (filters: SiteFilters) => Promise<Site[]>;
}

export function useSites(): UseSitesReturn {
  const [sites, setSites] = useState<Site[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSites = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [sitesData, statsData] = await Promise.all([
        sitesApi.getSites(),
        sitesApi.getSiteStats()
      ]);
      setSites(sitesData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch sites');
      console.error('Error fetching sites:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshSites = useCallback(async () => {
    await fetchSites();
  }, [fetchSites]);

  const createSite = useCallback(async (siteData: SiteCreate) => {
    try {
      const newSite = await sitesApi.createSite(siteData);
      setSites(prev => [...prev, newSite]);
      await fetchSites(); // Refresh stats
      return newSite;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create site');
      throw err;
    }
  }, [fetchSites]);

  const updateSite = useCallback(async (siteId: string, siteData: SiteUpdate) => {
    try {
      const updatedSite = await sitesApi.updateSite(siteId, siteData);
      setSites(prev => prev.map(site => 
        site.site_id === siteId ? updatedSite : site
      ));
      await fetchSites(); // Refresh stats
      return updatedSite;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update site');
      throw err;
    }
  }, [fetchSites]);

  const deleteSite = useCallback(async (siteId: string) => {
    try {
      await sitesApi.deleteSite(siteId);
      setSites(prev => prev.filter(site => site.site_id !== siteId));
      await fetchSites(); // Refresh stats
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete site');
      throw err;
    }
  }, [fetchSites]);

  const getSitesWithFilters = useCallback(async (filters: SiteFilters) => {
    try {
      return await sitesApi.getSites(filters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch filtered sites');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchSites();
  }, [fetchSites]);

  return {
    sites,
    loading,
    error,
    stats,
    refreshSites,
    createSite,
    updateSite,
    deleteSite,
    getSitesWithFilters,
  };
}
