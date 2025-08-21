'use client';

import React from 'react';
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

const weeklyData = [
  { day: 'Mon', violations: 8, alerts: 12 },
  { day: 'Tue', violations: 5, alerts: 8 },
  { day: 'Wed', violations: 12, alerts: 15 },
  { day: 'Thu', violations: 7, alerts: 10 },
  { day: 'Fri', violations: 15, alerts: 18 },
  { day: 'Sat', violations: 3, alerts: 5 },
  { day: 'Sun', violations: 2, alerts: 3 },
];

const violationTypes = [
  { type: 'No Hard Hat', count: 45, percentage: 28.8 },
  { type: 'No Safety Vest', count: 32, percentage: 20.5 },
  { type: 'Proximity Violation', count: 28, percentage: 17.9 },
  { type: 'Unauthorized Access', count: 25, percentage: 16.0 },
  { type: 'Equipment Misuse', count: 18, percentage: 11.5 },
  { type: 'Other', count: 8, percentage: 5.3 },
];

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

const validatedWeeklyData = validateData(weeklyData);
const validatedViolationTypes = validateData(violationTypes);

export function SafetyChart() {
  const [hasError, setHasError] = React.useState(false);
  const [chartData, setChartData] = React.useState({
    weeklyData: validatedWeeklyData,
    violationTypes: validatedViolationTypes
  });

  React.useEffect(() => {
    // Ensure data is properly formatted for charts
    try {
      console.log('Processing chart data:', { validatedWeeklyData, validatedViolationTypes });
      
      const processedWeeklyData = validatedWeeklyData.map(item => ({
        ...item,
        violations: Number(item.violations) || 0,
        alerts: Number(item.alerts) || 0
      }));

      const processedViolationTypes = validatedViolationTypes.map(item => ({
        ...item,
        count: Number(item.count) || 0,
        percentage: Number(item.percentage) || 0
      }));

      console.log('Processed chart data:', { processedWeeklyData, processedViolationTypes });

      setChartData({
        weeklyData: processedWeeklyData,
        violationTypes: processedViolationTypes
      });
    } catch (error) {
      console.error('Error processing chart data:', error);
      setHasError(true);
    }
  }, []);

  React.useEffect(() => {
    const handleError = (error: ErrorEvent) => {
      console.error('Chart error:', error);
      setHasError(true);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Chart data temporarily unavailable</p>
          <button 
            onClick={() => setHasError(false)}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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
      <div className="space-y-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No chart data available</p>
        </div>
      </div>
    );
  }

  // Fallback chart display if recharts fails
  const renderFallbackChart = () => (
    <div className="space-y-6">
      {/* Weekly Trend Fallback */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Trend</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-end justify-between h-32 space-x-2">
            {chartData.weeklyData.map((item, index) => (
              <div key={index} className="flex flex-col items-center">
                <div 
                  className="w-8 bg-red-500 rounded-t"
                  style={{ height: `${(item.violations / 15) * 100}px` }}
                ></div>
                <div 
                  className="w-8 bg-yellow-500 rounded-t mt-1"
                  style={{ height: `${(item.alerts / 18) * 100}px` }}
                ></div>
                <span className="text-xs text-gray-600 mt-2">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center space-x-6 mt-4">
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
      </div>

      {/* Violation Types Fallback */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Violation Types Distribution</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          {chartData.violationTypes.map((item, index) => (
            <div key={index} className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-700">{item.type}</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(item.count / 45) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{item.count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Try to render recharts, fallback to simple charts if they fail */}
      {(() => {
        try {
          return (
            <>
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
            </>
          );
        } catch (error) {
          console.error('Recharts failed, using fallback:', error);
          return renderFallbackChart();
        }
      })()}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">156</p>
          <p className="text-sm text-gray-600">Total Violations</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-2xl font-bold text-yellow-600">23</p>
          <p className="text-sm text-gray-600">Active Alerts</p>
        </div>
      </div>
    </div>
  );
}
