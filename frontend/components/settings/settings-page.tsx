'use client';

import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { Settings, User, Shield, Database, Bell, Monitor, Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SystemSetting {
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean' | 'select';
  label: string;
  description: string;
  options?: string[];
  category: string;
}

const mockSettings: SystemSetting[] = [
  // AI Settings
  {
    key: 'ai_model_path',
    value: '/models/yolov8n.pt',
    type: 'string',
    label: 'AI Model Path',
    description: 'Path to the YOLO model file',
    category: 'ai'
  },
  {
    key: 'confidence_threshold',
    value: 0.5,
    type: 'number',
    label: 'Confidence Threshold',
    description: 'Minimum confidence score for object detection (0.0 - 1.0)',
    category: 'ai'
  },
  {
    key: 'nms_threshold',
    value: 0.4,
    type: 'number',
    label: 'NMS Threshold',
    description: 'Non-maximum suppression threshold (0.0 - 1.0)',
    category: 'ai'
  },
  {
    key: 'enable_ai_processing',
    value: true,
    type: 'boolean',
    label: 'Enable AI Processing',
    description: 'Enable real-time AI object detection',
    category: 'ai'
  },

  // Video Settings
  {
    key: 'frame_rate',
    value: 30,
    type: 'number',
    label: 'Frame Rate',
    description: 'Video processing frame rate (fps)',
    category: 'video'
  },
  {
    key: 'frame_width',
    value: 1920,
    type: 'number',
    label: 'Frame Width',
    description: 'Video frame width in pixels',
    category: 'video'
  },
  {
    key: 'frame_height',
    value: 1080,
    type: 'number',
    label: 'Frame Height',
    description: 'Video frame height in pixels',
    category: 'video'
  },
  {
    key: 'enable_recording',
    value: true,
    type: 'boolean',
    label: 'Enable Recording',
    description: 'Allow video recording functionality',
    category: 'video'
  },

  // Notification Settings
  {
    key: 'email_notifications',
    value: true,
    type: 'boolean',
    label: 'Email Notifications',
    description: 'Send email alerts for safety violations',
    category: 'notifications'
  },
  {
    key: 'sms_notifications',
    value: false,
    type: 'boolean',
    label: 'SMS Notifications',
    description: 'Send SMS alerts for critical violations',
    category: 'notifications'
  },
  {
    key: 'notification_frequency',
    value: 'immediate',
    type: 'select',
    label: 'Notification Frequency',
    description: 'How often to send notifications',
    options: ['immediate', 'hourly', 'daily', 'weekly'],
    category: 'notifications'
  },

  // System Settings
  {
    key: 'log_level',
    value: 'INFO',
    type: 'select',
    label: 'Log Level',
    description: 'System logging verbosity',
    options: ['DEBUG', 'INFO', 'WARNING', 'ERROR'],
    category: 'system'
  },
  {
    key: 'auto_backup',
    value: true,
    type: 'boolean',
    label: 'Auto Backup',
    description: 'Automatically backup system data',
    category: 'system'
  },
  {
    key: 'maintenance_mode',
    value: false,
    type: 'boolean',
    label: 'Maintenance Mode',
    description: 'Enable system maintenance mode',
    category: 'system'
  }
];

const categories = [
  { id: 'ai', name: 'AI Settings', icon: Shield, color: 'text-purple-600' },
  { id: 'video', name: 'Video Settings', icon: Monitor, color: 'text-blue-600' },
  { id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-green-600' },
  { id: 'system', name: 'System Settings', icon: Settings, color: 'text-gray-600' },
];

export function SettingsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const [activeTab, setActiveTab] = useState('ai');
  const [settings, setSettings] = useState<SystemSetting[]>(mockSettings);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSettingChange = (key: string, value: string | number | boolean) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, this would save to the backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      setHasChanges(false);
      // Show success message
      console.log('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(mockSettings);
    setHasChanges(false);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    switch (setting.type) {
      case 'string':
        return (
          <input
            type="text"
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        );
      
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) => handleSettingChange(setting.key, e.target.checked)}
              className="sr-only"
            />
            <div className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              setting.value ? 'bg-primary-600' : 'bg-gray-300'
            )}>
              <span className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                setting.value ? 'translate-x-6' : 'translate-x-1'
              )} />
            </div>
          </label>
        );
      
      case 'select':
        return (
          <select
            value={setting.value as string}
            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {setting.options?.map(option => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      default:
        return null;
    }
  };

  const getCategorySettings = (categoryId: string) => {
    return settings.filter(setting => setting.category === categoryId);
  };

  return (
    <div className="py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
            <p className="mt-2 text-gray-600">
              Configure system preferences, AI parameters, and notification settings
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {hasChanges && (
              <div className="flex items-center text-yellow-600 text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Unsaved changes
              </div>
            )}
            <button
              onClick={handleReset}
              disabled={!hasChanges}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Reset</span>
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-4 w-4" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {categories.map((category) => {
              const CategoryIcon = category.icon;
              const isActive = activeTab === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={cn(
                    'flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors',
                    isActive
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  <CategoryIcon className={cn('h-5 w-5', category.color)} />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {categories.map((category) => {
            if (category.id !== activeTab) return null;
            
            const categorySettings = getCategorySettings(category.id);
            
            return (
              <div key={category.id} className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-gray-600">
                    Configure {category.name.toLowerCase()} for the system
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {categorySettings.map((setting) => (
                    <div key={setting.key} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-900 mb-1">
                            {setting.label}
                          </label>
                          <p className="text-sm text-gray-600 mb-3">
                            {setting.description}
                          </p>
                          {renderSettingInput(setting)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {categorySettings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No settings available for this category</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center space-x-3">
            <div className={cn(
              'w-3 h-3 rounded-full',
              isConnected ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm text-gray-700">
              WebSocket Connection: {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700">
              Database: Connected
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700">
              AI Model: Loaded
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-sm text-gray-700">
              File System: Ready
            </span>
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
