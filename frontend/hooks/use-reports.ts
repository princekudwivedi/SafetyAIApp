import { useState, useEffect, useCallback } from 'react';
import { ReportsAPI, ReportOverview, ViolationsAnalysis, CameraPerformanceAnalysis, TrendsAnalysis } from '@/lib/api/reports';

export interface UseReportsOptions {
  period?: string;
  siteId?: string;
  violationType?: string;
  forecastWeeks?: number;
}

export function useReports(options: UseReportsOptions = {}) {
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [violations, setViolations] = useState<ViolationsAnalysis | null>(null);
  const [cameras, setCameras] = useState<CameraPerformanceAnalysis | null>(null);
  const [trends, setTrends] = useState<TrendsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { period = "8", siteId, violationType, forecastWeeks = 4 } = options;

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ReportsAPI.getOverview(period, siteId);
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
      console.error('Error fetching overview:', err);
    } finally {
      setLoading(false);
    }
  }, [period, siteId]);

  const fetchViolations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ReportsAPI.getViolationsAnalysis(period, violationType, siteId);
      setViolations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations data');
      console.error('Error fetching violations:', err);
    } finally {
      setLoading(false);
    }
  }, [period, violationType, siteId]);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ReportsAPI.getCameraPerformanceAnalysis(period, siteId);
      setCameras(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch camera data');
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  }, [period, siteId]);

  const fetchTrends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ReportsAPI.getTrendsAnalysis(period, forecastWeeks);
      setTrends(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends data');
      console.error('Error fetching trends:', err);
    } finally {
      setLoading(false);
    }
  }, [period, forecastWeeks]);

  const exportReport = useCallback(async (
    reportType: string,
    format: string = "csv"
  ) => {
    try {
      setError(null);
      await ReportsAPI.downloadReport(reportType, format, period, siteId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
      console.error('Error exporting report:', err);
    }
  }, [period, siteId]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchOverview(),
      fetchViolations(),
      fetchCameras(),
      fetchTrends()
    ]);
  }, [fetchOverview, fetchViolations, fetchCameras, fetchTrends]);

  // Auto-fetch overview when dependencies change
  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return {
    // Data
    overview,
    violations,
    cameras,
    trends,
    
    // State
    loading,
    error,
    
    // Actions
    fetchOverview,
    fetchViolations,
    fetchCameras,
    fetchTrends,
    exportReport,
    refreshAll,
    
    // Utilities
    clearError: () => setError(null)
  };
}

// Specialized hooks for specific report types
export function useOverviewReport(period: string = "8", siteId?: string) {
  const [data, setData] = useState<ReportOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ReportsAPI.getOverview(period, siteId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview data');
    } finally {
      setLoading(false);
    }
  }, [period, siteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useViolationsReport(period: string = "8", violationType?: string, siteId?: string) {
  const [data, setData] = useState<ViolationsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ReportsAPI.getViolationsAnalysis(period, violationType, siteId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch violations data');
    } finally {
      setLoading(false);
    }
  }, [period, violationType, siteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useCameraReport(period: string = "8", siteId?: string) {
  const [data, setData] = useState<CameraPerformanceAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ReportsAPI.getCameraPerformanceAnalysis(period, siteId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch camera data');
    } finally {
      setLoading(false);
    }
  }, [period, siteId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

export function useTrendsReport(period: string = "26", forecastWeeks: number = 4) {
  const [data, setData] = useState<TrendsAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await ReportsAPI.getTrendsAnalysis(period, forecastWeeks);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch trends data');
    } finally {
      setLoading(false);
    }
  }, [period, forecastWeeks]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
