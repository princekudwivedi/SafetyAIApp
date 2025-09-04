'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/use-profile';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Edit, 
  Save, 
  X,
  Camera,
  MapPin,
  Clock,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserProfile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { profile, loading, error, updateProfile, fetchProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when profile loads
  useEffect(() => {
    if (profile) {

      setFormData({
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
      });
    }
  }, [profile]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const updatedProfile = await updateProfile(formData);
      console.log('Profile updated successfully:', updatedProfile);
      
      // Force refresh the profile data to show updated information
      await fetchProfile();
      
      setIsEditing(false);
      // Show success message
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        first_name: profile.firstName,
        last_name: profile.lastName,
        email: profile.email,
      });
    }
    setIsEditing(false);
  };


  if (!user) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-gray-500">User not found</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-red-500">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="py-8">
        <div className="text-center">
          <p className="text-gray-500">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
            <p className="mt-2 text-gray-600">
              Manage your account information and preferences
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <div className="mx-auto h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center mb-4">
                <span className="text-3xl font-bold text-primary-700">
                  {profile.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {profile.fullName || profile.username || 'User'}
              </h2>
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 mb-4">
                <Shield className="h-4 w-4 mr-2" />
                {profile.role || 'User'}
              </div>
              <p className="text-sm text-gray-500">
                Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Username
                </label>
                <p className="text-gray-900">{profile.username || 'Not set'}</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900">{profile.email || 'Not set'}</p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                                 {isEditing ? (
                   <input
                     type="text"
                     value={formData.first_name}
                     onChange={(e) => handleInputChange('first_name', e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   />
                 ) : (
                   <p className="text-gray-900">{profile.firstName || 'Not set'}</p>
                 )}

              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                                 {isEditing ? (
                   <input
                     type="text"
                     value={formData.last_name}
                     onChange={(e) => handleInputChange('last_name', e.target.value)}
                     className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                   />
                 ) : (
                   <p className="text-gray-900">{profile.lastName || 'Not set'}</p>
                 )}
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Shield className="h-4 w-4 inline mr-2" />
                  Role
                </label>
                <p className="text-gray-900">{user.role || 'Not set'}</p>
              </div>

              {/* Site ID */}
              {user.site_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Site ID
                  </label>
                  <p className="text-gray-900">{user.site_id}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Status
                </label>
                <span className={cn(
                  "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                  user.is_active 
                    ? "bg-green-100 text-green-800" 
                    : "bg-red-100 text-red-800"
                )}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Created Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Created Date
                </label>
                <p className="text-gray-900">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>

              {/* Last Updated */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Last Updated
                </label>
                <p className="text-gray-900">
                  {user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>


          {/* Account Actions */}
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Account Actions</h3>
            </div>
            
            <div className="p-6 space-y-4">
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Settings className="h-4 w-4 mr-2" />
                Account Settings
              </button>
              
              

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
