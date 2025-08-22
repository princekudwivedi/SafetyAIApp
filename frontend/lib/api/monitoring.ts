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
  }
};
