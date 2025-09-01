import { useState, useEffect, useCallback } from 'react';
import { ProfileAPI, UserProfile, ProfileUpdateData, PasswordChangeData, UserSettings, AccountSecurity } from '@/lib/api/profile';

// Hook for managing user profile
export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProfileAPI.getProfile();
      setProfile(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (profileData: ProfileUpdateData) => {
    try {
      setError(null);
      const updatedProfile = await ProfileAPI.updateProfile(profileData);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  }, []);

  const changePassword = useCallback(async (passwordData: PasswordChangeData) => {
    try {
      setError(null);
      const result = await ProfileAPI.changePassword(passwordData);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to change password');
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    changePassword,
  };
};

// Hook for managing user settings
export const useSettings = () => {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProfileAPI.getSettings();
      setSettings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (settingsData: Partial<UserSettings>) => {
    try {
      setError(null);
      const result = await ProfileAPI.updateSettings(settingsData);
      
      // Update local state with new settings
      if (settings) {
        setSettings({ ...settings, ...settingsData });
      }
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
      throw err;
    }
  }, [settings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
};

// Hook for managing account security
export const useAccountSecurity = () => {
  const [security, setSecurity] = useState<AccountSecurity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await ProfileAPI.getAccountSecurity();
      setSecurity(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch security information');
    } finally {
      setLoading(false);
    }
  }, []);

  const enableTwoFactorAuth = useCallback(async () => {
    try {
      setError(null);
      const result = await ProfileAPI.enableTwoFactorAuth();
      
      // Refresh security data
      await fetchSecurity();
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to enable 2FA');
      throw err;
    }
  }, [fetchSecurity]);

  const disableTwoFactorAuth = useCallback(async () => {
    try {
      setError(null);
      const result = await ProfileAPI.disableTwoFactorAuth();
      
      // Refresh security data
      await fetchSecurity();
      
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to disable 2FA');
      throw err;
    }
  }, [fetchSecurity]);

  useEffect(() => {
    fetchSecurity();
  }, [fetchSecurity]);

  return {
    security,
    loading,
    error,
    fetchSecurity,
    enableTwoFactorAuth,
    disableTwoFactorAuth,
  };
};

// Combined hook for all profile-related functionality
export const useProfileManagement = () => {
  const profile = useProfile();
  const settings = useSettings();
  const security = useAccountSecurity();

  const refreshAll = useCallback(async () => {
    await Promise.all([
      profile.fetchProfile(),
      settings.fetchSettings(),
      security.fetchSecurity(),
    ]);
  }, [profile.fetchProfile, settings.fetchSettings, security.fetchSecurity]);

  return {
    profile,
    settings,
    security,
    refreshAll,
  };
};
