'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Camera, Plus, Edit, Trash2, Wifi, WifiOff, AlertTriangle, Settings, Search, Filter, Play, Pause, Square, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCameras } from '@/hooks/use-cameras';
import { useSites } from '@/hooks/use-sites';
import { CameraForm } from './camera-form';
import { Camera as CameraType, CameraCreate, CameraUpdate } from '@/lib/api/cameras';
import { Button } from '@/components/ui/button';

// Enhanced camera interface with additional computed properties
interface EnhancedCamera extends CameraType {
  siteName?: string;
  isStreaming?: boolean;
  isRecording?: boolean;
  uptime?: number;
  alertsGenerated?: number;
  resolution?: string;
  fps?: number;
}

const statusColors = {
  Active: 'bg-green-100 text-green-800 border-green-200',
  Inactive: 'bg-red-100 text-red-800 border-red-200',
  Maintenance: 'bg-blue-100 text-blue-800 border-blue-200',
};

const statusIcons = {
  Active: Wifi,
  Inactive: WifiOff,
  Maintenance: Settings,
};

export function CamerasPage() {
  const { subscribe, isConnected } = useWebSocket();
  const { sites } = useSites();
  const { 
    cameras: apiCameras, 
    loading, 
    error, 
    createCamera, 
    updateCamera, 
    deleteCamera 
  } = useCameras();
  
  const [filteredCameras, setFilteredCameras] = useState<EnhancedCamera[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<EnhancedCamera | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Process cameras to add site names and default values
  const enhancedCameras: EnhancedCamera[] = useMemo(() => {
    return apiCameras.map(camera => {
      const site = sites.find(s => s.site_id === camera.site_id);
      return {
        ...camera,
        siteName: site?.site_name || 'Unknown Site',
        isStreaming: camera.status === 'Active',
        isRecording: false,
        uptime: Math.random() * 100, // Mock uptime for now
        alertsGenerated: Math.floor(Math.random() * 50), // Mock alerts for now
        resolution: '1920x1080', // Mock resolution
        fps: 30, // Mock fps
      };
    });
  }, [apiCameras, sites]);

  useEffect(() => {
    // Subscribe to camera status updates
    const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
      // Handle real-time status updates when available
      console.log('Camera status update:', data);
    });

    // Subscribe to camera stream updates
    const unsubscribeCameraStream = subscribe('camera_stream_update', (data) => {
      // Handle real-time stream updates when available
      console.log('Camera stream update:', data);
    });

    return () => {
      unsubscribeCameraStatus();
      unsubscribeCameraStream();
    };
  }, [subscribe]);

  useEffect(() => {
    // Apply filters
    let filtered = enhancedCameras;

    if (searchTerm) {
      filtered = filtered.filter(camera =>
        camera.camera_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (camera.location_description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (camera.siteName || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(camera => camera.status === statusFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter(camera => camera.site_id === siteFilter);
    }

    setFilteredCameras(filtered);
  }, [enhancedCameras, searchTerm, statusFilter, siteFilter]);

  const handleDeleteCamera = async (cameraId: string) => {
    if (window.confirm('Are you sure you want to delete this camera? This action cannot be undone.')) {
      try {
        await deleteCamera(cameraId);
      } catch (error) {
        console.error('Error deleting camera:', error);
      }
    }
  };

  const handleEditCamera = (camera: EnhancedCamera) => {
    setEditingCamera(camera);
    setShowAddModal(true);
  };

  const handleFormSubmit = async (data: CameraCreate | CameraUpdate) => {
    setFormLoading(true);
    try {
      if (editingCamera) {
        await updateCamera(editingCamera.camera_id, data as CameraUpdate);
      } else {
        await createCamera(data as CameraCreate);
      }
      setShowAddModal(false);
      setEditingCamera(null);
    } catch (error) {
      console.error('Error saving camera:', error);
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStreaming = async (cameraId: string) => {
    try {
      const camera = enhancedCameras.find(c => c.camera_id === cameraId);
      if (!camera) return;

      const newStatus = camera.isStreaming ? 'Inactive' : 'Active';
      await updateCamera(cameraId, { status: newStatus });
    } catch (error) {
      console.error('Error toggling camera streaming:', error);
    }
  };

  const toggleRecording = async (cameraId: string) => {
    try {
      const camera = enhancedCameras.find(c => c.camera_id === cameraId);
      if (!camera) return;

      // Toggle recording state (this would typically update a recording field in the database)
      console.log('Toggle recording for camera:', cameraId);
      // For now, we'll just log the action since recording state isn't stored in the current model
    } catch (error) {
      console.error('Error toggling camera recording:', error);
    }
  };

  const getStatusCount = (status: string) => {
    return enhancedCameras.filter(camera => camera.status === status).length;
  };

  const getTotalUptime = () => {
    const total = enhancedCameras.reduce((sum, camera) => sum + (camera.uptime || 0), 0);
    return enhancedCameras.length > 0 ? (total / enhancedCameras.length).toFixed(1) : '0';
  };

  const getTotalAlerts = () => {
    return enhancedCameras.reduce((total, camera) => total + (camera.alertsGenerated || 0), 0);
  };

  const getUniqueSites = () => {
    return Array.from(new Set(enhancedCameras.map(camera => camera.site_id)));
  };

  // Show loading state
  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary-600" />
            <p className="text-gray-600">Loading cameras...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Error loading cameras</p>
            <p className="text-gray-600 text-sm">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
              variant="outline"
            >
              Retry
            </Button>
          </div>
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
                <p className="text-2xl font-bold text-blue-600">{enhancedCameras.length}</p>
                <p className="text-xs text-gray-500">{getStatusCount('Active')} active</p>
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
                  {enhancedCameras.filter(c => c.status === 'Active').length}
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
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
                    const camera = enhancedCameras.find(c => c.site_id === siteId);
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
                const StatusIcon = statusIcons[camera.status as keyof typeof statusIcons] || AlertTriangle;
                
                return (
                  <tr key={camera.camera_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{camera.camera_name}</div>
                        <div className="text-sm text-gray-500">{camera.location_description || 'No location'}</div>
                        <div className="text-xs text-gray-400">{camera.resolution || '1920x1080'} @ {camera.fps || 30}fps</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{camera.siteName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        statusColors[camera.status as keyof typeof statusColors] || statusColors.Inactive
                      )}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {camera.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleStreaming(camera.camera_id)}
                          className={cn(
                            'p-1 rounded text-xs font-medium transition-colors',
                            camera.status === 'Active'
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          )}
                        >
                          {camera.status === 'Active' ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => toggleRecording(camera.camera_id)}
                          disabled={camera.status !== 'Active'}
                          className={cn(
                            'p-1 rounded text-xs font-medium transition-colors',
                            camera.isRecording
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : camera.status === 'Active'
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
                            style={{ width: `${camera.uptime || 0}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{camera.uptime || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        (camera.alertsGenerated || 0) > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                      )}>
                        {camera.alertsGenerated || 0}
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
                          onClick={() => handleDeleteCamera(camera.camera_id)}
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
          <div className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Camera className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {enhancedCameras.length === 0 ? 'No cameras added yet' : 'No cameras found'}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {enhancedCameras.length === 0 
                    ? 'Get started by adding your first camera to monitor your construction site and enhance safety monitoring.'
                    : 'Try adjusting your filters or search terms to find the cameras you\'re looking for.'
                  }
                </p>
              </div>
              
              {enhancedCameras.length === 0 && (
                <div className="space-y-3">
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Add Your First Camera
                  </Button>
                  <div className="text-xs text-gray-500">
                    Start monitoring your construction site with AI-powered safety detection
                  </div>
                </div>
              )}
            </div>
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

      {/* Camera Form Modal */}
      <CameraForm
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingCamera(null);
        }}
        onSubmit={handleFormSubmit}
        camera={editingCamera}
        sites={sites}
        loading={formLoading}
      />
    </div>
  );
}