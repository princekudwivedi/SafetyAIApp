'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { AlertTriangle, Filter, Search, Clock, MapPin, Camera, User, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAlerts } from '@/hooks/use-alerts';
import { Alert as AlertType } from '@/lib/api/alerts';
import { extractErrorMessage } from '@/lib/utils/error-handling';
import { Pagination } from '@/components/ui/pagination';
import { AlertDetailsModal } from './alert-details-modal';

const severityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusColors = {
  new: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

const statusIcons = {
  new: AlertTriangle,
  in_progress: Clock,
  resolved: CheckCircle,
  dismissed: XCircle,
};

const statusLabels = {
  new: 'New',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  dismissed: 'Dismissed',
};

const severityLabels = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  // Handle any other severity values that might come from the backend
  not_important: 'Not Important',
  critical: 'Critical',
  warning: 'Warning',
  info: 'Information',
};

export function AlertsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<AlertType | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use the enhanced custom hook for real-time alerts data
  const {
    paginatedAlerts,
    summary,
    isLoading,
    error,
    filters,
    setFilters,
    refreshAlerts,
    updateAlert,
    deleteAlert,
    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalCount,
    totalPages,
    // Unique values for filters
    uniqueStatuses,
    uniqueSeverities,
    uniqueCameras,
    // Loading states
    isLoadingUniqueValues,
  } = useAlerts();

  // Apply search filter to paginated alerts
  const searchFilteredAlerts = paginatedAlerts.filter(alert =>
    alert.violation_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    alert.camera_id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    try {
      await updateAlert(alertId, { status: newStatus });
    } catch (error) {
      console.error('Failed to update alert status:', error);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (window.confirm('Are you sure you want to delete this alert?')) {
      try {
        await deleteAlert(alertId);
      } catch (error) {
        console.error('Failed to delete alert:', error);
      }
    }
  };

  const handleViewDetails = (alert: AlertType) => {
    setSelectedAlert(alert);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedAlert(null);
  };

  const getStatusCount = (status: string) => {
    return summary?.by_status[status] || 0;
  };

  const getSeverityCount = (severity: string) => {
    return summary?.by_severity[severity] || 0;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-400" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Alerts</h3>
          <p className="text-red-600 mb-4">
            {extractErrorMessage(error, 'An error occurred while loading alerts')}
          </p>
          <button
            onClick={refreshAlerts}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Safety Alerts</h1>
            <p className="mt-2 text-gray-600">
              Monitor and manage safety violations and alerts in real-time
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Total Alerts: {totalCount} | Showing: {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount)} of {totalCount}
            </p>
          </div>
          <button
            onClick={refreshAlerts}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">New Alerts</p>
              <p className="text-2xl font-bold text-red-600">{getStatusCount('new')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600">{getStatusCount('in_progress')}</p>
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
              <p className="text-2xl font-bold text-green-600">{getStatusCount('resolved')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <XCircle className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Dismissed</p>
              <p className="text-2xl font-bold text-gray-600">{getStatusCount('dismissed')}</p>
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
              <p className="text-2xl font-bold text-blue-600">{summary?.total_alerts || 0}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  value={filters.status || 'all'}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value === 'all' ? undefined : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoadingUniqueValues}
                >
                  <option value="all">All Statuses</option>
                  {uniqueStatuses.map(status => (
                    <option key={status} value={status}>
                      {statusLabels[status as keyof typeof statusLabels] || status}
                    </option>
                  ))}
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={filters.severity || 'all'}
                  onChange={(e) => setFilters({ ...filters, severity: e.target.value === 'all' ? undefined : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={isLoadingUniqueValues}
                >
                  <option value="all">All Severities</option>
                  {uniqueSeverities.map(severity => (
                    <option key={severity} value={severity}>
                      {severityLabels[severity as keyof typeof severityLabels] || severity}
                    </option>
                  ))}
                </select>
              </div>

              {/* Camera Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera</label>
                <select
                  value={filters.camera_id || 'all'}
                  onChange={(e) => setFilters({ ...filters, camera_id: e.target.value === 'all' ? undefined : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Cameras</option>
                  {uniqueCameras.map(cameraId => (
                    <option key={cameraId} value={cameraId}>{cameraId}</option>
                  ))}
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
            Alerts ({searchFilteredAlerts.length})
            {isLoading && <span className="ml-2 text-sm text-gray-500">Loading...</span>}
            {isLoadingUniqueValues && <span className="ml-2 text-sm text-gray-500">Loading filters...</span>}
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading alerts...</p>
            </div>
          ) : searchFilteredAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
              <p className="text-gray-600">Try adjusting your filters or search terms</p>
            </div>
          ) : (
            searchFilteredAlerts.map((alert) => {
              const StatusIcon = statusIcons[alert.status as keyof typeof statusIcons] || AlertTriangle;
              
              return (
                <div key={alert.alert_id} className="p-4 hover:bg-gray-50 transition-colors">
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
                          severityColors[alert.severity_level as keyof typeof severityColors] || severityColors.low
                        )}>
                          {severityLabels[alert.severity_level as keyof typeof severityLabels] || alert.severity_level}
                        </span>
                        <span className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                          statusColors[alert.status as keyof typeof statusColors] || statusColors.new
                        )}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusLabels[alert.status as keyof typeof statusLabels] || alert.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {Math.round(alert.confidence_score * 100)}% confidence
                        </span>
                      </div>

                      <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {alert.violation_type}
                      </h3>

                      <p className="text-gray-600 mb-3">
                        {alert.description}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {alert.location_id}
                        </div>
                        <div className="flex items-center">
                          <Camera className="h-4 w-4 mr-1" />
                          {alert.camera_id}
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {formatTimestamp(alert.timestamp)}
                        </div>
                        {alert.assigned_to && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            {alert.assigned_to}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center space-x-2">
                        {alert.status === 'new' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(alert.alert_id, 'in_progress')}
                              className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded hover:bg-yellow-200"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => handleStatusChange(alert.alert_id, 'dismissed')}
                              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200"
                            >
                              Dismiss
                            </button>
                          </>
                        )}
                        {alert.status === 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(alert.alert_id, 'resolved')}
                            className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-300 rounded hover:bg-green-200"
                          >
                            Mark Resolved
                          </button>
                        )}
                        <button 
                          onClick={() => handleViewDetails(alert)}
                          className="px-3 py-1 text-xs font-medium text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(alert.alert_id)}
                          className="px-3 py-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
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

      {/* Alert Details Modal */}
      <AlertDetailsModal
        alert={selectedAlert}
        isOpen={isModalOpen}
        onClose={closeModal}
      />
    </div>
  );
}
