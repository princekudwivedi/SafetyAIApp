import { apiClient } from './client';

export interface CameraMonitoringStatus {
  camera_id: string;
  name: string;
  location: string;
  zone: string;
  status: string;
  stream_url: string;
  is_streaming: boolean;
  is_recording: boolean;
  last_frame: string | null;
  installation_date: string | null;
  settings: Record<string, any>;
}

export interface StreamResponse {
  message: string;
  camera_id: string;
  status: string;
}

export interface RecordingResponse {
  message: string;
  recording_id?: string;
  start_time?: string;
  duration?: string;
  file_path?: string;
}

export interface RecordingStatus {
  camera_id: string;
  is_recording: boolean;
  recording_id?: string;
  start_time?: string;
  duration?: string;
  message: string;
}

export interface RecordingInfo {
  recording_id: string;
  camera_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  file_size: number;
  file_path: string;
  filename: string;
}

export interface VideoUploadResponse {
  upload_id: string;
  camera_id: string;
  filename: string;
  file_size: number;
  status: string;
  message: string;
}

export interface VideoProcessingResponse {
  upload_id: string;
  status: string;
  message: string;
}

export interface VideoUpload {
  upload_id: string;
  camera_id: string;
  filename: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  upload_time: string;
  file_size: number;
  description?: string;
  process_start_time?: string;
  process_end_time?: string;
  alerts_generated?: number;
  processing_progress?: number;
}

export interface VideoUploadsList {
  uploads: VideoUpload[];
  total: number;
  skip: number;
  limit: number;
}

export const monitoringApi = {
  // Get all cameras with monitoring status
  async getCamerasMonitoringStatus(): Promise<CameraMonitoringStatus[]> {
    const response = await apiClient.get('/api/v1/cameras/monitoring/status');
    return response.data;
  },

  // Start video streaming for a camera
  async startVideoStream(cameraId: string): Promise<StreamResponse> {
    const response = await apiClient.post(`/api/v1/video/start/${cameraId}`);
    return response.data;
  },

  // Get live video stream URL for a camera
  getLiveVideoStreamUrl(cameraId: string): string {
    return `${apiClient.defaults.baseURL}/api/v1/video/live/${cameraId}`;
  },

  // Stop video streaming for a camera
  async stopVideoStream(cameraId: string): Promise<StreamResponse> {
    const response = await apiClient.post(`/api/v1/video/stop/${cameraId}`);
    return response.data;
  },

  // Get video stream status for a camera
  async getVideoStreamStatus(cameraId: string): Promise<any> {
    const response = await apiClient.get(`/api/v1/video/status/${cameraId}`);
    return response.data;
  },

  // Start recording for a camera
  async startRecording(cameraId: string): Promise<RecordingResponse> {
    const response = await apiClient.post(`/api/v1/video/record/start/${cameraId}`);
    return response.data;
  },

  // Stop recording for a camera
  async stopRecording(cameraId: string): Promise<RecordingResponse> {
    const response = await apiClient.post(`/api/v1/video/record/stop/${cameraId}`);
    return response.data;
  },

  // Get recording status for a camera
  async getRecordingStatus(cameraId: string): Promise<RecordingStatus> {
    const response = await apiClient.get(`/api/v1/video/record/status/${cameraId}`);
    return response.data;
  },

  // Get list of recordings for a camera
  async getRecordingList(cameraId: string, skip: number = 0, limit: number = 50): Promise<{
    camera_id: string;
    recordings: RecordingInfo[];
    total: number;
  }> {
    const response = await apiClient.get(`/api/v1/video/record/list/${cameraId}?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Download a recording file
  async downloadRecording(recordingId: string): Promise<Blob> {
    const response = await apiClient.get(`/api/v1/video/record/download/${recordingId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  // Get video stream URL for display
  getVideoStreamUrl(cameraId: string): string {
    return `${apiClient.defaults.baseURL}/api/v1/video/stream/${cameraId}`;
  },

  // Upload video file for testing
  async uploadVideoFile(
    file: File,
    cameraId: string,
    description?: string
  ): Promise<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', cameraId);
    if (description) {
      formData.append('description', description);
    }

    const response = await apiClient.post('/api/v1/video/upload-video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Process uploaded video file
  async processVideoFile(uploadId: string): Promise<VideoProcessingResponse> {
    const response = await apiClient.post(`/api/v1/video/process-video/${uploadId}`);
    return response.data;
  },

  // Get upload status
  async getUploadStatus(uploadId: string): Promise<VideoUpload> {
    const response = await apiClient.get(`/api/v1/video/upload-status/${uploadId}`);
    return response.data;
  },

  // List user uploads
  async listUserUploads(skip: number = 0, limit: number = 50): Promise<VideoUploadsList> {
    const response = await apiClient.get(`/api/v1/video/uploads?skip=${skip}&limit=${limit}`);
    return response.data;
  },

  // Delete upload
  async deleteUpload(uploadId: string): Promise<{ upload_id: string; message: string }> {
    const response = await apiClient.delete(`/api/v1/video/upload/${uploadId}`);
    return response.data;
  }
};
