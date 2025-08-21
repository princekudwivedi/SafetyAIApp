'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { BarChart3, Download, Calendar, Filter, TrendingUp, TrendingDown, AlertTriangle, Camera, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface ReportData {
  period: string;
  violations: number;
  alerts: number;
  safetyScore: number;
}

const weeklyData: ReportData[] = [
  { period: 'Week 1', violations: 45, alerts: 52, safetyScore: 78 },
  { period: 'Week 2', violations: 38, alerts: 41, safetyScore: 82 },
  { period: 'Week 3', violations: 42, alerts: 48, safetyScore: 79 },
  { period: 'Week 4', violations: 35, alerts: 39, safetyScore: 85 },
  { period: 'Week 5', violations: 28, alerts: 32, safetyScore: 88 },
  { period: 'Week 6', violations: 31, alerts: 35, safetyScore: 86 },
  { period: 'Week 7', violations: 25, alerts: 28, safetyScore: 90 },
  { period: 'Week 8', violations: 22, alerts: 25, safetyScore: 92 },
];

const violationTypes = [
  { name: 'No Hard Hat', value: 35, color: '#ef4444' },
  { name: 'No Safety Vest', value: 25, color: '#f59e0b' },
  { name: 'Proximity Violation', value: 20, color: '#3b82f6' },
  { name: 'Unauthorized Access', value: 15, color: '#8b5cf6' },
  { name: 'Equipment Misuse', value: 5, color: '#10b981' },
];

const cameraPerformance = [
  { camera: 'CAM_01', violations: 12, uptime: 98, alerts: 15 },
  { camera: 'CAM_02', violations: 8, uptime: 95, alerts: 10 },
  { camera: 'CAM_03', violations: 15, uptime: 87, alerts: 18 },
  { camera: 'CAM_04', violations: 5, uptime: 92, alerts: 7 },
  { camera: 'CAM_05', violations: 18, uptime: 89, alerts: 22 },
];

export function ReportsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [selectedPeriod, setSelectedPeriod] = useState('8');
  const [selectedReport, setSelectedReport] = useState('overview');
  const [hasError, setHasError] = useState(false);
  const [chartData, setChartData] = useState({
    weeklyData: weeklyData,
    violationTypes: violationTypes,
    cameraPerformance: cameraPerformance
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

  const validatedWeeklyData = validateChartData(weeklyData);
  const validatedViolationTypes = validateChartData(violationTypes);
  const validatedCameraPerformance = validateChartData(cameraPerformance);

  useEffect(() => {
    try {
      // Process chart data to ensure proper formatting
      const processedWeeklyData = validatedWeeklyData.map(item => ({
        ...item,
        violations: Number(item.violations) || 0,
        alerts: Number(item.alerts) || 0,
        safetyScore: Number(item.safetyScore) || 0
      }));

      const processedViolationTypes = validatedViolationTypes.map(item => ({
        ...item,
        value: Number(item.value) || 0
      }));

      const processedCameraPerformance = validatedCameraPerformance.map(item => ({
        ...item,
        violations: Number(item.violations) || 0,
        uptime: Number(item.uptime) || 0,
        alerts: Number(item.alerts) || 0
      }));

      setChartData({
        weeklyData: processedWeeklyData,
        violationTypes: processedViolationTypes,
        cameraPerformance: processedCameraPerformance
      });

      // Subscribe to real-time updates for reports
      const unsubscribeStats = subscribe('dashboard_stats', (data) => {
        if (data.type === 'dashboard_stats') {
          // Update report data in real-time
          console.log('Received updated stats:', data.payload);
        }
      });

      return () => {
        unsubscribeStats();
      };
    } catch (error) {
      console.error('Reports page initialization error:', error);
      setHasError(true);
    }
  }, [subscribe]);

  const handleExport = (format: 'csv' | 'json' | 'pdf') => {
    // In a real app, this would call the API to export data
    console.log(`Exporting ${selectedReport} report in ${format} format`);
    // For now, just show a success message
    alert(`Exporting ${selectedReport} report in ${format.toUpperCase()} format...`);
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
  const violationTrend = getTrendIndicator(currentWeek.violations, previousWeek.violations);
  const safetyTrend = getTrendIndicator(currentWeek.safetyScore, previousWeek.safetyScore);

  if (hasError) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-red-800 mb-2">Reports Error</h2>
          <p className="text-red-600 mb-4">There was an issue loading the reports data.</p>
          <button 
            onClick={() => {
              setHasError(false);
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Ensure we have valid data before rendering charts
  if (!chartData.weeklyData.length || !chartData.violationTypes.length) {
    return (
      <div className="py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <h2 className="text-lg font-medium text-yellow-800 mb-2">No Data Available</h2>
          <p className="text-yellow-600 mb-4">Chart data is not available at the moment.</p>
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

            <button
              onClick={() => handleExport('csv')}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handleExport('pdf')}
              className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export PDF</span>
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
              <p className="text-2xl font-bold text-red-600">{currentWeek.violations}</p>
              <div className="flex items-center text-xs">
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
              <p className="text-2xl font-bold text-blue-600">{currentWeek.safetyScore}%</p>
              <div className="flex items-center text-xs">
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
              <p className="text-2xl font-bold text-yellow-600">5</p>
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
              <p className="text-sm font-medium text-gray-600">Workers Monitored</p>
              <p className="text-2xl font-bold text-green-600">45</p>
              <p className="text-xs text-gray-500">+3 this week</p>
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
              <LineChart data={chartData.weeklyData}>
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
                  data={chartData.violationTypes}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => {
                    if (percent === undefined || isNaN(percent)) return name;
                    return `${name} ${(percent * 100).toFixed(0)}%`;
                  }}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.violationTypes.map((entry, index) => (
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
              {chartData.cameraPerformance.map((camera) => (
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
      <div className="mt-6">
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
      </div>
    </div>
  );
}
