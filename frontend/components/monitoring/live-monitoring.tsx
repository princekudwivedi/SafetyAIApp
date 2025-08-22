'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Camera, Play, Pause, Square, Settings, AlertTriangle, Wifi, WifiOff, Download, Clock, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { monitoringApi, CameraMonitoringStatus, RecordingInfo } from '@/lib/api/monitoring';

export function LiveMonitoring() {
  const { subscribe, isConnected } = useWebSocket();
  const [selectedCamera, setSelectedCamera] = useState<CameraMonitoringStatus | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameras, setCameras] = useState<CameraMonitoringStatus[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  // Refs for video element and recording
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Load cameras data from backend
  const loadCamerasData = useCallback(async () => {
    try {
      setIsLoading(true);
      setHasError(false);
      
      const camerasData = await monitoringApi.getCamerasMonitoringStatus();
      setCameras(camerasData);
      
      // Update streaming and recording status for selected camera
      if (selectedCamera) {
        const updatedCamera = camerasData.find(cam => cam.camera_id === selectedCamera.camera_id);
        if (updatedCamera) {
          setSelectedCamera(updatedCamera);
          setIsStreaming(updatedCamera.is_streaming);
          setIsRecording(updatedCamera.is_recording);
        }
      }
    } catch (error) {
      console.error('Failed to load cameras data:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCamera]);

  // Load recordings for selected camera
  const loadRecordings = useCallback(async (cameraId: string) => {
    try {
      const recordingsData = await monitoringApi.getRecordingList(cameraId);
      setRecordings(recordingsData.recordings);
    } catch (error) {
      console.error('Failed to load recordings:', error);
    }
  }, []);

  useEffect(() => {
    loadCamerasData();
  }, [loadCamerasData]);

  useEffect(() => {
    // Subscribe to camera status updates
    const unsubscribeCameraStatus = subscribe('camera_status_update', (data) => {
      if (data.type === 'camera_status_update') {
        setCameras(prev => prev.map(cam => 
          cam.camera_id === data.payload.cameraId 
            ? { ...cam, status: data.payload.status }
            : cam
        ));
      }
    });

    // Subscribe to video frame updates
    const unsubscribeVideoFrame = subscribe('video_frame', (data) => {
      if (data.type === 'video_frame' && selectedCamera) {
        setCameras(prev => prev.map(cam => 
          cam.camera_id === selectedCamera.camera_id 
            ? { ...cam, last_frame: data.payload.frameUrl }
            : cam
        ));
      }
    });

    // Subscribe to streaming status updates
    const unsubscribeStreamStatus = subscribe('stream_status_update', (data) => {
      if (data.type === 'stream_status_update' && selectedCamera) {
        if (data.payload.camera_id === selectedCamera.camera_id) {
          setIsStreaming(data.payload.is_streaming);
        }
      }
    });

    // Subscribe to recording status updates
    const unsubscribeRecordingStatus = subscribe('recording_status_update', (data) => {
      if (data.type === 'recording_status_update' && selectedCamera) {
        if (data.payload.camera_id === selectedCamera.camera_id) {
          setIsRecording(data.payload.is_recording);
        }
      }
    });

    return () => {
      unsubscribeCameraStatus();
      unsubscribeVideoFrame();
      unsubscribeStreamStatus();
      unsubscribeRecordingStatus();
    };
  }, [subscribe, selectedCamera]);

  const handleCameraSelect = useCallback(async (camera: CameraMonitoringStatus) => {
    setSelectedCamera(camera);
    setIsStreaming(camera.is_streaming);
    setIsRecording(camera.is_recording);
    
    // Load recordings for the selected camera
    if (showRecordings) {
      await loadRecordings(camera.camera_id);
    }
  }, [showRecordings, loadRecordings]);

  const toggleStreaming = useCallback(async () => {
    if (!selectedCamera) return;

    try {
      if (isStreaming) {
        // Stop streaming
        await monitoringApi.stopVideoStream(selectedCamera.camera_id);
        setIsStreaming(false);
        
        // Stop local video if available
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      } else {
        // Start streaming
        await monitoringApi.startVideoStream(selectedCamera.camera_id);
        setIsStreaming(true);
        
        // Start local video stream if possible
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch (error) {
          console.log('Local video stream not available, using backend stream');
        }
      }
    } catch (error) {
      console.error('Failed to toggle streaming:', error);
    }
  }, [selectedCamera, isStreaming]);

  const toggleRecording = useCallback(async () => {
    if (!selectedCamera) return;

    try {
      if (isRecording) {
        // Stop recording
        await monitoringApi.stopRecording(selectedCamera.camera_id);
        setIsRecording(false);
        
        // Stop local recording
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } else {
        // Start recording
        await monitoringApi.startRecording(selectedCamera.camera_id);
        setIsRecording(true);
        
        // Start local recording if possible
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
          mediaRecorderRef.current = mediaRecorder;
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };
          
          mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `recording_${selectedCamera.camera_id}_${Date.now()}.webm`;
            a.click();
            recordedChunksRef.current = [];
          };
          
          mediaRecorder.start();
        }
      }
    } catch (error) {
      console.error('Failed to toggle recording:', error);
    }
  }, [selectedCamera, isRecording]);

  const downloadRecording = useCallback(async (recordingId: string) => {
    try {
      const blob = await monitoringApi.downloadRecording(recordingId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${recordingId}.mp4`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download recording:', error);
    }
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <Wifi className="h-4 w-4 text-green-600" />;
      case 'Maintenance':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'Inactive':
        return <WifiOff className="h-4 w-4 text-red-600" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading cameras...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="py-8">
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">Failed to load cameras data</p>
          <button 
            onClick={loadCamerasData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

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
                  key={camera.camera_id}
                  onClick={() => handleCameraSelect(camera)}
                  className={cn(
                    'p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedCamera?.camera_id === camera.camera_id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{camera.name}</span>
                    {getStatusIcon(camera.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{camera.location}</p>
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                      getStatusColor(camera.status)
                    )}>
                      {camera.status}
                    </span>
                    <div className="flex space-x-1">
                      {camera.is_streaming && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      {camera.is_recording && (
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      )}
                    </div>
                  </div>
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
                      <p className="text-sm text-gray-600">{selectedCamera.location} • {selectedCamera.zone}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={cn(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                        getStatusColor(selectedCamera.status)
                      )}>
                        {selectedCamera.status}
                      </span>
                      <button
                        onClick={() => {
                          setShowRecordings(!showRecordings);
                          if (!showRecordings) {
                            loadRecordings(selectedCamera.camera_id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <HardDrive className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Video Display */}
                <div className="p-4">
                  <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                    {isStreaming ? (
                      <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        autoPlay
                        muted
                        playsInline
                      />
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
                      {isRecording && ' • Recording'}
                    </div>
                  </div>

                  {/* Recordings List */}
                  {showRecordings && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-3">Recordings</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {recordings.length === 0 ? (
                          <p className="text-gray-500 text-sm">No recordings available</p>
                        ) : (
                          recordings.map((recording) => (
                            <div
                              key={recording.recording_id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center space-x-3">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {new Date(recording.start_time).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Duration: {Math.round(recording.duration / 60)}m {recording.duration % 60}s
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => downloadRecording(recording.recording_id)}
                                className="p-2 text-gray-400 hover:text-gray-600"
                                title="Download recording"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
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
