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
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';
import { DashboardStats, AlertsSummary } from '@/lib/api/dashboard';
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, BarChart3, Activity, Clock, Target } from 'lucide-react';

interface ChartData {
  weeklyData: Array<{ day: string; violations: number; alerts: number }>;
  violationTypes: Array<{ type: string; count: number; percentage: number }>;
  severityData: Array<{ severity: string; count: number; percentage: number }>;
  statusData: Array<{ status: string; count: number; percentage: number }>;
}

interface SafetyChartProps {
  dashboardData: DashboardStats | null;
  alertsSummary: AlertsSummary | null;
  isLoading: boolean;
}

// Custom tooltip component for better styling
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label || 'Unknown'}</p>
        {payload.map((entry: any, index: number) => {
          // Ensure value is a valid number
          const value = isNaN(entry.value) ? 0 : entry.value;
          const name = entry.name || 'Unknown';
          
          return (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {name}: {value}
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};



// Color palette for charts
const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#f59e0b',
  danger: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#06b6d4',
};

const VIOLATION_COLORS = [
  '#ef4444', // red
  '#f59e0b', // yellow
  '#10b981', // green
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#f97316', // orange
];

const SEVERITY_COLORS = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#10b981',
  unknown: '#6b7280',
};

const STATUS_COLORS = {
  new: '#ef4444',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  unknown: '#6b7280',
};

export function SafetyChart({ dashboardData, alertsSummary, isLoading }: SafetyChartProps) {
  const [hasError, setHasError] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'violationTypes' | 'status' | 'severity' | 'summary'>('weekly');



  // Process chart data from props using useMemo to prevent unnecessary recalculations
  const chartData = useMemo((): ChartData => {
    // Process data even if only one API is available
    let weeklyData: any[] = [];
    let violationTypes: any[] = [];
    let severityData: any[] = [];
    let statusData: any[] = [];

    try {
      // Transform weekly data from dashboard API
      if (dashboardData?.weekly_data) {
        weeklyData = dashboardData.weekly_data.map((item: any) => ({
          day: item.day || 'Unknown',
          violations: Number(item.alerts) || 0,
          alerts: Number(item.alerts) || 0
        }));
      }
      
                    // Transform violation types from dashboard API
        if (dashboardData?.violation_types) {
          violationTypes = dashboardData.violation_types.map((item: any) => {
            const count = Number(item.count) || 0;
            const totalAlerts = Number(dashboardData.total_alerts) || 0;
            const percentage = totalAlerts > 0 ? (count / totalAlerts) * 100 : 0;
            
            // Ensure all values are valid numbers and handle empty/null _id
            const typeId = item._id || 'Uncategorized';
            const processedItem = {
              type: typeId === 'Uncategorized' ? 'Uncategorized' : typeId.charAt(0).toUpperCase() + typeId.slice(1).replace(/_/g, ' '),
              count: isNaN(count) ? 0 : count,
              percentage: isNaN(percentage) ? 0 : percentage
            };
            
            return processedItem;
          }).filter(item => item.count > 0 && !isNaN(item.count)); // Only include items with valid counts
        }
      
             // Transform severity data from alerts summary
       if (alertsSummary?.alerts_by_severity) {
         severityData = alertsSummary.alerts_by_severity.map((item: any) => {
           const count = Number(item.count) || 0;
           const totalAlerts = Number(dashboardData?.total_alerts) || 0;
           const percentage = totalAlerts > 0 ? (count / totalAlerts) * 100 : 0;
           
           // Handle empty/null severity values
           const severityValue = item.severity || 'Uncategorized';
           return {
             severity: severityValue === 'Uncategorized' ? 'Uncategorized' : severityValue.charAt(0).toUpperCase() + severityValue.slice(1).replace(/_/g, ' '),
             count: isNaN(count) ? 0 : count,
             percentage: isNaN(percentage) ? 0 : percentage
           };
         }).filter(item => item.count > 0);
       }
      
             // Transform status data from alerts summary
       if (alertsSummary?.alerts_by_status) {
         statusData = alertsSummary.alerts_by_status.map((item: any) => {
           const count = Number(item.count) || 0;
           const totalAlerts = Number(dashboardData?.total_alerts) || 0;
           const percentage = totalAlerts > 0 ? (count / totalAlerts) * 100 : 0;
           
           // Handle empty/null status values
           const statusValue = item.status || 'Uncategorized';
           return {
             status: statusValue === 'Uncategorized' ? 'Uncategorized' : statusValue.charAt(0).toUpperCase() + statusValue.slice(1).replace(/_/g, ' '),
             count: isNaN(count) ? 0 : count,
             percentage: isNaN(percentage) ? 0 : percentage
           };
         }).filter(item => item.count > 0);
       }
      
      return {
        weeklyData: weeklyData,
        violationTypes: violationTypes,
        severityData: severityData,
        statusData: statusData
      };
    } catch (error) {
      console.error('Error processing chart data:', error);
      setHasError(true);
      return {
        weeklyData: [],
        violationTypes: [],
        severityData: [],
        statusData: []
      };
    }
  }, [dashboardData, alertsSummary]);

  // Calculate weekly statistics
  const weeklyStats = useMemo(() => {
    if (!chartData.weeklyData.length) return null;
    
    const totalViolations = chartData.weeklyData.reduce((sum, item) => sum + item.violations, 0);
    const avgViolations = totalViolations / chartData.weeklyData.length;
    const maxViolations = Math.max(...chartData.weeklyData.map(item => item.violations));
    const minViolations = Math.min(...chartData.weeklyData.map(item => item.violations));
    
    // Calculate trend (comparing last 3 days vs first 3 days)
    const recentDays = chartData.weeklyData.slice(-3);
    const earlierDays = chartData.weeklyData.slice(0, 3);
    const recentAvg = recentDays.reduce((sum, item) => sum + item.violations, 0) / recentDays.length;
    const earlierAvg = earlierDays.reduce((sum, item) => sum + item.violations, 0) / earlierDays.length;
    
    let trend = 'stable';
    let trendPercentage = 0;
    
    if (earlierAvg > 0) {
      const change = ((recentAvg - earlierAvg) / earlierAvg) * 100;
      trendPercentage = Math.abs(Math.round(change));
      trend = change > 0 ? 'up' : change < 0 ? 'down' : 'stable';
    }
    
    return {
      totalViolations,
      avgViolations: Math.round(avgViolations * 10) / 10,
      maxViolations,
      minViolations,
      trend,
      trendPercentage,
      recentAvg: Math.round(recentAvg * 10) / 10,
      earlierAvg: Math.round(earlierAvg * 10) / 10,
    };
  }, [chartData.weeklyData]);

  // Calculate alerts summary statistics
  const alertsStats = useMemo(() => {
    if (!alertsSummary) return null;
    
    const totalAlerts = chartData.statusData.reduce((sum, item) => sum + item.count, 0);
    const highSeverityCount = chartData.severityData.find(item => 
      item.severity.toLowerCase().includes('high'))?.count || 0;
    const newAlertsCount = chartData.statusData.find(item => 
      item.status.toLowerCase().includes('new'))?.count || 0;
    
    return {
      totalAlerts,
      highSeverityCount,
      newAlertsCount,
      weeklyViolations: alertsSummary.weekly_violations || 0,
      recentAlertsCount: alertsSummary.recent_alerts?.length || 0
    };
  }, [alertsSummary, chartData.statusData, chartData.severityData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading safety violation data...</p>
          <p className="text-sm text-gray-400 mt-2">Please wait while we fetch the latest statistics</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Chart data temporarily unavailable</p>
          <p className="text-sm text-gray-400 mt-2">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  // Always show the component, even if some data is missing

  return (
    <div className="space-y-4">
      {/* Component Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Safety Violations Analytics</h2>
          <p className="text-gray-600 mt-1">Comprehensive analysis of safety violations and alerts</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>Real-time data</span>
        </div>
      </div>
      
      {/* No Data Warning */}
      {!dashboardData && !alertsSummary && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
          <p className="text-yellow-800 font-medium">⚠️ No data available</p>
          <p className="text-yellow-600 text-sm mt-1">Both Dashboard API and Alerts Summary API are not loaded</p>
        </div>
      )}
      
      {/* Partial Data Warning */}
      {(dashboardData && !alertsSummary) || (!dashboardData && alertsSummary) ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <p className="text-blue-800 font-medium">ℹ️ Partial data available</p>
          <p className="text-blue-600 text-sm mt-1">
            {dashboardData && !alertsSummary ? 'Dashboard API loaded, Alerts Summary missing' : 'Alerts Summary loaded, Dashboard API missing'}
          </p>
        </div>
      ) : null}
      
      {/* Tab Navigation */}
      <div className="bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'weekly'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Weekly Trend
          </button>
          <button
            onClick={() => setActiveTab('violationTypes')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'violationTypes'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Violation Types
          </button>
          <button
            onClick={() => setActiveTab('status')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'status'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Status
          </button>
          <button
            onClick={() => setActiveTab('severity')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'severity'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Target className="w-4 h-4 inline mr-2" />
            Severity
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 px-4 py-3 text-sm font-medium rounded-md transition-all duration-200 ${
              activeTab === 'summary'
                ? 'bg-primary-50 text-primary-700 border border-primary-200 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Activity className="w-4 h-4 inline mr-2" />
            Summary
          </button>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {activeTab === 'weekly' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Weekly Safety Violations Trend</h3>
            {weeklyStats && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  {weeklyStats.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                  ) : weeklyStats.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                  ) : (
                    <div className="w-4 h-4 bg-gray-400 rounded-full mr-1" />
                  )}
                  <span className={`font-medium ${
                    weeklyStats.trend === 'up' ? 'text-red-600' : 
                    weeklyStats.trend === 'down' ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {weeklyStats.trend === 'stable' ? 'Stable' : `${weeklyStats.trendPercentage}% ${weeklyStats.trend}`}
                  </span>
                </div>
              </div>
            )}
          </div>
          
                     {chartData.weeklyData.length > 0 ? (
             <>
                               <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData.weeklyData}>
                        <defs>
                          <linearGradient id="violationsGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.danger} stopOpacity={0.8}/>
                            <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="day" 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="violations"
                          stroke={CHART_COLORS.danger}
                          strokeWidth={3}
                          fill="url(#violationsGradient)"
                          dot={{ fill: CHART_COLORS.danger, strokeWidth: 2, r: 5 }}
                          activeDot={{ r: 8, stroke: CHART_COLORS.danger, strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
               
                                                {/* Weekly Statistics Cards */}
                 {weeklyStats && (
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                     <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6 text-center shadow-sm">
                       <p className="text-3xl font-bold text-red-600">{weeklyStats.totalViolations}</p>
                       <p className="text-sm font-medium text-red-700">Total Violations</p>
                     </div>
                     <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-6 text-center shadow-sm">
                       <p className="text-3xl font-bold text-orange-600">{weeklyStats.avgViolations}</p>
                       <p className="text-sm font-medium text-orange-700">Daily Average</p>
                     </div>
                     <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-6 text-center shadow-sm">
                       <p className="text-3xl font-bold text-yellow-600">{weeklyStats.maxViolations}</p>
                       <p className="text-sm font-medium text-yellow-700">Peak Day</p>
                     </div>
                     <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 text-center shadow-sm">
                       <p className="text-3xl font-bold text-green-600">{weeklyStats.minViolations}</p>
                       <p className="text-sm font-medium text-green-700">Best Day</p>
                     </div>
                   </div>
                 )}
             </>
           ) : (
                           <div className="text-center py-8">
                <p className="text-gray-500">Weekly data not available</p>
                <p className="text-sm text-gray-400 mt-2">Please check the dashboard API for weekly_data</p>
              </div>
           )}
        </div>
      )}

            {/* Violation Types Distribution */}
      {activeTab === 'violationTypes' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Violation Types Distribution</h3>
          
          
          
          {chartData.violationTypes.length > 0 ? (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Violation Count by Type</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.violationTypes}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="type" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                                                 <Bar 
                           dataKey="count" 
                           fill={CHART_COLORS.primary}
                           radius={[4, 4, 0, 0]}
                           barSize={40}
                         />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                                 {/* Pie Chart */}
                 <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                   <h4 className="text-lg font-medium text-gray-900 mb-4">Distribution by Percentage</h4>
                   
                   <div className="w-full h-80">
                     {chartData.violationTypes.length > 0 ? (
                       <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                           <Pie
                             data={chartData.violationTypes}
                             cx="50%"
                             cy="50%"
                             labelLine={false}
                             label={({ type, percentage }) => `${type}: ${percentage.toFixed(1)}%`}
                             outerRadius={100}
                             fill="#8884d8"
                             dataKey="count"
                             nameKey="type"
                           >
                             {chartData.violationTypes.map((entry, index) => (
                               <Cell key={`cell-${index}`} fill={VIOLATION_COLORS[index % VIOLATION_COLORS.length]} />
                             ))}
                           </Pie>
                           <Tooltip content={<CustomTooltip />} />
                         </PieChart>
                       </ResponsiveContainer>
                     ) : (
                       <div className="flex items-center justify-center h-full text-gray-500">
                         <p>No data available for pie chart</p>
                       </div>
                     )}
                   </div>
                 </div>
              </div>
           ) : (
                           <div className="text-center py-8">
                <p className="text-gray-500">Violation types data not available</p>
                <p className="text-sm text-gray-400 mt-2">Please check the dashboard API for violation_types</p>
              </div>
           )}
        </div>
      )}

      {/* Status Distribution */}
      {activeTab === 'status' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Status Distribution</h3>
                     {chartData.statusData.length > 0 ? (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bar Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Alert Count by Status</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.statusData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="status" 
                          angle={-45} 
                          textAnchor="end" 
                          height={80}
                          tick={{ fontSize: 11, fill: '#6b7280' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                                                 <Bar 
                           dataKey="count" 
                           fill={CHART_COLORS.info}
                           radius={[4, 4, 0, 0]}
                           barSize={40}
                         />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Status Distribution</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                                                     label={({ status, percentage }) => {
                             // Ensure percentage is a valid number before calling toFixed
                             const validPercentage = isNaN(percentage) ? 0 : percentage;
                             return `${status || 'Uncategorized'}: ${validPercentage.toFixed(1)}%`;
                           }}
                           outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                                                     {chartData.statusData.map((entry, index) => {
                             const status = entry.status.toLowerCase();
                             // Handle uncategorized status with a neutral color
                             const color = status === 'uncategorized' ? '#6b7280' : STATUS_COLORS[status as keyof typeof STATUS_COLORS] || VIOLATION_COLORS[index % VIOLATION_COLORS.length];
                             return <Cell key={`cell-${index}`} fill={color} />;
                           })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
           ) : (
                           <div className="text-center py-8">
                <p className="text-gray-500">Status data not available</p>
                <p className="text-sm text-gray-400 mt-2">Please check the alerts summary API for alerts_by_status</p>
              </div>
           )}
        </div>
      )}

      {/* Severity Distribution */}
      {activeTab === 'severity' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Severity Distribution</h3>
                     {chartData.severityData.length > 0 ? (
                           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composed Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Count & Percentage by Severity</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData.severityData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                        <XAxis 
                          dataKey="severity" 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#e5e7eb' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                                                 <Bar 
                           dataKey="count" 
                           fill={CHART_COLORS.warning}
                           radius={[4, 4, 0, 0]}
                           barSize={40}
                         />
                        <Line 
                          type="monotone" 
                          dataKey="percentage" 
                          stroke={CHART_COLORS.danger} 
                          strokeWidth={2}
                          dot={{ fill: CHART_COLORS.danger, strokeWidth: 2, r: 4 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Severity Distribution</h4>
                  <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.severityData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                                                     label={({ severity, percentage }) => {
                             // Ensure percentage is a valid number before calling toFixed
                             const validPercentage = isNaN(percentage) ? 0 : percentage;
                             return `${severity || 'Uncategorized'}: ${validPercentage.toFixed(1)}%`;
                           }}
                           outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                                                     {chartData.severityData.map((entry, index) => {
                             const severity = entry.severity.toLowerCase();
                             // Handle uncategorized severity with a neutral color
                             const color = severity === 'uncategorized' ? '#6b7280' : SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || VIOLATION_COLORS[index % VIOLATION_COLORS.length];
                             return <Cell key={`cell-${index}`} fill={color} />;
                           })}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
           ) : (
                           <div className="text-center py-8">
                <p className="text-gray-500">Severity data not available</p>
                <p className="text-sm text-gray-400 mt-2">Please check the alerts summary API for alerts_by_severity</p>
              </div>
           )}
        </div>
      )}

      {/* Summary View */}
      {activeTab === 'summary' && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alerts Summary Overview</h3>
          <div className="space-y-4">
                         {/* Key Metrics */}
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-lg p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-red-700">Weekly Violations</p>
                     <p className="text-3xl font-bold text-red-900">
                       {alertsStats?.weeklyViolations || 0}
                     </p>
                   </div>
                   <AlertTriangle className="w-10 h-10 text-red-500" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-blue-700">High Severity</p>
                     <p className="text-3xl font-bold text-blue-900">
                       {alertsStats?.highSeverityCount || 0}
                     </p>
                   </div>
                   <Target className="w-10 h-10 text-blue-500" />
                 </div>
               </div>
               
               <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-6 shadow-sm">
                 <div className="flex items-center justify-between">
                   <div>
                     <p className="text-sm font-medium text-green-700">New Alerts</p>
                     <p className="text-3xl font-bold text-green-900">
                       {alertsStats?.newAlertsCount || 0}
                     </p>
                   </div>
                   <Clock className="w-10 h-10 text-green-500" />
                 </div>
               </div>
             </div>
            
             
             {/* Weekly Breakdown */}
             <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
               <h4 className="text-lg font-medium text-gray-900 mb-4">Daily Breakdown</h4>
               <div className="space-y-3">
                 {chartData.weeklyData.map((day, index) => (
                   <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                     <span className="text-sm font-medium text-gray-700">{day.day}</span>
                     <div className="flex items-center space-x-3">
                       <div className="w-24 bg-gray-200 rounded-full h-2">
                         <div
                           className="bg-red-500 h-2 rounded-full transition-all duration-300"
                           style={{ 
                             width: `${Math.max(5, (day.violations / Math.max(...chartData.weeklyData.map(d => d.violations))) * 100)}%` 
                           }}
                         ></div>
                       </div>
                       <span className="text-sm font-bold text-gray-900 min-w-[2rem] text-right">
                         {day.violations}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
