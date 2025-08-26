'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { MetricCard } from './metric-card';
import { SafetyChart } from './safety-chart';
import { RecentAlerts } from './recent-alerts';
import { SystemStatus } from './system-status';
import { TrendingUp, TrendingDown, AlertTriangle, Video, Users, Shield } from 'lucide-react';
import { dashboardApi, DashboardStats as ApiDashboardStats, AlertsSummary } from '@/lib/api/dashboard';


interface DashboardStats {
  totalViolations: number;
  activeAlerts: number;
  activeCameras: number;
  workersMonitored: number;
  violationsToday: number;
  violationsYesterday: number;
  safetyScore: number;
}

export function DashboardOverview() {
  const { subscribe, isConnected } = useWebSocket();
  const [stats, setStats] = useState<DashboardStats>({
    totalViolations: 0,
    activeAlerts: 0,
    activeCameras: 0,
    workersMonitored: 0,
    violationsToday: 0,
    violationsYesterday: 0,
    safetyScore: 87,
  });
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Centralized data state for child components
  const [dashboardData, setDashboardData] = useState<ApiDashboardStats | null>(null);
  const [alertsSummary, setAlertsSummary] = useState<AlertsSummary | null>(null);
  
  // Ref to ensure data is only loaded once
  const dataLoadedRef = useRef(false);

  // Single data loading function that fetches all data at once
  const loadAllDashboardData = useCallback(async () => {
    // Prevent multiple data loads
    if (dataLoadedRef.current) {
      console.log('🔄 Data already loaded, skipping...'); // Debug log
      return;
    }
    
    try {
      console.log('🔄 Loading all dashboard data...'); // Debug log
      setIsLoading(true);
      setHasError(false);
      
      // Fetch all data in parallel to minimize API calls
      const [apiStats, apiAlertsSummary] = await Promise.all([
        dashboardApi.getDashboardStats(),
        dashboardApi.getAlertsSummary()
      ]);
      
      console.log('✅ Dashboard data loaded successfully'); // Debug log
      console.log('📊 Dashboard Stats:', apiStats); // Debug log
      console.log('🚨 Alerts Summary:', apiAlertsSummary); // Debug log
      
      // Store raw data for child components
      setDashboardData(apiStats);
      setAlertsSummary(apiAlertsSummary);
      
      // Transform API data to component format
      setStats({
        totalViolations: apiStats.total_alerts,
        activeAlerts: apiStats.new_alerts + apiStats.in_progress_alerts,
        activeCameras: apiStats.total_cameras,
        workersMonitored: Math.floor(apiStats.total_cameras * 5.6), // Estimate based on cameras
        violationsToday: apiStats.today_alerts,
        violationsYesterday: apiStats.yesterday_alerts,
        safetyScore: apiStats.safety_score,
      });
      
      // Mark data as loaded
      dataLoadedRef.current = true;
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    console.log('🚀 Dashboard component mounted, loading data...'); // Debug log
    console.log('📊 Component ID:', Math.random().toString(36).substr(2, 9)); // Debug log
    
    try {
      // Subscribe to real-time updates
      const unsubscribeStats = subscribe('dashboard_stats', (data) => {
        if (data.type === 'dashboard_stats') {
          setStats(data.payload);
        }
      });

      const unsubscribeAlerts = subscribe('new_alert', (data) => {
        if (data.type === 'new_alert') {
          // Update stats when new alert comes in
          setStats(prev => ({
            ...prev,
            totalViolations: prev.totalViolations + 1,
            activeAlerts: prev.activeAlerts + 1,
          }));
        }
      });

      // Load initial data only once
      loadAllDashboardData();

      return () => {
        console.log('🧹 Dashboard component unmounting, cleaning up...'); // Debug log
        unsubscribeStats();
        unsubscribeAlerts();
      };
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setHasError(true);
    }
  }, [subscribe, loadAllDashboardData]);

  const getViolationTrend = () => {
    // Handle division by zero and edge cases
    if (stats.violationsYesterday === 0) {
      if (stats.violationsToday > 0) {
        return { trend: 'up', percentage: 100 };
      } else {
        return { trend: 'stable', percentage: 0 };
      }
    }
    
    if (stats.violationsToday > stats.violationsYesterday) {
      const percentage = Math.round(((stats.violationsToday - stats.violationsYesterday) / stats.violationsYesterday) * 100);
      return { trend: 'up', percentage };
    } else if (stats.violationsToday < stats.violationsYesterday) {
      const percentage = Math.round(((stats.violationsYesterday - stats.violationsToday) / stats.violationsYesterday) * 100);
      return { trend: 'down', percentage };
    } else {
      return { trend: 'stable', percentage: 0 };
    }
  };

  const trend = getViolationTrend();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load dashboard data</p>
          <button 
            onClick={loadAllDashboardData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="mt-2 text-gray-600">
          Real-time safety monitoring and analytics for construction sites
        </p>
      </div>

      {/* Connection Status */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            isConnected ? 'bg-green-400' : 'bg-red-400'
          }`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>



      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Violations"
          value={stats.totalViolations}
          icon={AlertTriangle}
          trend={trend.trend as 'up' | 'down' | 'stable'}
          trendValue={trend.percentage}
          trendLabel="vs yesterday"
          className="bg-red-50 border-red-200"
        />
        <MetricCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          className="bg-yellow-50 border-yellow-200"
        />
        <MetricCard
          title="Active Cameras"
          value={stats.activeCameras}
          icon={Video}
          className="bg-blue-50 border-blue-200"
        />
        <MetricCard
          title="Workers Monitored"
          value={stats.workersMonitored}
          icon={Users}
          className="bg-green-50 border-green-200"
        />
      </div>

      {/* Safety Score */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Safety Score</h3>
          <Shield className="h-6 w-6 text-primary-600" />
        </div>
        <div className="text-center">
          <div className="text-4xl font-bold text-primary-600 mb-2">
            {stats.safetyScore}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-primary-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${stats.safetyScore}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {stats.safetyScore >= 80 ? 'Excellent' : 
             stats.safetyScore >= 60 ? 'Good' : 
             stats.safetyScore >= 40 ? 'Fair' : 'Poor'} safety performance
          </p>
        </div>
      </div>

      {/* Charts and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Safety Violations</h2>
          <SafetyChart 
            dashboardData={dashboardData}
            alertsSummary={alertsSummary}
            isLoading={isLoading}
          />
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alerts</h2>
          <RecentAlerts 
            alertsSummary={alertsSummary}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
        <SystemStatus />
      </div>
    </div>
  );
}
