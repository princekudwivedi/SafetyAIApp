'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { BarChart3, Download, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Camera, Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReports } from '@/hooks/use-reports';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export function ReportsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [selectedPeriod, setSelectedPeriod] = useState('8');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [selectedSiteId, setSelectedSiteId] = useState<string | undefined>();
  
  // Use the reports hook to fetch dynamic data
  const { 
    overview, 
    violations, 
    cameras, 
    trends,
    loading, 
    error, 
    exportReport, 
    refreshAll 
  } = useReports({ 
    period: selectedPeriod, 
    siteId: selectedSiteId 
  });

  // Validate data to ensure no NaN or undefined values
  const validateChartData = (data: any[]) => {
    return data.filter(item => {
      return Object.values(item).every(value => 
        value !== null && 
        value !== undefined && 
        !isNaN(Number(value)) && 
        isFinite(Number(value))
      );
    });
  };

  // Get validated data from API or use empty arrays as fallback
  const weeklyData = overview?.weeklyData || [];
  const violationTypes = overview?.violationTypes || [];
  const cameraPerformance = overview?.cameraPerformance || [];
  
  const validatedWeeklyData = validateChartData(weeklyData);
  const validatedViolationTypes = validateChartData(violationTypes);
  const validatedCameraPerformance = validateChartData(cameraPerformance);

  useEffect(() => {
    // Subscribe to real-time updates for reports
    const unsubscribeStats = subscribe('dashboard_stats', (data) => {
      if (data.type === 'dashboard_stats') {
        // Update report data in real-time
        console.log('Received updated stats:', data.payload);
        refreshAll(); // Refresh all data when new stats arrive
      }
    });

    return () => {
      unsubscribeStats();
    };
  }, [subscribe, refreshAll]);

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    try {
      exportReport(selectedReport, format);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return { trend: 'up', percentage: Math.round(((current - previous) / previous) * 100) };
    } else if (current < previous) {
      return { trend: 'down', percentage: Math.round(((previous - current) / previous) * 100) };
    }
    return { trend: 'stable', percentage: 0 };
  };

  const currentWeek = weeklyData[weeklyData.length - 1];
  const previousWeek = weeklyData[weeklyData.length - 2];
  
  // Only calculate trends if we have data
  const violationTrend = currentWeek && previousWeek 
    ? getTrendIndicator(currentWeek.violations, previousWeek.violations)
    : { trend: 'stable', percentage: 0 };
    
  const safetyTrend = currentWeek && previousWeek 
    ? getTrendIndicator(currentWeek.safetyScore, previousWeek.safetyScore)
    : { trend: 'stable', percentage: 0 };

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-red-800 mb-2">Reports Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => refreshAll()}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Show loading state
  if (loading && !overview) {
    return (
      <div className="py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-blue-800 mb-2">Loading Reports</h2>
          <p className="text-blue-600 mb-4">Please wait while we fetch your reports data...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  // Ensure we have valid data before rendering charts
  if (!validatedWeeklyData.length || !validatedViolationTypes.length) {
    return (
      <div className="py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">No Data Available</h2>
          <p className="text-yellow-600 mb-4">Chart data is not available at the moment.</p>
          <button 
            onClick={() => refreshAll()}
            className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
          >
            Refresh Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="mt-2 text-gray-600">
          Comprehensive safety reports, analytics, and insights
        </p>
      </div>

      {/* Report Type Selector */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Report Type</h2>
            <div className="flex items-center space-x-2">
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="overview">Overview</option>
                <option value="violations">Violations Analysis</option>
                <option value="cameras">Camera Performance</option>
                <option value="trends">Trends & Forecasting</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-center space-x-4">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="4">Last 4 Weeks</option>
              <option value="8">Last 8 Weeks</option>
              <option value="12">Last 12 Weeks</option>
              <option value="26">Last 6 Months</option>
            </select>

            <select
              value={selectedSiteId || ''}
              onChange={(e) => setSelectedSiteId(e.target.value || undefined)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="">All Sites</option>
              <option value="SITE_001">Downtown Construction</option>
              <option value="SITE_002">Highway Bridge</option>
              <option value="SITE_003">Shopping Mall</option>
              <option value="SITE_004">Industrial Warehouse</option>
            </select>

            <button
              onClick={() => refreshAll()}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Violations</p>
              <p className="text-2xl font-bold text-red-600">{overview?.keyMetrics.totalViolations || 0}</p>
                             <div className="flex items-center text-xs">
                 {currentWeek && previousWeek ? (
                   <>
                     {violationTrend.trend === 'up' ? (
                       <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                     ) : violationTrend.trend === 'down' ? (
                       <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                     ) : null}
                     <span className={cn(
                       violationTrend.trend === 'up' ? 'text-red-500' : 
                       violationTrend.trend === 'down' ? 'text-green-500' : 'text-gray-500'
                     )}>
                       {violationTrend.trend === 'up' ? '+' : ''}{violationTrend.percentage}% vs last week
                     </span>
                   </>
                 ) : (
                   <span className="text-gray-500">No trend data available</span>
                 )}
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Safety Score</p>
              <p className="text-2xl font-bold text-blue-600">{overview?.keyMetrics.overallSafetyScore || 0}%</p>
                             <div className="flex items-center text-xs">
                 {currentWeek && previousWeek ? (
                   <>
                     {safetyTrend.trend === 'up' ? (
                       <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                     ) : safetyTrend.trend === 'down' ? (
                       <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                     ) : null}
                     <span className={cn(
                       safetyTrend.trend === 'up' ? 'text-green-500' : 
                       safetyTrend.trend === 'down' ? 'text-red-500' : 'text-gray-500'
                     )}>
                       {safetyTrend.trend === 'up' ? '+' : ''}{safetyTrend.percentage}% vs last week
                     </span>
                   </>
                 ) : (
                   <span className="text-gray-500">No trend data available</span>
                 )}
               </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Camera className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Cameras</p>
              <p className="text-2xl font-bold text-yellow-600">{overview?.keyMetrics.activeCameras || 0}</p>
              <p className="text-xs text-gray-500">98% uptime average</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-green-600">{overview?.keyMetrics.totalAlerts || 0}</p>
              <p className="text-xs text-gray-500">This period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Trends */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Safety Trends</h3>
                  <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={validatedWeeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="violations"
                stroke="#ef4444"
                strokeWidth={2}
                name="Violations"
              />
              <Line
                type="monotone"
                dataKey="safetyScore"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Safety Score"
                yAxisId={1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        </div>

        {/* Violation Types Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Violation Types Distribution</h3>
                  <div style={{ width: '100%', height: '300px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={validatedViolationTypes}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name: string; percent?: number }) => {
                  if (percent === undefined || isNaN(percent)) return name;
                  return `${name} ${(percent * 100).toFixed(0)}%`;
                }}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {validatedViolationTypes.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        </div>
      </div>

      {/* Camera Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Camera Performance Analysis</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts Generated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validatedCameraPerformance.map((camera: any) => (
                <tr key={camera.camera} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {camera.camera}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {camera.violations}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {camera.uptime}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {camera.alerts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-primary-600 h-2 rounded-full"
                          style={{ width: `${(camera.uptime / 100) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">
                        {camera.uptime >= 95 ? 'Excellent' : 
                         camera.uptime >= 90 ? 'Good' : 
                         camera.uptime >= 85 ? 'Fair' : 'Poor'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Connection Status */}
      <div className="mt-6 flex items-center space-x-4">
        <div className={cn(
          'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
          isConnected 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        )}>
          <div className={cn(
            'w-2 h-2 rounded-full mr-2',
            isConnected ? 'bg-green-400' : 'bg-red-400'
          )} />
          {isConnected ? 'WebSocket Connected' : 'WebSocket Disconnected'}
        </div>
        
        {loading && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </div>
        )}
      </div>
    </div>
  );
}
