'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/hooks/use-auth';
import { useSystemSettings } from '@/hooks/use-system-settings';
import { 
  Settings, Shield, Monitor, Bell, Save, RotateCcw, AlertTriangle, 
  RefreshCw, CheckCircle, XCircle, Database, Wifi, Cpu, HardDrive
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { cn } from '@/lib/utils';
import { SystemSetting, SettingCategory } from '@/lib/api/system-settings';

const categories = [
  { id: 'ai', name: 'AI Settings', icon: Shield, color: 'text-purple-600', description: 'Configure AI model parameters and processing settings' },
  { id: 'video', name: 'Video Settings', icon: Monitor, color: 'text-blue-600', description: 'Manage video processing and recording settings' },
  { id: 'notifications', name: 'Notifications', icon: Bell, color: 'text-green-600', description: 'Configure alert and notification preferences' },
  { id: 'system', name: 'System Settings', icon: Settings, color: 'text-gray-600', description: 'System-wide configuration and maintenance settings' },
];

export function SettingsPage() {
  const { subscribe, isConnected } = useWebSocket();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingCategory>('ai');
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const {
    settings,
    loading,
    error,
    hasChanges,
    systemHealth,
    healthLoading,
    loadSettings,
    loadSystemHealth,
    updateSetting,
    saveChanges,
    resetSettings,
    resetToDefaults,
    getSettingsByCategory,
  } = useSystemSettings();

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubscribe = subscribe('system_status_update', (data) => {
      // Refresh system health when we receive updates
      loadSystemHealth();
    });

    return () => unsubscribe();
  }, [subscribe, loadSystemHealth]);

  // Check permissions
  const canViewSettings = currentUser?.role === UserRole.ADMINISTRATOR || currentUser?.role === UserRole.SUPERVISOR;
  const canEditSettings = currentUser?.role === UserRole.ADMINISTRATOR;

  const handleSave = async () => {
    if (!canEditSettings) {
      return;
    }

    setIsSaving(true);
    try {
      await saveChanges();
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (!canEditSettings) {
      return;
    }
    resetSettings();
  };

  const handleResetToDefaults = async () => {
    if (!canEditSettings) {
      return;
    }

    setIsResetting(true);
    try {
      await resetToDefaults();
    } catch (error) {
      console.error('Failed to reset settings:', error);
    } finally {
      setIsResetting(false);
    }
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const isDisabled = !canEditSettings;

    switch (setting.type) {
      case 'string':
        return (
          <input
            type="text"
            value={setting.value as string}
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={setting.value as number}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value)) {
                updateSetting(setting.key, value);
              }
            }}
            min={setting.min_value}
            max={setting.max_value}
            step={setting.key.includes('threshold') ? 0.1 : 1}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );
      
      case 'boolean':
        return (
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={setting.value as boolean}
              onChange={(e) => updateSetting(setting.key, e.target.checked)}
              disabled={isDisabled}
              className="sr-only"
            />
            <div className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              setting.value ? 'bg-primary-600' : 'bg-gray-300',
              isDisabled && 'opacity-50 cursor-not-allowed'
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
            onChange={(e) => updateSetting(setting.key, e.target.value)}
            disabled={isDisabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
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

  const renderSystemStatus = () => {
    if (!systemHealth) return null;

    const statusItems = [
      {
        label: 'WebSocket Connection',
        status: isConnected,
        icon: Wifi,
        color: isConnected ? 'text-green-600' : 'text-red-600'
      },
      {
        label: 'Database Connection',
        status: systemHealth.status.database_connected,
        icon: Database,
        color: systemHealth.status.database_connected ? 'text-green-600' : 'text-red-600'
      },
      {
        label: 'AI Model Loaded',
        status: systemHealth.status.ai_model_loaded,
        icon: Shield,
        color: systemHealth.status.ai_model_loaded ? 'text-green-600' : 'text-red-600'
      },
      {
        label: 'File System Ready',
        status: systemHealth.status.file_system_ready,
        icon: HardDrive,
        color: systemHealth.status.file_system_ready ? 'text-green-600' : 'text-red-600'
      }
    ];

    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
          <button
            onClick={loadSystemHealth}
            disabled={healthLoading}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', healthLoading && 'animate-spin')} />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center space-x-3">
                <Icon className={cn('h-5 w-5', item.color)} />
                <span className="text-sm text-gray-700">{item.label}:</span>
                <span className={cn(
                  'text-sm font-medium',
                  item.status ? 'text-green-600' : 'text-red-600'
                )}>
                  {item.status ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            );
          })}
        </div>

        {systemHealth.uptime && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>System Uptime: {systemHealth.uptime}</span>
              <span>Version: {systemHealth.version}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Loading system settings...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Error loading settings</p>
            <p className="text-gray-600 text-sm mb-4">{error}</p>
            <button
              onClick={() => loadSettings()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show permission denied
  if (!canViewSettings) {
    return (
      <div className="py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <XCircle className="h-8 w-8 mx-auto mb-4 text-red-600" />
            <p className="text-red-600 mb-2">Access Denied</p>
            <p className="text-gray-600 text-sm">
              You don't have permission to view system settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const categorySettings = getSettingsByCategory(activeTab);

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
            {canEditSettings && (
              <>
                <button
                  onClick={handleReset}
                  disabled={!hasChanges}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Reset</span>
                </button>
                <button
                  onClick={handleResetToDefaults}
                  disabled={isResetting}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>{isResetting ? 'Resetting...' : 'Reset to Defaults'}</span>
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || isSaving}
                  className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </>
            )}
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
                  onClick={() => setActiveTab(category.id as SettingCategory)}
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
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {categories.find(c => c.id === activeTab)?.name}
            </h3>
            <p className="text-gray-600">
              {categories.find(c => c.id === activeTab)?.description}
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
                    {setting.min_value !== undefined && setting.max_value !== undefined && (
                      <p className="text-xs text-gray-500 mt-1">
                        Range: {setting.min_value} - {setting.max_value}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {categorySettings.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No settings available for this category</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status */}
      {renderSystemStatus()}

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
