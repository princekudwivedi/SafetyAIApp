'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Wifi, Database, Cpu, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemComponent {
  name: string;
  status: 'online' | 'offline' | 'warning';
  details: string;
  lastCheck: string;
}

const systemComponents: SystemComponent[] = [
  {
    name: 'AI Model',
    status: 'online',
    details: 'YOLOv8 model loaded and running',
    lastCheck: 'Just now',
  },
  {
    name: 'Database',
    status: 'online',
    details: 'MongoDB connection active',
    lastCheck: 'Just now',
  },
  {
    name: 'WebSocket Server',
    status: 'online',
    details: 'Real-time communication active',
    lastCheck: 'Just now',
  },
  {
    name: 'Camera CAM_01',
    status: 'online',
    details: 'Streaming from Zone 1',
    lastCheck: '2 minutes ago',
  },
  {
    name: 'Camera CAM_02',
    status: 'online',
    details: 'Streaming from Zone 1',
    lastCheck: '1 minute ago',
  },
  {
    name: 'Camera CAM_03',
    status: 'warning',
    details: 'High latency detected',
    lastCheck: '30 seconds ago',
  },
  {
    name: 'Camera CAM_04',
    status: 'offline',
    details: 'Connection lost',
    lastCheck: '5 minutes ago',
  },
  {
    name: 'Camera CAM_05',
    status: 'online',
    details: 'Streaming from Zone 3',
    lastCheck: 'Just now',
  },
];

const statusConfig = {
  online: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
  },
  offline: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-200',
  },
};

export function SystemStatus() {
  const onlineCount = systemComponents.filter(c => c.status === 'online').length;
  const warningCount = systemComponents.filter(c => c.status === 'warning').length;
  const offlineCount = systemComponents.filter(c => c.status === 'offline').length;
  const totalCount = systemComponents.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">{onlineCount}</p>
          <p className="text-sm text-green-700">Online</p>
        </div>
        
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-center mb-2">
            <AlertCircle className="h-6 w-6 text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-yellow-600">{warningCount}</p>
          <p className="text-sm text-yellow-700">Warning</p>
        </div>
        
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="flex items-center justify-center mb-2">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">{offlineCount}</p>
          <p className="text-sm text-red-700">Offline</p>
        </div>
      </div>

      {/* Overall Status */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Wifi className="h-5 w-5 text-gray-600" />
            <span className="font-medium text-gray-900">System Status</span>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={cn(
            'w-3 h-3 rounded-full',
            offlineCount > 0 ? 'bg-red-500' : warningCount > 0 ? 'bg-yellow-500' : 'bg-green-500'
          )} />
          <span className={cn(
            'text-sm font-medium',
            offlineCount > 0 ? 'text-red-600' : warningCount > 0 ? 'text-yellow-600' : 'text-green-600'
          )}>
            {offlineCount > 0 ? 'Degraded' : warningCount > 0 ? 'Warning' : 'Healthy'}
          </span>
        </div>
      </div>

      {/* Component Details */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Component Status</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {systemComponents.map((component) => {
            const config = statusConfig[component.status];
            const Icon = config.icon;
            
            return (
              <div
                key={component.name}
                className={cn(
                  'p-3 rounded-lg border',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Icon className={cn('h-4 w-4', config.color)} />
                      <span className="font-medium text-gray-900">{component.name}</span>
                    </div>
                    <p className="text-sm text-gray-700">{component.details}</p>
                    <p className="text-xs text-gray-500 mt-1">Last check: {component.lastCheck}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <Cpu className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">AI Processing</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">98%</p>
          <p className="text-sm text-blue-700">Efficiency</p>
        </div>
        
        <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2 mb-2">
            <Database className="h-5 w-5 text-purple-600" />
            <span className="font-medium text-purple-900">Database</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">45ms</p>
          <p className="text-sm text-purple-700">Avg Response</p>
        </div>
      </div>
    </div>
  );
}
