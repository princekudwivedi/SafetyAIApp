import { apiClient } from './client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  site: {
    id: string;
    name: string;
    location: string;
  } | null;
  isActive: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
  lastLogin: string;
  statistics: {
    totalAlerts: number;
    totalReports: number;
    lastActivity: string | null;
  };
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserSettings {
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  privacy: {
    profileVisibility: string;
    activityLog: boolean;
    dataSharing: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    theme: string;
  };
  security: {
    twoFactorAuth: boolean;
    sessionTimeout: number;
    loginNotifications: boolean;
  };
}

export interface AccountSecurity {
  accountStatus: {
    isActive: boolean;
    lastLogin: string;
    accountCreated: string;
    lastPasswordChange: string | null;
  };
  twoFactorAuth: {
    enabled: boolean;
    method: string;
    backupCodes: string[];
  };
  loginHistory: any[];
  activeSessions: any[];
  securityScore: number;
  recommendations: string[];
}

export class ProfileAPI {
  /**
   * Get current user's profile information
   */
  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get('/api/v1/profile/profile');
    return response.data;
  }

  /**
   * Update current user's profile information
   */
  static async updateProfile(profileData: ProfileUpdateData): Promise<UserProfile> {
    const response = await apiClient.put('/api/v1/profile/profile', profileData);
    return response.data;
  }

  /**
   * Change current user's password
   */
  static async changePassword(passwordData: PasswordChangeData): Promise<{ message: string }> {
    const response = await apiClient.put('/api/v1/profile/password', passwordData);
    return response.data;
  }

  /**
   * Get current user's settings and preferences
   */
  static async getSettings(): Promise<UserSettings> {
    const response = await apiClient.get('/api/v1/profile/settings');
    return response.data;
  }

  /**
   * Update current user's settings and preferences
   */
  static async updateSettings(settingsData: Partial<UserSettings>): Promise<{ message: string }> {
    const response = await apiClient.put('/api/v1/profile/settings', settingsData);
    return response.data;
  }

  /**
   * Get current user's account security information
   */
  static async getAccountSecurity(): Promise<AccountSecurity> {
    const response = await apiClient.get('/api/v1/profile/security');
    return response.data;
  }

  /**
   * Enable two-factor authentication
   */
  static async enableTwoFactorAuth(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/v1/profile/security/enable-2fa');
    return response.data;
  }

  /**
   * Disable two-factor authentication
   */
  static async disableTwoFactorAuth(): Promise<{ message: string }> {
    const response = await apiClient.post('/api/v1/profile/security/disable-2fa');
    return response.data;
  }
}
