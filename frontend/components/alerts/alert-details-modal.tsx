import React from 'react';
import { X, MapPin, Camera, Clock, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert } from '@/lib/api/alerts';

interface AlertDetailsModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusIcons = {
  new: AlertTriangle,
  in_progress: Clock,
  resolved: CheckCircle,
  dismissed: XCircle,
};

const statusColors = {
  new: 'bg-red-100 text-red-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  dismissed: 'bg-gray-100 text-gray-800',
};

const severityColors = {
  high: 'bg-red-100 text-red-800 border-red-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
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
};

export function AlertDetailsModal({ alert, isOpen, onClose }: AlertDetailsModalProps) {
  if (!isOpen || !alert) return null;

  const StatusIcon = statusIcons[alert.status as keyof typeof statusIcons] || AlertTriangle;

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Alert Details</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Alert Header */}
            <div className="mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{alert.violation_type}</h2>
                  <p className="text-gray-600">{alert.description}</p>
                </div>
              </div>

              {/* Status and Severity Badges */}
              <div className="flex items-center space-x-3">
                <span className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium',
                  statusColors[alert.status as keyof typeof statusColors] || statusColors.new
                )}>
                  <StatusIcon className="h-4 w-4 mr-2" />
                  {statusLabels[alert.status as keyof typeof statusLabels] || alert.status}
                </span>
                <span className={cn(
                  'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                  severityColors[alert.severity_level as keyof typeof severityColors] || severityColors.low
                )}>
                  {severityLabels[alert.severity_level as keyof typeof severityLabels] || alert.severity_level}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(alert.confidence_score * 100)}% confidence
                </span>
              </div>
            </div>

            {/* Alert Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Left Column */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Location</p>
                    <p className="text-sm text-gray-600">{alert.location_id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Camera className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Camera</p>
                    <p className="text-sm text-gray-600">{alert.camera_id}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Timestamp</p>
                    <p className="text-sm text-gray-600">{formatTimestamp(alert.timestamp)}</p>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-4">
                {alert.assigned_to && (
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Assigned To</p>
                      <p className="text-sm text-gray-600">{alert.assigned_to}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 text-gray-400 flex items-center justify-center">
                    <span className="text-xs font-bold">ID</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Alert ID</p>
                    <p className="text-sm text-gray-600 font-mono">{alert.alert_id}</p>
                  </div>
                </div>

                {alert.resolution_notes && (
                  <div className="flex items-start space-x-3">
                    <div className="h-5 w-5 text-gray-400 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold">📝</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Resolution Notes</p>
                      <p className="text-sm text-gray-600">{alert.resolution_notes}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Primary Object Details */}
            {alert.primary_object && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Detected Object</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <span className="ml-2 text-gray-600">{alert.primary_object.object_type || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Object ID:</span>
                      <span className="ml-2 text-gray-600 font-mono">{alert.primary_object.object_id || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Confidence:</span>
                      <span className="ml-2 text-gray-600">{Math.round((alert.primary_object.confidence || 0) * 100)}%</span>
                    </div>
                    {alert.primary_object.bounding_box && (
                      <div>
                        <span className="font-medium text-gray-700">Bounding Box:</span>
                        <span className="ml-2 text-gray-600 font-mono">
                          [{alert.primary_object.bounding_box.join(', ')}]
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Snapshot */}
            {alert.snapshot_url && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Event Snapshot</h4>
                <div className="bg-gray-50 rounded-lg p-4">
                  <img 
                    src={alert.snapshot_url} 
                    alt="Alert snapshot" 
                    className="w-full h-auto rounded-lg max-h-64 object-contain"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
