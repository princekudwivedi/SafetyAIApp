import { useState, useEffect, useCallback } from 'react';
import { cameraAPI, Camera, CameraCreate, CameraUpdate, CameraFilters } from '@/lib/api/cameras';

interface UseCamerasReturn {
  cameras: Camera[];
  loading: boolean;
  error: string | null;
  createCamera: (cameraData: CameraCreate) => Promise<Camera>;
  updateCamera: (cameraId: string, updateData: CameraUpdate) => Promise<Camera>;
  deleteCamera: (cameraId: string) => Promise<void>;
  refreshCameras: () => Promise<void>;
  getCamera: (cameraId: string) => Promise<Camera>;
}

export function useCameras(filters?: CameraFilters): UseCamerasReturn {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCameras = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cameraAPI.getCameras(filters);
      setCameras(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cameras');
      console.error('Error fetching cameras:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const createCamera = useCallback(async (cameraData: CameraCreate): Promise<Camera> => {
    try {
      setError(null);
      const newCamera = await cameraAPI.createCamera(cameraData);
      setCameras(prev => [...prev, newCamera]);
      return newCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create camera';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const updateCamera = useCallback(async (cameraId: string, updateData: CameraUpdate): Promise<Camera> => {
    try {
      setError(null);
      const updatedCamera = await cameraAPI.updateCamera(cameraId, updateData);
      setCameras(prev => prev.map(camera => 
        camera.camera_id === cameraId ? updatedCamera : camera
      ));
      return updatedCamera;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update camera';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const deleteCamera = useCallback(async (cameraId: string): Promise<void> => {
    try {
      setError(null);
      await cameraAPI.deleteCamera(cameraId);
      setCameras(prev => prev.filter(camera => camera.camera_id !== cameraId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete camera';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const getCamera = useCallback(async (cameraId: string): Promise<Camera> => {
    try {
      setError(null);
      return await cameraAPI.getCamera(cameraId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get camera';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  const refreshCameras = useCallback(async () => {
    await fetchCameras();
  }, [fetchCameras]);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  return {
    cameras,
    loading,
    error,
    createCamera,
    updateCamera,
    deleteCamera,
    refreshCameras,
    getCamera,
  };
}
