'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { AlertTriangle, Filter, Search, Clock, MapPin, Camera, User, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
  id: string;
  type: string;
  severity: 'High' | 'Medium' | 'Low';
  description: string;
  location: string;
  camera: string;
  timestamp: string;
  status: 'New' | 'Assigned' | 'Resolved' | 'Dismissed';
  assignedTo?: string;
  confidence: number;
  snapshotUrl?: string;
}

const mockAlerts: Alert[] = [
  {
    id: 'AL-001',
    type: 'No Hard Hat',
    severity: 'High',
    description: 'Worker identified without hard hat in Zone 3',
    location: 'Zone 3 - Warehouse Area',
    camera: 'CAM_05',
    timestamp: '2 minutes ago',
    status: 'New',
    confidence: 0.98,
  },
  {
    id: 'AL-002',
    type: 'Proximity Violation',
    severity: 'Medium',
    description: 'Worker too close to operating machinery',
    location: 'Zone 1 - Construction Site',
    camera: 'CAM_02',
    timestamp: '5 minutes ago',
    status: 'Assigned',
    assignedTo: 'John Smith',
    confidence: 0.87,
  },
  {
    id: 'AL-003',
    type: 'No Safety Vest',
    severity: 'Medium',
    description: 'Worker without high-visibility vest detected',
    location: 'Zone 2 - Loading Dock',
    camera: 'CAM_03',
    timestamp: '8 minutes ago',
    status: 'New',
    confidence: 0.92,
  },
  {
    id: 'AL-004',
    type: 'Unauthorized Access',
    severity: 'Low',
    description: 'Personnel in restricted area without clearance',
    location: 'Zone 4 - Equipment Storage',
    camera: 'CAM_07',
    timestamp: '12 minutes ago',
    status: 'Resolved',
    assignedTo: 'Sarah Johnson',
    confidence: 0.76,
  },
  {
    id: 'AL-005',
    type: 'Equipment Misuse',
    severity: 'High',
    description: 'Forklift operated without proper safety measures',
    location: 'Zone 1 - Construction Site',
    camera: 'CAM_01',
    timestamp: '15 minutes ago',
    status: 'Assigned',
    assignedTo: 'Mike Davis',
    confidence: 0.94,
  },
];

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

const statusIcons = {
  New: AlertTriangle,
  Assigned: Clock,
  Resolved: CheckCircle,
  Dismissed: XCircle,
};

export function AlertsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>(mockAlerts);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    // Subscribe to new alerts
    const unsubscribeNewAlert = subscribe('new_alert', (data) => {
      if (data.type === 'new_alert') {
        setAlerts(prev => [data.payload, ...prev]);
      }
    });

    // Subscribe to alert updates
    const unsubscribeAlertUpdate = subscribe('alert_update', (data) => {
      if (data.type === 'alert_update') {
        setAlerts(prev => prev.map(alert => 
          alert.id === data.payload.id 
            ? { ...alert, ...data.payload }
            : alert
        ));
      }
    });

    return () => {
      unsubscribeNewAlert();
      unsubscribeAlertUpdate();
    };
  }, [subscribe]);

  useEffect(() => {
    // Apply filters
    let filtered = alerts;

    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(alert => alert.status === statusFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, statusFilter, severityFilter]);

  const handleStatusChange = (alertId: string, newStatus: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, status: newStatus as Alert['status'] }
        : alert
    ));
  };

  const getStatusCount = (status: string) => {
    return alerts.filter(alert => alert.status === status).length;
  };

  const getSeverityCount = (severity: string) => {
    return alerts.filter(alert => alert.severity === severity).length;
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Safety Alerts</h1>
        <p className="mt-2 text-gray-600">
          Monitor and manage safety violations and alerts in real-time
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">New Alerts</p>
              <p className="text-2xl font-bold text-red-600">{getStatusCount('New')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Assigned</p>
              <p className="text-2xl font-bold text-yellow-600">{getStatusCount('Assigned')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{getStatusCount('Resolved')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-blue-600">{alerts.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
            >
              <Filter className="h-4 w-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="New">New</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Dismissed">Dismissed</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Severities</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alerts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Alerts ({filteredAlerts.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {filteredAlerts.map((alert) => {
            const StatusIcon = statusIcons[alert.status];
            
            return (
              <div key={alert.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-4">
                  {/* Alert Icon */}
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <AlertTriangle className="h-6 w-6 text-red-600" />
                    </div>
                  </div>

                  {/* Alert Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        severityColors[alert.severity]
                      )}>
                        {alert.severity}
                      </span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        statusColors[alert.status]
                      )}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {alert.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {alert.confidence * 100}% confidence
                      </span>
                    </div>

                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {alert.type}
                    </h3>

                    <p className="text-gray-600 mb-3">
                      {alert.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                      <div className="flex items-center">
                        <MapPin className="h-4 w-4 mr-1" />
                        {alert.location}
                      </div>
                      <div className="flex items-center">
                        <Camera className="h-4 w-4 mr-1" />
                        {alert.camera}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {alert.timestamp}
                      </div>
                      {alert.assignedTo && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {alert.assignedTo}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {alert.status === 'New' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(alert.id, 'Assigned')}
                            className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200"
                          >
                            Assign
                          </button>
                          <button
                            onClick={() => handleStatusChange(alert.id, 'Dismissed')}
                            className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                          >
                            Dismiss
                          </button>
                        </>
                      )}
                      {alert.status === 'Assigned' && (
                        <button
                          onClick={() => handleStatusChange(alert.id, 'Resolved')}
                          className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200"
                        >
                          Mark Resolved
                        </button>
                      )}
                      <button className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredAlerts.length === 0 && (
          <div className="p-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
            <p className="text-gray-600">Try adjusting your filters or search terms</p>
          </div>
        )}
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
