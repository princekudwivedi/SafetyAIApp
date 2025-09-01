'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Site, SiteCreate, SiteUpdate } from '@/lib/api/sites';

interface SiteFormProps {
  site?: Site | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SiteCreate | SiteUpdate) => Promise<void>;
  loading?: boolean;
}

export function SiteForm({ site, isOpen, onClose, onSubmit, loading = false }: SiteFormProps) {
  const [formData, setFormData] = useState<SiteCreate>({
    site_name: '',
    location: '',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
    status: 'active',
    worker_count: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (site) {
      setFormData({
        site_name: site.site_name,
        location: site.location,
        contact_person: site.contact_person,
        contact_email: site.contact_email || '',
        contact_phone: site.contact_phone || '',
        status: site.status,
        worker_count: site.worker_count,
      });
    } else {
      setFormData({
        site_name: '',
        location: '',
        contact_person: '',
        contact_email: '',
        contact_phone: '',
        status: 'active',
        worker_count: 0,
      });
    }
    setErrors({});
  }, [site, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.site_name.trim()) {
      newErrors.site_name = 'Site name is required';
    }

    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }

    if (!formData.contact_person.trim()) {
      newErrors.contact_person = 'Contact person is required';
    }

    if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Invalid email format';
    }

    if (formData.contact_phone && !/^[\+]?[1-9][\d]{0,15}$/.test(formData.contact_phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.contact_phone = 'Invalid phone number format';
    }

    if (formData.worker_count != null && formData.worker_count < 0) {
      newErrors.worker_count = 'Worker count cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
      console.error('Error submitting form:', error);
    }
  };

  const handleInputChange = (field: keyof SiteCreate, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {site ? 'Edit Site' : 'Add New Site'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Site Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Site Name *
              </label>
              <input
                type="text"
                value={formData.site_name}
                onChange={(e) => handleInputChange('site_name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.site_name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter site name"
                disabled={loading}
              />
              {errors.site_name && (
                <p className="mt-1 text-sm text-red-600">{errors.site_name}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location *
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.location ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter site location"
                disabled={loading}
              />
              {errors.location && (
                <p className="mt-1 text-sm text-red-600">{errors.location}</p>
              )}
            </div>

            {/* Contact Person */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => handleInputChange('contact_person', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.contact_person ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter contact person name"
                disabled={loading}
              />
              {errors.contact_person && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_person}</p>
              )}
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => handleInputChange('contact_email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.contact_email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter contact email"
                disabled={loading}
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_email}</p>
              )}
            </div>

            {/* Contact Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.contact_phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter contact phone"
                disabled={loading}
              />
              {errors.contact_phone && (
                <p className="mt-1 text-sm text-red-600">{errors.contact_phone}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive' | 'maintenance')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            {/* Worker Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Worker Count
              </label>
              <input
                type="number"
                min="0"
                value={formData.worker_count}
                onChange={(e) => handleInputChange('worker_count', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.worker_count ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter number of workers"
                disabled={loading}
              />
              {errors.worker_count && (
                <p className="mt-1 text-sm text-red-600">{errors.worker_count}</p>
              )}
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {site ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {site ? 'Update Site' : 'Create Site'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
