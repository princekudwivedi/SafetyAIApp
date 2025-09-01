'use client';

import React, { useState, useEffect } from 'react';
import { Camera as CameraIcon } from 'lucide-react';
import { Camera, CameraCreate, CameraUpdate } from '@/lib/api/cameras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CameraFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CameraCreate | CameraUpdate) => Promise<void>;
  camera?: Camera | null;
  sites: Array<{ site_id: string; site_name: string }>;
  loading?: boolean;
}

export function CameraForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  camera, 
  sites, 
  loading = false 
}: CameraFormProps) {
  const [formData, setFormData] = useState<CameraCreate>({
    site_id: '',
    camera_name: '',
    stream_url: '',
    installation_date: new Date().toISOString().split('T')[0],
    location_description: '',
    settings: {}
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (camera) {
      setFormData({
        site_id: camera.site_id,
        camera_name: camera.camera_name,
        stream_url: camera.stream_url,
        installation_date: camera.installation_date.split('T')[0],
        location_description: camera.location_description || '',
        settings: camera.settings || {}
      });
    } else {
      setFormData({
        site_id: '',
        camera_name: '',
        stream_url: '',
        installation_date: new Date().toISOString().split('T')[0],
        location_description: '',
        settings: {}
      });
    }
    setErrors({});
  }, [camera, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.site_id) {
      newErrors.site_id = 'Site is required';
    }

    if (!formData.camera_name.trim()) {
      newErrors.camera_name = 'Camera name is required';
    }

    if (!formData.stream_url.trim()) {
      newErrors.stream_url = 'Stream URL is required';
    } else if (!isValidUrl(formData.stream_url)) {
      newErrors.stream_url = 'Please enter a valid URL';
    }

    if (!formData.installation_date) {
      newErrors.installation_date = 'Installation date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting camera form:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[650px] max-h-[85vh] overflow-y-auto bg-white">
        <DialogHeader className="pb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CameraIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-gray-900">
                {camera ? 'Edit Camera' : 'Add New Camera'}
              </DialogTitle>
              <p className="text-gray-500 mt-2 leading-relaxed">
                {camera 
                  ? 'Update camera information and settings for better monitoring'
                  : 'Configure a new camera to enhance your construction site safety monitoring'
                }
              </p>
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Site Selection */}
          <div className="space-y-3">
            <Label htmlFor="site_id" className="text-sm font-semibold text-gray-800 flex items-center">
              Site <span className="text-red-500 ml-1">*</span>
            </Label>
                         <Select
               value={formData.site_id}
               onValueChange={(value) => handleInputChange('site_id', value)}
             >
               <SelectTrigger className={errors.site_id ? 'border-red-500 focus:border-red-500 ring-red-200' : ''}>
                 <SelectValue placeholder="Choose a construction site" />
               </SelectTrigger>
               <SelectContent>
                 {sites.map((site) => (
                   <SelectItem key={site.site_id} value={site.site_id}>
                     {site.site_name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>
            {errors.site_id && (
              <p className="text-sm text-red-600 flex items-center mt-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.site_id}
              </p>
            )}
          </div>

          {/* Camera Name */}
          <div className="space-y-3">
            <Label htmlFor="camera_name" className="text-sm font-semibold text-gray-800 flex items-center">
              Camera Name <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="camera_name"
              value={formData.camera_name}
              onChange={(e) => handleInputChange('camera_name', e.target.value)}
              placeholder="e.g., Main Entrance Camera, Zone A Monitor"
              className={`h-12 text-base ${errors.camera_name ? 'border-red-500 focus:border-red-500 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`}
            />
            {errors.camera_name && (
              <p className="text-sm text-red-600 flex items-center mt-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.camera_name}
              </p>
            )}
          </div>

          {/* Stream URL */}
          <div className="space-y-3">
            <Label htmlFor="stream_url" className="text-sm font-semibold text-gray-800 flex items-center">
              Stream URL <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="stream_url"
              value={formData.stream_url}
              onChange={(e) => handleInputChange('stream_url', e.target.value)}
              placeholder="rtsp://192.168.1.100:554/stream1"
              className={`h-12 text-base ${errors.stream_url ? 'border-red-500 focus:border-red-500 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`}
            />
            {errors.stream_url && (
              <p className="text-sm text-red-600 flex items-center mt-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.stream_url}
              </p>
            )}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Supported Formats</p>
                  <p className="text-sm text-blue-700">
                    RTSP, HTTP, HTTPS, and other streaming protocols are supported for camera integration.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Location Description */}
          <div className="space-y-3">
            <Label htmlFor="location_description" className="text-sm font-semibold text-gray-800">
              Location Description
            </Label>
            <Input
              id="location_description"
              value={formData.location_description}
              onChange={(e) => handleInputChange('location_description', e.target.value)}
              placeholder="e.g., Main entrance, Loading dock, Construction area"
              className="h-12 text-base border-gray-300 focus:border-blue-500 focus:ring-blue-200"
            />
            <p className="text-sm text-gray-500 flex items-center">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
              Optional: Describe where this camera is positioned for better organization
            </p>
          </div>

          {/* Installation Date */}
          <div className="space-y-3">
            <Label htmlFor="installation_date" className="text-sm font-semibold text-gray-800 flex items-center">
              Installation Date <span className="text-red-500 ml-1">*</span>
            </Label>
            <Input
              id="installation_date"
              type="date"
              value={formData.installation_date}
              onChange={(e) => handleInputChange('installation_date', e.target.value)}
              className={`h-12 text-base ${errors.installation_date ? 'border-red-500 focus:border-red-500 ring-red-200' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'}`}
            />
            {errors.installation_date && (
              <p className="text-sm text-red-600 flex items-center mt-2">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2"></span>
                {errors.installation_date}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-8 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-8 py-3 h-12 text-base font-medium border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-8 py-3 h-12 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                camera ? 'Update Camera' : 'Create Camera'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
