import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  systemSettingsApi, 
  SystemSetting, 
  SystemSettingsResponse, 
  SystemHealthResponse,
  SettingCategory 
} from '@/lib/api/system-settings';

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalSettings, setOriginalSettings] = useState<SystemSetting[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // Load settings from backend
  const loadSettings = useCallback(async (category?: SettingCategory) => {
    try {
      setLoading(true);
      setError(null);
      
      const response: SystemSettingsResponse = await systemSettingsApi.getSettings(category);
      setSettings(response.settings);
      setOriginalSettings(response.settings);
      setHasChanges(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
      setError(errorMessage);
      toast.error(`Failed to load settings: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load system health
  const loadSystemHealth = useCallback(async () => {
    try {
      setHealthLoading(true);
      const health = await systemSettingsApi.getSystemHealth();
      setSystemHealth(health);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback((key: string, value: string | number | boolean) => {
    setSettings(prev => prev.map(setting => 
      setting.key === key ? { ...setting, value } : setting
    ));
    setHasChanges(true);
  }, []);

  // Save all changes
  const saveChanges = useCallback(async () => {
    try {
      // Find changed settings
      const changedSettings = settings.filter(setting => {
        const original = originalSettings.find(s => s.key === setting.key);
        return original && original.value !== setting.value;
      });

      if (changedSettings.length === 0) {
        toast.error('No changes to save');
        return;
      }

      // Update each changed setting
      const updates = changedSettings.map(setting => ({
        key: setting.key,
        value: setting.value
      }));

      await systemSettingsApi.updateMultipleSettings(updates);
      
      // Update original settings
      setOriginalSettings(settings);
      setHasChanges(false);
      
      toast.success(`Successfully saved ${changedSettings.length} setting(s)`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(`Failed to save settings: ${errorMessage}`);
      throw err;
    }
  }, [settings, originalSettings]);

  // Reset settings to original values
  const resetSettings = useCallback(() => {
    setSettings(originalSettings);
    setHasChanges(false);
    toast.success('Settings reset to last saved values');
  }, [originalSettings]);

  // Reset all settings to defaults
  const resetToDefaults = useCallback(async () => {
    try {
      const response = await systemSettingsApi.resetSettings();
      setSettings(response.settings);
      setOriginalSettings(response.settings);
      setHasChanges(false);
      toast.success('Settings reset to default values');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset settings';
      toast.error(`Failed to reset settings: ${errorMessage}`);
    }
  }, []);

  // Get settings by category
  const getSettingsByCategory = useCallback((category: SettingCategory) => {
    return settings.filter(setting => setting.category === category);
  }, [settings]);

  // Get a specific setting by key
  const getSetting = useCallback((key: string) => {
    return settings.find(setting => setting.key === key);
  }, [settings]);

  // Auto-refresh system health
  useEffect(() => {
    loadSystemHealth();
    
    // Refresh health every 30 seconds
    const interval = setInterval(loadSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, [loadSystemHealth]);

  return {
    // State
    settings,
    loading,
    error,
    hasChanges,
    systemHealth,
    healthLoading,
    
    // Actions
    loadSettings,
    loadSystemHealth,
    updateSetting,
    saveChanges,
    resetSettings,
    resetToDefaults,
    getSettingsByCategory,
    getSetting,
  };
}
