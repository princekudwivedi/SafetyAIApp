'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Camera, Play, Pause, Square, Settings, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning';
  streamUrl: string;
  lastFrame?: string;
}

const mockCameras: Camera[] = [
  {
    id: 'CAM_01',
    name: 'Zone 1 - Main Entrance',
    location: 'Zone 1',
    status: 'online',
    streamUrl: '/api/v1/video/stream/CAM_01',
  },
  {
    id: 'CAM_02',
    name: 'Zone 1 - Construction Site',
    location: 'Zone 1',
    status: 'online',
    streamUrl: '/api/v1/video/stream/CAM_02',
  },
  {
    id: 'CAM_03',
    name: 'Zone 2 - Loading Dock',
    location: 'Zone 2',
    status: 'warning',
    streamUrl: '/api/v1/video/stream/CAM_03',
  },
  {
    id: 'CAM_04',
    name: 'Zone 2 - Equipment Storage',
    location: 'Zone 2',
    status: 'offline',
    streamUrl: '/api/v1/video/stream/CAM_04',
  },
  {
    id: 'CAM_05',
    name: 'Zone 3 - Warehouse',
    location: 'Zone 3',
    status: 'online',
    streamUrl: '/api/v1/video/stream/CAM_05',
  },
];

export function LiveMonitoring() {
  const { subscribe, isConnected } = useWebSocket();
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>(mockCameras);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Subscribe to camera status updates
    const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
      if (data.type === 'camera_status_update') {
        setCameras(prev => prev.map(cam => 
          cam.id === data.payload.cameraId 
            ? { ...cam, status: data.payload.status }
            : cam
        ));
      }
    });

    // Subscribe to video frame updates
    const unsubscribeVideoFrame = subscribe('video_frame', (data) => {
      if (data.type === 'video_frame' && selectedCamera) {
        // Update the last frame for the selected camera
        setCameras(prev => prev.map(cam => 
          cam.id === selectedCamera.id 
            ? { ...cam, lastFrame: data.payload.frameUrl }
            : cam
        ));
      }
    });

    return () => {
      unsubscribeCameraStatus();
      unsubscribeVideoFrame();
    };
  }, [subscribe, selectedCamera]);

  const handleCameraSelect = (camera: Camera) => {
    setSelectedCamera(camera);
    setIsStreaming(false);
  };

  const toggleStreaming = () => {
    if (selectedCamera) {
      setIsStreaming(!isStreaming);
      // In a real app, this would call the API to start/stop streaming
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // In a real app, this would call the API to start/stop recording
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'offline':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Live Monitoring</h1>
        <p className="mt-2 text-gray-600">
          Real-time video monitoring and AI-powered safety analysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Camera List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Cameras</h2>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <Settings className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {cameras.map((camera) => (
                <div
                  key={camera.id}
                  onClick={() => handleCameraSelect(camera)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedCamera?.id === camera.id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{camera.name}</span>
                    {getStatusIcon(camera.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{camera.location}</p>
                  <span className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                    getStatusColor(camera.status)
                  )}>
                    {camera.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow">
            {selectedCamera ? (
              <>
                {/* Video Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {selectedCamera.name}
                      </h3>
                      <p className="text-sm text-gray-600">{selectedCamera.location}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        getStatusColor(selectedCamera.status)
                      )}>
                        {selectedCamera.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Video Display */}
                <div className="p-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    {isStreaming ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                          <p>Streaming...</p>
                          <p className="text-sm text-gray-300">AI Analysis Active</p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-center text-white">
                          <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                          <p className="text-lg font-medium">Camera Ready</p>
                          <p className="text-sm text-gray-400">Click play to start streaming</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={toggleStreaming}
                        className={cn(
                          'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors',
                          isStreaming
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                        )}
                      >
                        {isStreaming ? (
                          <>
                            <Pause className="h-4 w-4" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4" />
                            <span>Start Stream</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={toggleRecording}
                        disabled={!isStreaming}
                        className={cn(
                          'flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors',
                          isRecording
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : isStreaming
                            ? 'bg-gray-600 text-white hover:bg-gray-700'
                            : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                        )}
                      >
                        <Square className="h-4 w-4" />
                        <span>{isRecording ? 'Stop Recording' : 'Record'}</span>
                      </button>
                    </div>

                    <div className="text-sm text-gray-500">
                      {isStreaming ? 'Live • AI Analysis Active' : 'Ready'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-8 text-center">
                <Camera className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Camera</h3>
                <p className="text-gray-600">Choose a camera from the list to start monitoring</p>
              </div>
            )}
          </div>
        </div>
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
