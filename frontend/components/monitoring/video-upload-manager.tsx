'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Play, Trash2, AlertTriangle, CheckCircle, Clock, FileVideo } from 'lucide-react';
import { monitoringApi, VideoUpload, CameraMonitoringStatus } from '@/lib/api/monitoring';
import { cn } from '@/lib/utils';

interface VideoUploadManagerProps {
  selectedCamera: CameraMonitoringStatus | null;
  onAlertGenerated?: () => void;
}

export function VideoUploadManager({ selectedCamera, onAlertGenerated }: VideoUploadManagerProps) {
  const [uploads, setUploads] = useState<VideoUpload[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [showUploads, setShowUploads] = useState(false);

  // Load user uploads
  const loadUploads = useCallback(async () => {
    try {
      const response = await monitoringApi.listUserUploads();
      setUploads(response.uploads);
    } catch (error) {
      console.error('Failed to load uploads:', error);
    }
  }, []);

  // Load uploads on mount
  useEffect(() => {
    loadUploads();
  }, [loadUploads]);

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        alert('Please select a valid video file');
        return;
      }
      
      // Validate file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        alert('File size must be less than 100MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile || !selectedCamera) return;

    try {
      setIsLoading(true);
      
      const response = await monitoringApi.uploadVideoFile(
        selectedFile,
        selectedCamera.camera_id,
        description
      );
      
      console.log('Video uploaded successfully:', response);
      
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setSelectedFile(null);
      
      // Reload uploads
      await loadUploads();
      
      // Show success message
      alert('Video uploaded successfully! You can now process it to test alert generation.');
      
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle video processing
  const handleProcessVideo = async (uploadId: string) => {
    try {
      const response = await monitoringApi.processVideoFile(uploadId);
      console.log('Video processing started:', response);
      
      // Update local state
      setUploads(prev => prev.map(upload => 
        upload.upload_id === uploadId 
          ? { ...upload, status: 'processing' as const }
          : upload
      ));
      
      // Start polling for status updates
      pollUploadStatus(uploadId);
      
      alert('Video processing started! This may take several minutes depending on the video length.');
      
    } catch (error) {
      console.error('Failed to start processing:', error);
      alert('Failed to start video processing. Please try again.');
    }
  };

  // Poll upload status
  const pollUploadStatus = async (uploadId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const status = await monitoringApi.getUploadStatus(uploadId);
        
        // Update local state
        setUploads(prev => prev.map(upload => 
          upload.upload_id === uploadId ? status : upload
        ));
        
        // Update progress
        if (status.processing_progress !== undefined) {
          setUploadProgress(prev => ({
            ...prev,
            [uploadId]: status.processing_progress
          }));
        }
        
        // Stop polling if processing is complete
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollInterval);
          
          if (status.status === 'completed' && status.alerts_generated && status.alerts_generated > 0) {
            alert(`Video processing completed! ${status.alerts_generated} alerts were generated. Check the Alerts section to view them.`);
            onAlertGenerated?.();
          } else if (status.status === 'completed') {
            alert('Video processing completed! No alerts were generated from this video.');
          } else {
            alert('Video processing failed. Please try again.');
          }
        }
        
      } catch (error) {
        console.error('Failed to get upload status:', error);
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds
    
    // Cleanup after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 10 * 60 * 1000);
  };

  // Handle upload deletion
  const handleDeleteUpload = async (uploadId: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;
    
    try {
      await monitoringApi.deleteUpload(uploadId);
      await loadUploads();
      alert('Upload deleted successfully');
    } catch (error) {
      console.error('Failed to delete upload:', error);
      alert('Failed to delete upload. Please try again.');
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <FileVideo className="h-4 w-4 text-blue-600" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <FileVideo className="h-4 w-4 text-gray-400" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Video Upload Testing</h3>
        <button
          onClick={() => setShowUploads(!showUploads)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showUploads ? 'Hide Uploads' : 'Show Uploads'}
        </button>
      </div>

      {/* Upload Form */}
      <div className="mb-6 p-4 border border-gray-200 rounded-lg">
        <h4 className="text-md font-medium text-gray-900 mb-4">Upload Video File for Alert Testing</h4>
        
        {!selectedCamera ? (
          <div className="text-center py-4 text-gray-500">
            Please select a camera first to upload a video file
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selected Camera: {selectedCamera.name}
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">
                Supported formats: MP4, AVI, MOV, etc. Max size: 100MB
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (Optional)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Test video for unauthorized access detection"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <button
              onClick={handleUpload}
              disabled={!selectedFile || isLoading}
              className={cn(
                'w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white',
                !selectedFile || isLoading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              )}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Video
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Uploads List */}
      {showUploads && (
        <div className="border-t pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Your Video Uploads</h4>
          
          {uploads.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No video uploads yet
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map((upload) => (
                <div
                  key={upload.upload_id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-gray-300"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(upload.status)}
                      <div>
                        <p className="font-medium text-gray-900">{upload.filename}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(upload.file_size)} • {new Date(upload.upload_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <span className={cn(
                      'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                      getStatusColor(upload.status)
                    )}>
                      {upload.status}
                    </span>
                  </div>
                  
                  {upload.description && (
                    <p className="text-sm text-gray-600 mb-3">{upload.description}</p>
                  )}
                  
                  {/* Progress bar for processing */}
                  {upload.status === 'processing' && uploadProgress[upload.upload_id] !== undefined && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Processing...</span>
                        <span>{uploadProgress[upload.upload_id]}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[upload.upload_id]}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {/* Alerts generated info */}
                  {upload.status === 'completed' && upload.alerts_generated !== undefined && (
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm text-green-800">
                        ✅ {upload.alerts_generated} alert{upload.alerts_generated !== 1 ? 's' : ''} generated
                      </p>
                    </div>
                  )}
                  
                  {/* Action buttons */}
                  <div className="flex items-center space-x-2">
                    {upload.status === 'uploaded' && (
                      <button
                        onClick={() => handleProcessVideo(upload.upload_id)}
                        className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <Play className="h-4 w-4" />
                        <span>Process for Alerts</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDeleteUpload(upload.upload_id)}
                      className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
