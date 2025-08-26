'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
} from 'recharts';
import { DashboardStats, AlertsSummary } from '@/lib/api/dashboard';

interface ChartData {
  weeklyData: Array<{ day: string; violations: number; alerts: number }>;
  violationTypes: Array<{ type: string; count: number; percentage: number }>;
}

interface SafetyChartProps {
  dashboardData: DashboardStats | null;
  alertsSummary: AlertsSummary | null;
  isLoading: boolean;
}

// Validate data to ensure no NaN values
const validateData = (data: any[]) => {
  return data.filter(item => {
    return Object.values(item).every(value => 
      value !== null && 
      value !== undefined && 
      !isNaN(Number(value)) && 
      isFinite(Number(value))
    );
  });
};

export function SafetyChart({ dashboardData, alertsSummary, isLoading }: SafetyChartProps) {
  const [hasError, setHasError] = useState(false);

  // Process chart data from props using useMemo to prevent unnecessary recalculations
  const chartData = useMemo((): ChartData => {
    console.log('🔄 Processing chart data:', { dashboardData, alertsSummary }); // Debug log
    
    if (!dashboardData || !alertsSummary) {
      console.log('❌ Missing data:', { hasDashboardData: !!dashboardData, hasAlertsSummary: !!alertsSummary });
      return {
        weeklyData: [],
        violationTypes: []
      };
    }

    try {
      // Transform weekly data
      const weeklyData = dashboardData.weekly_data.map((item) => ({
        day: item.day,
        violations: Number(item.alerts) || 0,
        alerts: Number(item.alerts) || 0
      }));
      
      console.log('📊 Weekly data transformed:', weeklyData); // Debug log
      
      // Transform violation types - use alerts_by_status instead of alerts_by_severity for better data
      const violationTypes = alertsSummary.alerts_by_status.map(item => ({
        type: item.status,
        count: Number(item.count) || 0,
        percentage: dashboardData.total_alerts > 0 ? (Number(item.count) / dashboardData.total_alerts) * 100 : 0
      }));
      
      console.log('🚨 Violation types transformed:', violationTypes); // Debug log
      
      const validatedWeeklyData = validateData(weeklyData);
      const validatedViolationTypes = validateData(violationTypes);
      
      console.log('✅ Validated data:', { weeklyData: validatedWeeklyData, violationTypes: validatedViolationTypes }); // Debug log
      
      return {
        weeklyData: validatedWeeklyData,
        violationTypes: validatedViolationTypes
      };
    } catch (error) {
      console.error('Error processing chart data:', error);
      setHasError(true);
      return {
        weeklyData: [],
        violationTypes: []
      };
    }
  }, [dashboardData, alertsSummary]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading chart data...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Chart data temporarily unavailable</p>
        </div>
      </div>
    );
  }

  // Ensure we have valid data before rendering charts
  if (!chartData.weeklyData.length || !chartData.violationTypes.length) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Chart data is loading...</p>
          <div className="mt-4 text-sm text-gray-400">
            <p>Weekly data: {chartData.weeklyData.length} days</p>
            <p>Violation types: {chartData.violationTypes.length} categories</p>
            <p>Dashboard data: {dashboardData ? 'Loaded' : 'Not loaded'}</p>
            <p>Alerts summary: {alertsSummary ? 'Loaded' : 'Not loaded'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Trend */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Trend</h3>
        <div style={{ width: '100%', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData.weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="violations"
                stroke="#dc2626"
                strokeWidth={2}
                dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="alerts"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center space-x-6 mt-2">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Violations</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Alerts</span>
          </div>
        </div>
      </div>

      {/* Violation Types Distribution */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Violation Types Distribution</h3>
        <div style={{ width: '100%', height: '200px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData.violationTypes}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">
            {alertsSummary?.weekly_violations || chartData.weeklyData.reduce((sum, item) => sum + item.violations, 0)}
          </p>
          <p className="text-sm text-gray-600">Weekly Violations</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">
            {chartData.violationTypes.reduce((sum, item) => sum + item.count, 0)}
          </p>
          <p className="text-sm text-gray-600">Active Alerts</p>
        </div>
      </div>
    </div>
  );
}
