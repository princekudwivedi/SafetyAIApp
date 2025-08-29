'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/auth-context';
import { Camera, Edit, Trash2, Wifi, WifiOff, Settings, Search, Filter, Play, Pause, Square, AlertTriangle, RefreshCw, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import toast from 'react-hot-toast';

interface CameraSystem {
  camera_id: string;
  camera_name: string;
  site_id: string;
  site_name?: string;
  location_description?: string;
  stream_url: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  isStreaming?: boolean;
  isRecording?: boolean;
  uptime?: number;
  lastFrame?: string;
  resolution?: string;
  fps?: number;
  alertsGenerated?: number;
  lastMaintenance?: string;
  installation_date: string;
  settings?: Record<string, any>;
}

const mockCameras: CameraSystem[] = [
  {
    camera_id: 'CAM_01',
    camera_name: 'Main Entrance Camera',
    site_id: 'SITE_001',
    site_name: 'Downtown Construction Project',
    location_description: 'Main Entrance',
    stream_url: '/api/v1/video/stream/CAM_01',
    status: 'Active',
    isStreaming: true,
    isRecording: false,
    uptime: 98.5,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 15,
    lastMaintenance: '2024-01-15',
    installation_date: '2024-01-10',
  },
  {
    camera_id: 'CAM_02',
    camera_name: 'Construction Site Overview',
    site_id: 'SITE_001',
    site_name: 'Downtown Construction Project',
    location_description: 'Site Center',
    stream_url: '/api/v1/video/stream/CAM_02',
    status: 'Active',
    isStreaming: true,
    isRecording: true,
    uptime: 95.2,
    resolution: '1920x1080',
    fps: 25,
    alertsGenerated: 8,
    lastMaintenance: '2024-01-12',
    installation_date: '2024-01-10',
  },
  {
    camera_id: 'CAM_03',
    camera_name: 'Loading Dock Monitor',
    site_id: 'SITE_002',
    site_name: 'Industrial Warehouse Complex',
    location_description: 'Loading Dock',
    stream_url: '/api/v1/video/stream/CAM_03',
    status: 'Maintenance',
    isStreaming: true,
    isRecording: false,
    uptime: 87.3,
    resolution: '1280x720',
    fps: 20,
    alertsGenerated: 18,
    lastMaintenance: '2024-01-08',
    installation_date: '2024-01-05',
  },
  {
    camera_id: 'CAM_04',
    camera_name: 'Equipment Storage',
    site_id: 'SITE_002',
    site_name: 'Industrial Warehouse Complex',
    location_description: 'Storage Area',
    stream_url: '/api/v1/video/stream/CAM_04',
    status: 'Inactive',
    isStreaming: false,
    isRecording: false,
    uptime: 0,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 7,
    lastMaintenance: '2024-01-10',
    installation_date: '2024-01-05',
  },
  {
    camera_id: 'CAM_05',
    camera_name: 'Warehouse Security',
    site_id: 'SITE_003',
    site_name: 'Residential Development Phase 1',
    location_description: 'Warehouse',
    stream_url: '/api/v1/video/stream/CAM_05',
    status: 'Active',
    isStreaming: false,
    isRecording: false,
    uptime: 92.1,
    resolution: '1920x1080',
    fps: 30,
    alertsGenerated: 22,
    lastMaintenance: '2024-01-18',
    installation_date: '2024-01-03',
  },
];

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
  const { user, isAuthenticated, logout } = useAuth();
  const [cameras, setCameras] = useState<CameraSystem[]>([]);
  const [filteredCameras, setFilteredCameras] = useState<CameraSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [siteFilter, setSiteFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingCamera, setAddingCamera] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCamera, setEditingCamera] = useState<CameraSystem | null>(null);
  const [updatingCamera, setUpdatingCamera] = useState(false);

  // Fetch cameras on component mount
  useEffect(() => {
    fetchCameras();
  }, [isAuthenticated]);

  const fetchCameras = async () => {
    try {
      setLoading(true);
      
      console.log('=== CAMERAS API DEBUG ===');
      console.log('isAuthenticated:', isAuthenticated);
      console.log('user:', user);
      
      if (!isAuthenticated) {
        console.log('User not authenticated, redirecting to login');
        toast.error('Please log in to view cameras');
        return;
      }
      
      // Debug: Check if token exists and session data
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      console.log('Token exists:', !!token);
      console.log('Token preview:', token ? token.substring(0, 30) + '...' : 'No token');
      
      let session = null;
      if (sessionData) {
        try {
          session = JSON.parse(sessionData);
          console.log('Session data:', session);
        } catch (e) {
          console.error('Failed to parse session data:', e);
        }
      }
      
      // Check if this is a demo user (demo token or session flag)
      const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;
      console.log('Is demo user:', isDemoUser);
      
      // For demo users, we'll still try to fetch from API but fallback to mock data if it fails
      if (isDemoUser) {
        console.log('Demo user detected, will try API first then fallback to mock data');
      }
      
      // Use the real API to get cameras from backend
      console.log('Making API call to /api/v1/cameras...');
      const response = await apiClient.get('/api/v1/cameras');
      console.log('API response successful:', response.data);
      
             // Transform API data to match our interface
       const transformedCameras = response.data.map((camera: any) => ({
         camera_id: camera.camera_id,
         camera_name: camera.camera_name,
         site_id: camera.site_id,
         site_name: camera.site_name || 'Unknown Site',
         location_description: camera.location_description,
         stream_url: camera.stream_url,
         status: camera.status,
         isStreaming: camera.status === 'Active', // Default based on status
         isRecording: false, // Default value
         uptime: 95.0, // Default value - could be calculated from actual data
         resolution: camera.settings?.resolution || '1920x1080',
         fps: camera.settings?.fps || 30,
         alertsGenerated: camera.alerts_count || 0, // Use actual alerts count from API
         lastMaintenance: camera.updated_at || camera.installation_date,
         installation_date: camera.installation_date,
         settings: camera.settings || {}
       }));
       
       setCameras(transformedCameras);
      
    } catch (error: any) {
      console.error('=== API ERROR DEBUG ===');
      console.error('Error fetching cameras:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      console.error('Error headers:', error.response?.headers);
      
      // Check if this is a demo user for fallback behavior
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      let session = null;
      if (sessionData) {
        try {
          session = JSON.parse(sessionData);
        } catch (e) {
          console.error('Failed to parse session data:', e);
        }
      }
      const isDemo = token?.startsWith('demo-token-') || session?.isApiUser === false;
      
      if (error.response?.status === 401) {
          console.log('Authentication failed (401)');
          if (isDemo) {
            console.log('Demo user - falling back to mock data');
            setCameras(mockCameras);
          } else {
            console.log('Real user - logging out');
            toast.error('Authentication failed. Please log in again.');
            logout();
          }
        } else if (error.response?.status === 403) {
          console.log('Permission denied (403)');
          if (isDemo) {
            console.log('Demo user - falling back to mock data');
            setCameras(mockCameras);
          } else {
            toast.error('You do not have permission to view cameras');
          }
        } else {
          console.log('API failed for other reason');
          if (isDemo) {
            console.log('Demo user - falling back to mock data');
            setCameras(mockCameras);
          } else {
            toast.error('Failed to fetch cameras from API. Please try again later.');
          }
        }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Subscribe to camera status updates
    const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
      if (data.type === 'camera_status_update') {
        setCameras(prev => prev.map(camera => 
          camera.camera_id === data.payload.cameraId 
            ? { ...camera, status: data.payload.status }
            : camera
        ));
      }
    });

    // Subscribe to camera stream updates
    const unsubscribeCameraStream = subscribe('camera_stream_update', (data) => {
      if (data.type === 'camera_stream_update') {
        setCameras(prev => prev.map(camera => 
          camera.camera_id === data.payload.cameraId 
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
        camera.camera_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (camera.location_description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (camera.site_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(camera => camera.status === statusFilter);
    }

    if (siteFilter !== 'all') {
      filtered = filtered.filter(camera => camera.site_id === siteFilter);
    }

    setFilteredCameras(filtered);
  }, [cameras, searchTerm, statusFilter, siteFilter]);

  const handleDeleteCamera = async (cameraId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to delete cameras');
      return;
    }

    // Check if this is a demo user
    const token = localStorage.getItem('auth_token');
    const sessionData = localStorage.getItem('auth_session');
    let session = null;
    if (sessionData) {
      try {
        session = JSON.parse(sessionData);
      } catch (e) {
        console.error('Failed to parse session data:', e);
      }
    }
    const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;

    if (window.confirm('Are you sure you want to delete this camera? This action cannot be undone.')) {
      if (isDemoUser) {
        // For demo users, just remove from local state
        setCameras(prev => prev.filter(camera => camera.camera_id !== cameraId));
        toast.success('Camera deleted (demo mode)');
        return;
      }

      try {
        await apiClient.delete(`/api/v1/cameras/${cameraId}`);
        toast.success('Camera deleted successfully');
        // Refresh the cameras list
        fetchCameras();
      } catch (error: any) {
        console.error('Error deleting camera:', error);
        if (error.response?.status === 403) {
          toast.error('You do not have permission to delete cameras');
        } else if (error.response?.status === 404) {
          toast.error('Camera not found');
        } else if (error.response?.status === 400) {
          // Check if it's the active alerts error
          if (error.response?.data?.detail?.includes('active alerts')) {
            // Check if user is admin and offer force delete option
            const isAdmin = user?.role === 'Administrator';
            if (isAdmin) {
              const forceDelete = window.confirm(
                'This camera has active alerts. Do you want to force delete it anyway? This will delete the camera and all associated alerts.'
              );
              if (forceDelete) {
                try {
                  await apiClient.delete(`/api/v1/cameras/${cameraId}?force=true`);
                  toast.success('Camera force deleted successfully');
                  fetchCameras();
                  return;
                } catch (forceError: any) {
                  console.error('Error force deleting camera:', forceError);
                  toast.error('Failed to force delete camera. Please try again.');
                  return;
                }
              }
            } else {
              toast.error('Cannot delete camera with active alerts. Please resolve the alerts first or contact an administrator.');
            }
          } else {
            toast.error('Invalid request. Please check the camera data and try again.');
          }
        } else {
          toast.error('Failed to delete camera. Please try again.');
        }
      }
    }
  };

  const handleEditCamera = async (camera: CameraSystem) => {
    if (!isAuthenticated) {
      toast.error('Please log in to edit cameras');
      return;
    }

    setEditingCamera(camera);
    setShowEditModal(true);
  };

  const toggleStreaming = async (cameraId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to control camera streaming');
      return;
    }

    // Check if this is a demo user
    const token = localStorage.getItem('auth_token');
    const sessionData = localStorage.getItem('auth_session');
    let session = null;
    if (sessionData) {
      try {
        session = JSON.parse(sessionData);
      } catch (e) {
        console.error('Failed to parse session data:', e);
      }
    }
    const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;

    try {
      const camera = cameras.find(c => c.camera_id === cameraId);
      if (!camera) return;

      const newStatus = camera.isStreaming ? 'Inactive' : 'Active';
      
      if (isDemoUser) {
        // For demo users, just update local state
        setCameras(prev => prev.map(c => 
          c.camera_id === cameraId 
            ? { ...c, isStreaming: !c.isStreaming, status: newStatus }
            : c
        ));
        toast.success(`Camera streaming ${camera.isStreaming ? 'stopped' : 'started'} (demo mode)`);
        return;
      }

      await apiClient.put(`/api/v1/cameras/${cameraId}`, {
        status: newStatus
      });

      // Update local state
      setCameras(prev => prev.map(c => 
        c.camera_id === cameraId 
          ? { ...c, isStreaming: !c.isStreaming, status: newStatus }
          : c
      ));

      toast.success(`Camera streaming ${camera.isStreaming ? 'stopped' : 'started'}`);
    } catch (error: any) {
      console.error('Error toggling streaming:', error);
      toast.error('Failed to toggle camera streaming');
    }
  };

  const toggleRecording = async (cameraId: string) => {
    if (!isAuthenticated) {
      toast.error('Please log in to control camera recording');
      return;
    }

    // Check if this is a demo user
    const token = localStorage.getItem('auth_token');
    const sessionData = localStorage.getItem('auth_session');
    let session = null;
    if (sessionData) {
      try {
        session = JSON.parse(sessionData);
      } catch (e) {
        console.error('Failed to parse session data:', e);
      }
    }
    const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;

    try {
      const camera = cameras.find(c => c.camera_id === cameraId);
      if (!camera) return;

      // Update local state
      setCameras(prev => prev.map(c => 
        c.camera_id === cameraId 
          ? { ...c, isRecording: !c.isRecording }
          : c
      ));

      if (isDemoUser) {
        toast.success(`Camera recording ${camera.isRecording ? 'stopped' : 'started'} (demo mode)`);
      } else {
        toast.success(`Camera recording ${camera.isRecording ? 'stopped' : 'started'}`);
      }
    } catch (error: any) {
      console.error('Error toggling recording:', error);
      toast.error('Failed to toggle camera recording');
    }
  };

  const getStatusCount = (status: string) => {
    return cameras.filter(camera => camera.status === status).length;
  };

  const getTotalUptime = () => {
    const total = cameras.reduce((sum, camera) => sum + (camera.uptime || 0), 0);
    return cameras.length > 0 ? (total / cameras.length).toFixed(1) : '0';
  };

  const getTotalAlerts = () => {
    return cameras.reduce((total, camera) => total + (camera.alertsGenerated || 0), 0);
  };

  const getUniqueSites = () => {
    return Array.from(new Set(cameras.map(camera => camera.site_id)));
  };

  const handleUpdateCamera = async (cameraData: {
    camera_name: string;
    site_id: string;
    location_description: string;
    stream_url: string;
    installation_date: string;
    resolution: string;
    fps: number;
  }) => {
    if (!isAuthenticated || !editingCamera) {
      toast.error('Please log in to update cameras');
      return;
    }

    setUpdatingCamera(true);
    
    try {
      // Check if this is a demo user
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      let session = null;
      if (sessionData) {
        try {
          session = JSON.parse(sessionData);
        } catch (e) {
          console.error('Failed to parse session data:', e);
        }
      }
      const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;

      if (isDemoUser) {
        // For demo users, just update local state
        setCameras(prev => prev.map(c => 
          c.camera_id === editingCamera.camera_id 
            ? {
                ...c,
                camera_name: cameraData.camera_name,
                site_id: cameraData.site_id,
                location_description: cameraData.location_description,
                stream_url: cameraData.stream_url,
                installation_date: cameraData.installation_date,
                resolution: cameraData.resolution,
                fps: cameraData.fps,
                settings: {
                  resolution: cameraData.resolution,
                  fps: cameraData.fps
                }
              }
            : c
        ));
        toast.success('Camera updated successfully (demo mode)');
        setShowEditModal(false);
        setEditingCamera(null);
        return;
      }

      // For real users, call the API
      await apiClient.put(`/api/v1/cameras/${editingCamera.camera_id}`, {
        camera_name: cameraData.camera_name,
        site_id: cameraData.site_id,
        location_description: cameraData.location_description,
        stream_url: cameraData.stream_url,
        installation_date: new Date(cameraData.installation_date).toISOString(),
        settings: {
          resolution: cameraData.resolution,
          fps: cameraData.fps
        }
      });

      toast.success('Camera updated successfully');
      setShowEditModal(false);
      setEditingCamera(null);
      
      // Refresh the cameras list
      fetchCameras();
      
    } catch (error: any) {
      console.error('Error updating camera:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to update cameras');
      } else if (error.response?.status === 400) {
        toast.error('Invalid camera data. Please check your input.');
      } else {
        toast.error('Failed to update camera. Please try again.');
      }
    } finally {
      setUpdatingCamera(false);
    }
  };

  const handleAddCamera = async (cameraData: {
    camera_name: string;
    site_id: string;
    location_description: string;
    stream_url: string;
    installation_date: string;
    resolution: string;
    fps: number;
  }) => {
    if (!isAuthenticated) {
      toast.error('Please log in to add cameras');
      return;
    }

    setAddingCamera(true);
    
    try {
      // Check if this is a demo user
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      let session = null;
      if (sessionData) {
        try {
          session = JSON.parse(sessionData);
        } catch (e) {
          console.error('Failed to parse session data:', e);
        }
      }
      const isDemoUser = token?.startsWith('demo-token-') || session?.isApiUser === false;

      if (isDemoUser) {
        // For demo users, add to local state
        const newCamera: CameraSystem = {
          camera_id: `CAM_${Date.now()}`,
          camera_name: cameraData.camera_name,
          site_id: cameraData.site_id,
          site_name: 'Demo Site', // You can enhance this to get actual site name
          location_description: cameraData.location_description,
          stream_url: cameraData.stream_url,
          status: 'Active',
          isStreaming: false,
          isRecording: false,
          uptime: 0,
          resolution: cameraData.resolution,
          fps: cameraData.fps,
          alertsGenerated: 0,
          lastMaintenance: new Date().toISOString().split('T')[0],
          installation_date: cameraData.installation_date,
          settings: {
            resolution: cameraData.resolution,
            fps: cameraData.fps
          }
        };
        
        setCameras(prev => [...prev, newCamera]);
        toast.success('Camera added successfully (demo mode)');
        setShowAddModal(false);
        return;
      }

      // For real users, call the API
      const response = await apiClient.post('/api/v1/cameras', {
        camera_name: cameraData.camera_name,
        site_id: cameraData.site_id,
        location_description: cameraData.location_description,
        stream_url: cameraData.stream_url,
        installation_date: new Date(cameraData.installation_date).toISOString(),
        settings: {
          resolution: cameraData.resolution,
          fps: cameraData.fps
        }
      });

      toast.success('Camera added successfully');
      setShowAddModal(false);
      
      // Refresh the cameras list
      fetchCameras();
      
    } catch (error: any) {
      console.error('Error adding camera:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to add cameras');
      } else if (error.response?.status === 400) {
        toast.error('Invalid camera data. Please check your input.');
      } else {
        toast.error('Failed to add camera. Please try again.');
      }
    } finally {
      setAddingCamera(false);
    }
  };





  return (
    <div className="py-8">

      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Camera Systems</h1>
          <p className="mt-2 text-gray-600">
            {cameras.length === 0 
              ? 'Get started by adding cameras to monitor your construction sites'
              : 'Manage and monitor camera systems across all construction sites'
            }
          </p>
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
              <p className="text-xs text-gray-500">
                {cameras.length === 0 ? 'No cameras added' : `${getStatusCount('Active')} active`}
              </p>
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
              <p className="text-xs text-gray-500">
                {cameras.length === 0 ? 'No data available' : 'System reliability'}
              </p>
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
              <p className="text-xs text-gray-500">
                {cameras.length === 0 ? 'No streams active' : 'Currently streaming'}
              </p>
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
              <p className="text-xs text-gray-500">
                {cameras.length === 0 ? 'No alerts generated' : 'Generated this month'}
              </p>
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
                    const camera = cameras.find(c => c.site_id === siteId);
                    return (
                      <option key={siteId} value={siteId}>
                        {camera?.site_name || siteId}
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
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {cameras.length === 0 ? 'Cameras' : `Cameras (${filteredCameras.length})`}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-2 px-3 py-1 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Camera</span>
              </button>
              <button
                onClick={fetchCameras}
                disabled={loading}
                className={cn(
                  'flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 transition-colors',
                  loading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading cameras...</p>
          </div>
        ) : (
          <>
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
                      <tr key={camera.camera_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{camera.camera_name}</div>
                            <div className="text-sm text-gray-500">{camera.location_description || 'N/A'}</div>
                            <div className="text-xs text-gray-400">{camera.resolution || 'N/A'} @ {camera.fps || 'N/A'}fps</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{camera.site_name || 'N/A'}</div>
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
                              onClick={() => toggleStreaming(camera.camera_id)}
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
                              onClick={() => toggleRecording(camera.camera_id)}
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
                              disabled={!isAuthenticated}
                              className={cn(
                                isAuthenticated
                                  ? "text-primary-600 hover:text-primary-900" 
                                  : "text-gray-400 cursor-not-allowed"
                              )}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCamera(camera.camera_id)}
                              disabled={!isAuthenticated}
                              className={cn(
                                isAuthenticated
                                  ? "text-red-600 hover:text-red-900" 
                                  : "text-gray-400 cursor-not-allowed"
                              )}
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
                {cameras.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras added yet</h3>
                    <p className="text-gray-600">Get started by adding your first camera to monitor your construction site</p>
                                         <div className="mt-4">
                       <button
                         onClick={() => setShowAddModal(true)}
                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                       >
                         <Camera className="h-4 w-4 mr-2" />
                         Add Camera
                       </button>
                     </div>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No cameras found</h3>
                    <p className="text-gray-600">Try adjusting your filters or search terms</p>
                  </>
                )}
              </div>
            )}
          </>
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

       {/* Add Camera Modal */}
       {showAddModal && (
         <AddCameraModal
           onClose={() => setShowAddModal(false)}
           onAdd={handleAddCamera}
           loading={addingCamera}
           sites={getUniqueSites().map(siteId => {
             const camera = cameras.find(c => c.site_id === siteId);
             return {
               site_id: siteId,
               site_name: camera?.site_name || siteId
             };
           })}
         />
       )}

       {/* Edit Camera Modal */}
       {showEditModal && editingCamera && (
         <EditCameraModal
           camera={editingCamera}
           onClose={() => {
             setShowEditModal(false);
             setEditingCamera(null);
           }}
           onUpdate={handleUpdateCamera}
           loading={updatingCamera}
           sites={getUniqueSites().map(siteId => {
             const camera = cameras.find(c => c.site_id === siteId);
             return {
               site_id: siteId,
               site_name: camera?.site_name || siteId
             };
           })}
         />
       )}


     </div>
   );
 }

 // Add Camera Modal Component
 function AddCameraModal({ 
   onClose, 
   onAdd, 
   loading, 
   sites 
 }: { 
   onClose: () => void; 
   onAdd: (data: any) => void; 
   loading: boolean; 
   sites: { site_id: string; site_name: string }[] 
 }) {
   const [formData, setFormData] = useState({
     camera_name: '',
     site_id: '',
     location_description: '',
     stream_url: '',
     installation_date: new Date().toISOString().split('T')[0], // Default to today
     resolution: '1920x1080',
     fps: 30
   });

   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.camera_name || !formData.site_id || !formData.location_description || !formData.stream_url || !formData.installation_date) {
       toast.error('Please fill in all required fields');
       return;
     }
     onAdd(formData);
   };

   const handleChange = (field: string, value: string | number) => {
     setFormData(prev => ({ ...prev, [field]: value }));
   };

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
         <div className="flex items-center justify-between p-6 border-b border-gray-200">
           <h2 className="text-lg font-semibold text-gray-900">Add New Camera</h2>
           <button
             onClick={onClose}
             className="text-gray-400 hover:text-gray-600 transition-colors"
           >
             <X className="h-6 w-6" />
           </button>
         </div>
         
         <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Camera Name *
             </label>
             <input
               type="text"
               value={formData.camera_name}
               onChange={(e) => handleChange('camera_name', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="Enter camera name"
               required
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Site *
             </label>
             <select
               value={formData.site_id}
               onChange={(e) => handleChange('site_id', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               required
             >
               <option value="">Select a site</option>
               {sites.map(site => (
                 <option key={site.site_id} value={site.site_id}>
                   {site.site_name}
                 </option>
               ))}
               <option value="SITE_DEMO">Demo Site</option>
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Location Description *
             </label>
             <input
               type="text"
               value={formData.location_description}
               onChange={(e) => handleChange('location_description', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="e.g., Main Entrance, Loading Dock"
               required
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Stream URL *
             </label>
             <input
               type="url"
               value={formData.stream_url}
               onChange={(e) => handleChange('stream_url', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="e.g., rtsp://camera-ip:554/stream, http://camera-ip/video"
               required
             />
             <p className="mt-1 text-xs text-gray-500">
               Enter the camera's stream URL (RTSP, HTTP, or other streaming protocol)
             </p>
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Installation Date *
             </label>
             <input
               type="date"
               value={formData.installation_date}
               onChange={(e) => handleChange('installation_date', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               required
             />
             <p className="mt-1 text-xs text-gray-500">
               When was this camera installed?
             </p>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Resolution
               </label>
               <select
                 value={formData.resolution}
                 onChange={(e) => handleChange('resolution', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               >
                 <option value="1920x1080">1920x1080 (Full HD)</option>
                 <option value="1280x720">1280x720 (HD)</option>
                 <option value="2560x1440">2560x1440 (2K)</option>
                 <option value="3840x2160">3840x2160 (4K)</option>
               </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Frame Rate (FPS)
               </label>
               <select
                 value={formData.fps}
                 onChange={(e) => handleChange('fps', parseInt(e.target.value))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               >
                 <option value={15}>15 FPS</option>
                 <option value={24}>24 FPS</option>
                 <option value={30}>30 FPS</option>
                 <option value={60}>60 FPS</option>
               </select>
             </div>
           </div>

           <div className="flex items-center justify-end space-x-3 pt-4">
             <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={loading}
               className={cn(
                 'px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors',
                 loading && 'opacity-50 cursor-not-allowed'
               )}
             >
               {loading ? 'Adding...' : 'Add Camera'}
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 }

 // Edit Camera Modal Component
 function EditCameraModal({ 
   camera,
   onClose, 
   onUpdate, 
   loading, 
   sites 
 }: { 
   camera: CameraSystem;
   onClose: () => void; 
   onUpdate: (data: any) => void; 
   loading: boolean; 
   sites: { site_id: string; site_name: string }[] 
 }) {
   const [formData, setFormData] = useState({
     camera_name: camera.camera_name,
     site_id: camera.site_id,
     location_description: camera.location_description || '',
     stream_url: camera.stream_url,
     installation_date: camera.installation_date ? new Date(camera.installation_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
     resolution: camera.resolution || '1920x1080',
     fps: camera.fps || 30
   });

   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (!formData.camera_name || !formData.site_id || !formData.location_description || !formData.stream_url || !formData.installation_date) {
       toast.error('Please fill in all required fields');
       return;
     }
     onUpdate(formData);
   };

   const handleChange = (field: string, value: string | number) => {
     setFormData(prev => ({ ...prev, [field]: value }));
   };

   return (
     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
       <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
         <div className="flex items-center justify-between p-6 border-b border-gray-200">
           <h2 className="text-lg font-semibold text-gray-900">Edit Camera</h2>
           <button
             onClick={onClose}
             className="text-gray-400 hover:text-gray-600 transition-colors"
           >
             <X className="h-6 w-6" />
           </button>
         </div>
         
         <form onSubmit={handleSubmit} className="p-6 space-y-4">
           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Camera Name *
             </label>
             <input
               type="text"
               value={formData.camera_name}
               onChange={(e) => handleChange('camera_name', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="Enter camera name"
               required
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Site *
             </label>
             <select
               value={formData.site_id}
               onChange={(e) => handleChange('site_id', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               required
             >
               <option value="">Select a site</option>
               {sites.map(site => (
                 <option key={site.site_id} value={site.site_id}>
                   {site.site_name}
                 </option>
               ))}
               <option value="SITE_DEMO">Demo Site</option>
             </select>
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Location Description *
             </label>
             <input
               type="text"
               value={formData.location_description}
               onChange={(e) => handleChange('location_description', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="e.g., Main Entrance, Loading Dock"
               required
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Stream URL *
             </label>
             <input
               type="url"
               value={formData.stream_url}
               onChange={(e) => handleChange('stream_url', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               placeholder="e.g., rtsp://camera-ip:554/stream, http://camera-ip/video"
               required
             />
             <p className="mt-1 text-xs text-gray-500">
               Enter the camera's stream URL (RTSP, HTTP, or other streaming protocol)
             </p>
           </div>

           <div>
             <label className="block text-sm font-medium text-gray-700 mb-2">
               Installation Date *
             </label>
             <input
               type="date"
               value={formData.installation_date}
               onChange={(e) => handleChange('installation_date', e.target.value)}
               className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               required
             />
             <p className="mt-1 text-xs text-gray-500">
               When was this camera installed?
             </p>
           </div>

           <div className="grid grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Resolution
               </label>
               <select
                 value={formData.resolution}
                 onChange={(e) => handleChange('resolution', e.target.value)}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               >
                 <option value="1920x1080">1920x1080 (Full HD)</option>
                 <option value="1280x720">1280x720 (HD)</option>
                 <option value="2560x1440">2560x1440 (2K)</option>
                 <option value="3840x2160">3840x2160 (4K)</option>
               </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-gray-700 mb-2">
                 Frame Rate (FPS)
               </label>
               <select
                 value={formData.fps}
                 onChange={(e) => handleChange('fps', parseInt(e.target.value))}
                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
               >
                 <option value={15}>15 FPS</option>
                 <option value={24}>24 FPS</option>
                 <option value={30}>30 FPS</option>
                 <option value={60}>60 FPS</option>
               </select>
             </div>
           </div>

           <div className="flex items-center justify-end space-x-3 pt-4">
             <button
               type="button"
               onClick={onClose}
               className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
             >
               Cancel
             </button>
             <button
               type="submit"
               disabled={loading}
               className={cn(
                 'px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors',
                 loading && 'opacity-50 cursor-not-allowed'
               )}
             >
               {loading ? 'Updating...' : 'Update Camera'}
             </button>
           </div>
         </form>
       </div>
     </div>
   );
 }
