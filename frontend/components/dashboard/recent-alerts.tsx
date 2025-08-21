'use client';

import React, { useMemo } from 'react';
import { AlertTriangle, Clock, MapPin, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AlertsSummary } from '@/lib/api/dashboard';

interface Alert {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  location: string;
  camera: string;
  timestamp: string;
  status: 'New' | 'Assigned' | 'Resolved' | 'Dismissed';
}

interface RecentAlertsProps {
  alertsSummary: AlertsSummary | null;
  isLoading: boolean;
}

const severityColors = {
  High: 'bg-red-100 text-red-800 border-red-200',
  Medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusColors = {
  New: 'bg-red-100 text-red-800',
  Assigned: 'bg-yellow-100 text-yellow-800',
  Resolved: 'bg-green-100 text-green-800',
  Dismissed: 'bg-gray-100 text-gray-800',
};

export function RecentAlerts({ alertsSummary, isLoading }: RecentAlertsProps) {
  // Process alerts data from props using useMemo to prevent unnecessary recalculations
  const alerts = useMemo((): Alert[] => {
    if (!alertsSummary) {
      return [];
    }

    try {
      // Transform API data to component format
      return alertsSummary.recent_alerts.slice(0, 5).map(apiAlert => ({
        id: apiAlert.alert_id,
        type: apiAlert.violation_type,
        severity: apiAlert.severity_level as 'High' | 'Medium' | 'Low',
        description: apiAlert.description,
        location: `Camera ${apiAlert.camera_id}`,
        camera: apiAlert.camera_id,
        timestamp: new Date(apiAlert.timestamp).toLocaleString(),
        status: apiAlert.status as 'New' | 'Assigned' | 'Resolved' | 'Dismissed',
      }));
    } catch (error) {
      console.error('Error processing alerts data:', error);
      return [];
    }
  }, [alertsSummary]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
          <button className="text-sm text-primary-600 hover:text-primary-500">
            View All
          </button>
        </div>
        
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (!alertsSummary) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
          <button className="text-sm text-primary-600 hover:text-primary-500">
            View All
          </button>
        </div>
        
        <div className="text-center py-8">
          <p className="text-gray-500">No alerts data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Recent Alerts</h3>
        <button className="text-sm text-primary-600 hover:text-primary-500">
          View All
        </button>
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        severityColors[alert.severity]
                      )}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        statusColors[alert.status]
                      )}
                    >
                      {alert.status}
                    </span>
                  </div>
                  
                  <h4 className="font-medium text-gray-900 mb-1">
                    {alert.type} Violation
                  </h4>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {alert.description}
                  </p>
                  
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {alert.location}
                    </div>
                    <div className="flex items-center">
                      <Camera className="h-3 w-3 mr-1" />
                      {alert.camera}
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {alert.timestamp}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
