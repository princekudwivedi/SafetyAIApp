'use client';

import React, { useEffect, useState } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { MetricCard } from './metric-card';
import { SafetyChart } from './safety-chart';
import { RecentAlerts } from './recent-alerts';
import { SystemStatus } from './system-status';
import { TrendingUp, TrendingDown, AlertTriangle, Video, Users, Shield } from 'lucide-react';

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

  useEffect(() => {
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

      // Load initial data
      loadDashboardData();

      return () => {
        unsubscribeStats();
        unsubscribeAlerts();
      };
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setHasError(true);
    }
  }, [subscribe]);

  const loadDashboardData = async () => {
    try {
      // In a real app, this would fetch from the API
      // For now, using mock data
      setStats({
        totalViolations: 156,
        activeAlerts: 23,
        activeCameras: 8,
        workersMonitored: 45,
        violationsToday: 12,
        violationsYesterday: 8,
        safetyScore: 87,
      });
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setHasError(true);
    }
  };

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
      return { trend: 'up', percentage: isFinite(percentage) ? percentage : 100 };
    } else if (stats.violationsToday < stats.violationsYesterday) {
      const percentage = Math.round(((stats.violationsYesterday - stats.violationsToday) / stats.violationsYesterday) * 100);
      return { trend: 'down', percentage: isFinite(percentage) ? percentage : 100 };
    }
    return { trend: 'stable', percentage: 0 };
  };

  const violationTrend = getViolationTrend();

  if (hasError) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-red-800 mb-2">Dashboard Error</h2>
          <p className="text-red-600 mb-4">There was an issue loading the dashboard data.</p>
          <button 
            onClick={() => {
              setHasError(false);
              loadDashboardData();
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Violations"
          value={stats.totalViolations}
          icon={AlertTriangle}
          trend={violationTrend.trend as 'up' | 'down' | 'stable'}
          trendValue={violationTrend.percentage}
          trendLabel="vs yesterday"
          color="red"
        />
        <MetricCard
          title="Active Alerts"
          value={stats.activeAlerts}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Active Cameras"
          value={stats.activeCameras}
          icon={Video}
          color="blue"
        />
        <MetricCard
          title="Workers Monitored"
          value={stats.workersMonitored}
          icon={Users}
          color="green"
        />
      </div>

      {/* Safety Score */}
      <div className="mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Safety Score</h2>
            <Shield className="h-6 w-6 text-primary-600" />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Safety Rating</span>
                <span className="text-2xl font-bold text-primary-600">{stats.safetyScore}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${stats.safetyScore}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Based on compliance, incident rates, and safety measures
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Safety Violations</h2>
            <SafetyChart />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Alerts</h2>
            <RecentAlerts />
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">System Status</h2>
          <SystemStatus />
        </div>
      </div>
    </div>
  );
}
