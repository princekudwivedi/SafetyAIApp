'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { Camera, Play, Pause, Square, Settings, AlertTriangle, Wifi, WifiOff, Download, Clock, HardDrive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { monitoringApi, CameraMonitoringStatus, RecordingInfo } from '@/lib/api/monitoring';

export function LiveMonitoringWithCentralizedErrorHandling() {
  const { subscribe, isConnected } = useWebSocket();
  const { handleApiError, getErrorMessage, isAuthError } = useErrorHandler();
  
  const [selectedCamera, setSelectedCamera] = useState<CameraMonitoringStatus | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameras, setCameras] = useState<CameraMonitoringStatus[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showRecordings, setShowRecordings] = useState(false);
  const [recordings, setRecordings] = useState<RecordingInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  
  // Refs for video element and recording
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Load cameras data from backend with centralized error handling
  const loadCamerasData = useCallback(async () => {
    try {
      console.log('Loading cameras data...');
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      // Add timeout protection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 15000);
      });
      
      const camerasDataPromise = monitoringApi.getCamerasMonitoringStatus();
      const camerasData = await Promise.race([camerasDataPromise, timeoutPromise]) as CameraMonitoringStatus[];
      
      console.log('Cameras data loaded:', camerasData.length, 'cameras');
      setCameras(camerasData);
      
      // Update streaming and recording status for selected camera
      if (selectedCamera) {
        const updatedCamera = camerasData.find((cam: CameraMonitoringStatus) => cam.camera_id === selectedCamera.camera_id);
        if (updatedCamera) {
          setSelectedCamera(updatedCamera);
          setIsStreaming(updatedCamera.is_streaming);
          setIsRecording(updatedCamera.is_recording);
        }
      }
    } catch (error) {
      console.error('Failed to load cameras data:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // Check if it's an authentication error
      if (isAuthError(error)) {
        // Authentication errors are handled centrally, just set local state
        setHasError(true);
        setErrorMessage('Authentication failed. Please log in again.');
        setCameras([]);
      } else {
        // For other errors, show user-friendly message
        setHasError(true);
        setErrorMessage(getErrorMessage(error));
        setCameras([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [handleApiError, isAuthError, getErrorMessage, selectedCamera]);

  // Load recordings for selected camera with centralized error handling
  const loadRecordings = useCallback(async (cameraId: string) => {
    try {
      const recordingsData = await monitoringApi.getRecordingList(cameraId);
      setRecordings(recordingsData.recordings);
    } catch (error) {
      console.error('Failed to load recordings:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // For recording errors, we might want to show a specific message
      if (isAuthError(error)) {
        // Auth errors are handled centrally
        return;
      }
      
      // Show user-friendly error message
      setErrorMessage('Failed to load recordings. Please try again.');
    }
  }, [handleApiError, isAuthError]);

  // Start video stream with centralized error handling
  const startVideoStream = useCallback(async (cameraId: string) => {
    try {
      setIsVideoLoading(true);
      const response = await monitoringApi.startVideoStream(cameraId);
      console.log('Video stream started:', response);
      
      // Update camera status
      setCameras(prev => prev.map(cam => 
        cam.camera_id === cameraId 
          ? { ...cam, is_streaming: true }
          : cam
      ));
      
      if (selectedCamera?.camera_id === cameraId) {
        setIsStreaming(true);
      }
    } catch (error) {
      console.error('Failed to start video stream:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // Show user-friendly error message
      if (!isAuthError(error)) {
        setErrorMessage('Failed to start video stream. Please try again.');
      }
    } finally {
      setIsVideoLoading(false);
    }
  }, [handleApiError, isAuthError, selectedCamera]);

  // Stop video stream with centralized error handling
  const stopVideoStream = useCallback(async (cameraId: string) => {
    try {
      const response = await monitoringApi.stopVideoStream(cameraId);
      console.log('Video stream stopped:', response);
      
      // Update camera status
      setCameras(prev => prev.map(cam => 
        cam.camera_id === cameraId 
          ? { ...cam, is_streaming: false }
          : cam
      ));
      
      if (selectedCamera?.camera_id === cameraId) {
        setIsStreaming(false);
      }
    } catch (error) {
      console.error('Failed to stop video stream:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // Show user-friendly error message
      if (!isAuthError(error)) {
        setErrorMessage('Failed to stop video stream. Please try again.');
      }
    }
  }, [handleApiError, isAuthError, selectedCamera]);

  // Start recording with centralized error handling
  const startRecording = useCallback(async (cameraId: string) => {
    try {
      const response = await monitoringApi.startRecording(cameraId);
      console.log('Recording started:', response);
      
      // Update camera status
      setCameras(prev => prev.map(cam => 
        cam.camera_id === cameraId 
          ? { ...cam, is_recording: true }
          : cam
      ));
      
      if (selectedCamera?.camera_id === cameraId) {
        setIsRecording(true);
      }
      
      // Load updated recordings
      await loadRecordings(cameraId);
    } catch (error) {
      console.error('Failed to start recording:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // Show user-friendly error message
      if (!isAuthError(error)) {
        setErrorMessage('Failed to start recording. Please try again.');
      }
    }
  }, [handleApiError, isAuthError, loadRecordings, selectedCamera]);

  // Stop recording with centralized error handling
  const stopRecording = useCallback(async (cameraId: string) => {
    try {
      const response = await monitoringApi.stopRecording(cameraId);
      console.log('Recording stopped:', response);
      
      // Update camera status
      setCameras(prev => prev.map(cam => 
        cam.camera_id === cameraId 
          ? { ...cam, is_recording: false }
          : cam
      ));
      
      if (selectedCamera?.camera_id === cameraId) {
        setIsRecording(false);
      }
      
      // Load updated recordings
      await loadRecordings(cameraId);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      
      // Use centralized error handling
      handleApiError(error);
      
      // Show user-friendly error message
      if (!isAuthError(error)) {
        setErrorMessage('Failed to stop recording. Please try again.');
      }
    }
  }, [handleApiError, isAuthError, loadRecordings, selectedCamera]);

  useEffect(() => {
    console.log('Component mounted, loading cameras data...');
    loadCamerasData();
  }, [loadCamerasData]);

  // Update selected camera status when cameras data changes
  useEffect(() => {
    if (selectedCamera && cameras.length > 0) {
      const updatedCamera = cameras.find(cam => cam.camera_id === selectedCamera.camera_id);
      if (updatedCamera) {
        setSelectedCamera(updatedCamera);
        setIsStreaming(updatedCamera.is_streaming);
        setIsRecording(updatedCamera.is_recording);
      }
    }
  }, [cameras, selectedCamera]);

  // Clear error message after a delay
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Example of how to handle video element errors
  const handleVideoError = useCallback((error: any) => {
    console.error('Video element error:', error);
    
    // For video errors, we might want to show a specific message
    setErrorMessage('Video playback error. Please try refreshing the stream.');
  }, []);

  // Example of how to handle WebSocket errors
  const handleWebSocketError = useCallback((error: any) => {
    console.error('WebSocket error:', error);
    
    // For WebSocket errors, we might want to show a specific message
    setErrorMessage('Real-time connection lost. Trying to reconnect...');
  }, []);

  // Example render method showing error display
  const renderErrorDisplay = () => {
    if (hasError || errorMessage) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {hasError ? 'Failed to load cameras' : 'Error occurred'}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{errorMessage || 'An unexpected error occurred. Please try again.'}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  className="bg-red-100 text-red-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  onClick={() => {
                    setHasError(false);
                    setErrorMessage('');
                    loadCamerasData();
                  }}
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Live Monitoring</h2>
        <div className="flex items-center space-x-2">
          <div className={cn(
            "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium",
            isConnected 
              ? "bg-green-100 text-green-800" 
              : "bg-red-100 text-red-800"
          )}>
            {isConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {renderErrorDisplay()}

      {/* Rest of the component would go here */}
      <div className="text-gray-500 text-center py-8">
        <p>This is an example component showing centralized error handling.</p>
        <p>The actual implementation would include the full monitoring interface.</p>
      </div>
    </div>
  );
}
