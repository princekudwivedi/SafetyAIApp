'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Camera, Plus, Edit, Trash2, Wifi, WifiOff, AlertTriangle, Settings, Search, Filter, Play, Pause, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraSystem {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  location: string;
  streamUrl: string;
  status: 'online' | 'offline' | 'warning' | 'maintenance';
  isStreaming: boolean;
  isRecording: boolean;
  uptime: number;
  lastFrame?: string;
  resolution: string;
  fps: number;
  alertsGenerated: number;
  lastMaintenance: string;
  createdAt: string;
}

const mockCameras: CameraSystem[] = [
  {
    id: 'CAM_01',
    name: 'Main Entrance Camera',
    siteId: 'SITE_001',
    siteName: 'Downtown Construction Project',
    location: 'Main Entrance',
    streamUrl: '/api/v1/video/stream/CAM_01',
    status: 'online',
    isStreaming: true,
    isRecording: false,
    uptime: 98.5,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 15,
    lastMaintenance: '2024-01-15',
    createdAt: '2024-01-10',
  },
  {
    id: 'CAM_02',
    name: 'Construction Site Overview',
    siteId: 'SITE_001',
    siteName: 'Downtown Construction Project',
    location: 'Site Center',
    streamUrl: '/api/v1/video/stream/CAM_02',
    status: 'online',
    isStreaming: true,
    isRecording: true,
    uptime: 95.2,
    resolution: '1920x1080',
    fps: 25,
    alertsGenerated: 8,
    lastMaintenance: '2024-01-12',
    createdAt: '2024-01-10',
  },
  {
    id: 'CAM_03',
    name: 'Loading Dock Monitor',
    siteId: 'SITE_002',
    siteName: 'Industrial Warehouse Complex',
    location: 'Loading Dock',
    streamUrl: '/api/v1/video/stream/CAM_03',
    status: 'warning',
    isStreaming: true,
    isRecording: false,
    uptime: 87.3,
    resolution: '1280x720',
    fps: 20,
    alertsGenerated: 18,
    lastMaintenance: '2024-01-08',
    createdAt: '2024-01-05',
  },
  {
    id: 'CAM_04',
    name: 'Equipment Storage',
    siteId: 'SITE_002',
    siteName: 'Industrial Warehouse Complex',
    location: 'Storage Area',
    streamUrl: '/api/v1/video/stream/CAM_04',
    status: 'offline',
    isStreaming: false,
    isRecording: false,
    uptime: 0,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 7,
    lastMaintenance: '2024-01-10',
    createdAt: '2024-01-05',
  },
  {
    id: 'CAM_05',
    name: 'Warehouse Security',
    siteId: 'SITE_003',
    siteName: 'Residential Development Phase 1',
    location: 'Warehouse',
    streamUrl: '/api/v1/video/stream/CAM_05',
    status: 'online',
    isStreaming: false,
    isRecording: false,
    uptime: 92.1,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 22,
    lastMaintenance: '2024-01-18',
    createdAt: '2024-01-03',
  },
];

const statusColors = {
  online: 'bg-green-100 text-green-800 border-green-200',
  offline: 'bg-red-100 text-red-800 border-red-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  maintenance: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusIcons = {
  online: Wifi,
  offline: WifiOff,
  warning: AlertTriangle,
  maintenance: Settings,
};

export function CamerasPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [cameras, setCameras] = useState<CameraSystem[]>(mockCameras);
  const [filteredCameras, setFilteredCameras] = useState<CameraSystem[]>(mockCameras);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraSystem | null>(null);

  useEffect(() => {
    // Subscribe to camera status updates
    const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
      if (data.type === 'camera_status_update') {
        setCameras(prev => prev.map(camera => 
          camera.id === data.payload.cameraId 
            ? { ...camera, status: data.payload.status }
            : camera
        ));
      }
    });

    // Subscribe to camera stream updates
    const unsubscribeCameraStream = subscribe('camera_stream_update', (data) => {
      if (data.type === 'camera_stream_update') {
        setCameras(prev => prev.map(camera => 
          camera.id === data.payload.cameraId 
            ? { 
                ...camera, 
                isStreaming: data.payload.isStreaming,
                isRecording: data.payload.isRecording 
              }
            : camera
        ));
      }
    });

    return () => {
      unsubscribeCameraStatus();
      unsubscribeCameraStream();
    };
  }, [subscribe]);

  useEffect(() => {
    // Apply filters
    let filtered = cameras;

    if (searchTerm) {
      filtered = filtered.filter(camera =>
        camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camera.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        camera.siteName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(camera => camera.status === statusFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter(camera => camera.siteId === siteFilter);
    }

    setFilteredCameras(filtered);
  }, [cameras, searchTerm, statusFilter, siteFilter]);

  const handleDeleteCamera = (cameraId: string) => {
    if (window.confirm('Are you sure you want to delete this camera? This action cannot be undone.')) {
      setCameras(prev => prev.filter(camera => camera.id !== cameraId));
    }
  };

  const handleEditCamera = (camera: CameraSystem) => {
    setEditingCamera(camera);
    setShowAddModal(true);
  };

  const toggleStreaming = (cameraId: string) => {
    setCameras(prev => prev.map(camera => 
      camera.id === cameraId 
        ? { ...camera, isStreaming: !camera.isStreaming }
        : camera
    ));
  };

  const toggleRecording = (cameraId: string) => {
    setCameras(prev => prev.map(camera => 
      camera.id === cameraId 
        ? { ...camera, isRecording: !camera.isRecording }
        : camera
    ));
  };

  const getStatusCount = (status: string) => {
    return cameras.filter(camera => camera.status === status).length;
  };

  const getTotalUptime = () => {
    const total = cameras.reduce((sum, camera) => sum + camera.uptime, 0);
    return cameras.length > 0 ? (total / cameras.length).toFixed(1) : '0';
  };

  const getTotalAlerts = () => {
    return cameras.reduce((total, camera) => total + camera.alertsGenerated, 0);
  };

  const getUniqueSites = () => {
    return Array.from(new Set(cameras.map(camera => camera.siteId)));
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Camera Systems</h1>
            <p className="mt-2 text-gray-600">
              Manage and monitor camera systems across all construction sites
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Camera</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Camera className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Cameras</p>
              <p className="text-2xl font-bold text-blue-600">{cameras.length}</p>
              <p className="text-xs text-gray-500">{getStatusCount('online')} online</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Average Uptime</p>
              <p className="text-2xl font-bold text-green-600">{getTotalUptime()}%</p>
              <p className="text-xs text-gray-500">System reliability</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Play className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Active Streams</p>
              <p className="text-2xl font-bold text-yellow-600">
                {cameras.filter(c => c.isStreaming).length}
              </p>
              <p className="text-xs text-gray-500">Currently streaming</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Total Alerts</p>
              <p className="text-2xl font-bold text-red-600">{getTotalAlerts()}</p>
              <p className="text-xs text-gray-500">Generated this month</p>
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
                    placeholder="Search cameras..."
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
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="warning">Warning</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {/* Site Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site</label>
                <select
                  value={siteFilter}
                  onChange={(e) => setSiteFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Sites</option>
                  {getUniqueSites().map(siteId => {
                    const camera = cameras.find(c => c.siteId === siteId);
                    return (
                      <option key={siteId} value={siteId}>
                        {camera?.siteName || siteId}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cameras List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Cameras ({filteredCameras.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Camera
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Site
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stream
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uptime
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alerts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCameras.map((camera) => {
                const StatusIcon = statusIcons[camera.status];
                
                return (
                  <tr key={camera.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{camera.name}</div>
                        <div className="text-sm text-gray-500">{camera.location}</div>
                        <div className="text-xs text-gray-400">{camera.resolution} @ {camera.fps}fps</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{camera.siteName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        statusColors[camera.status]
                      )}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {camera.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStreaming(camera.id)}
                          className={cn(
                            'p-1 rounded text-xs font-medium transition-colors',
                            camera.isStreaming
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          )}
                        >
                          {camera.isStreaming ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => toggleRecording(camera.id)}
                          disabled={!camera.isStreaming}
                          className={cn(
                            'p-1 rounded text-xs font-medium transition-colors',
                            camera.isRecording
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : camera.isStreaming
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                          )}
                        >
                          <Square className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${camera.uptime}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{camera.uptime}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        camera.alertsGenerated > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      )}>
                        {camera.alertsGenerated}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEditCamera(camera)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(camera.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCameras.length === 0 && (
          <div className="p-8 text-center">
            <Camera className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras found</h3>
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

      {/* Add/Edit Modal Placeholder */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCamera ? 'Edit Camera' : 'Add New Camera'}
            </h3>
            <p className="text-gray-600 mb-4">
              {editingCamera 
                ? 'Update camera information below.' 
                : 'Fill in the details to add a new camera system.'
              }
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCamera(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // In a real app, this would save the camera
                  setShowAddModal(false);
                  setEditingCamera(null);
                }}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {editingCamera ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
