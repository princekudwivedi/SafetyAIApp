'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, LoginCredentials, UserRole, AuthResponse } from '../types/auth';
import { authApi } from '../lib/api/auth';
import { createAuthErrorHandler } from '../lib/api/auth-error-handler';
import toast from 'react-hot-toast';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (showToast?: boolean) => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dummy login credentials for testing
const DUMMY_CREDENTIALS = [
  { username: 'admin', password: 'admin123', role: 'Administrator' },
  { username: 'supervisor', password: 'super123', role: 'Supervisor' },
  { username: 'safety', password: 'safety123', role: 'SafetyOfficer' },
  { username: 'operator', password: 'operator123', role: 'Operator' },
];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in with valid session
    checkExistingSession();
  }, []);

  // Set up automatic token refresh
  useEffect(() => {
    if (user) {
      const refreshInterval = setInterval(() => {
        refreshTokensIfNeeded();
      }, 5 * 60 * 1000); // Check every 5 minutes

      return () => clearInterval(refreshInterval);
    }
  }, [user]);

  const checkExistingSession = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (token && refreshToken && sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        // Check if session is still valid
        if (session.expiresAt > now) {
          // Session is valid, restore user
          setUser(session.user);
          setIsLoading(false);
          return;
        } else if (session.refreshExpiresAt > now) {
          // Access token expired but refresh token is valid, try to refresh
          try {
            await refreshTokens(refreshToken);
            return;
          } catch (error) {
            console.error('Failed to refresh tokens:', error);
          }
        }
        
        // Both tokens expired, clear them
        clearAuthData();
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking session:', error);
      clearAuthData();
      setIsLoading(false);
    }
  }, []);

  const clearAuthData = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_session');
    setUser(null);
  };

  const refreshTokensIfNeeded = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (!token || !refreshToken || !sessionData) return;
      
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // If access token expires in less than 5 minutes, refresh it
      if (session.expiresAt - now < 5 * 60 * 1000) {
        await refreshTokens(refreshToken);
      }
    } catch (error) {
      console.error('Error checking token expiration:', error);
    }
  }, []);

  const refreshTokens = async (refreshToken: string) => {
    try {
      console.log('🔄 Refreshing tokens...');
      const response = await authApi.refreshToken(refreshToken);
      
      // Store new tokens
      localStorage.setItem('auth_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);
      
      // Update session data
      const expiresAt = Date.now() + (response.expires_in * 1000);
      const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);
      
      const sessionData = localStorage.getItem('auth_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        session.expiresAt = expiresAt;
        session.refreshExpiresAt = refreshExpiresAt;
        session.updatedAt = Date.now();
        localStorage.setItem('auth_session', JSON.stringify(session));
      }
      
      console.log('✅ Tokens refreshed successfully');
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      clearAuthData();
      throw error;
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      console.log('🔐 Attempting login with credentials:', credentials.username);
      console.log('🌐 API Client baseURL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');
      
      // Use real backend authentication
      const response: AuthResponse = await authApi.login(credentials);
      
      console.log('✅ Login response received:', response);
      
      if (response.access_token && response.refresh_token) {
        // Store tokens
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('refresh_token', response.refresh_token);
        console.log('💾 Auth tokens stored in localStorage');
        
        // Get user information from the token or fetch user details
        try {
          console.log('👤 Fetching user details...');
          const userResponse = await authApi.getCurrentUser();
          const userData = userResponse;
          console.log('👤 User details received:', userData);
          
          // Calculate expiration times
          const expiresAt = Date.now() + (response.expires_in * 1000);
          const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);
          
          // Store session data
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            refreshExpiresAt: refreshExpiresAt,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            rememberMe: credentials.remember_me || false
          }));
          
          // Set user
          setUser(userData);
        } catch (userError) {
          console.error('Failed to fetch user details:', userError);
          // Create a basic user object from credentials
          const userData: User = {
            id: 'temp-user-id',
            username: credentials.username,
            email: `${credentials.username}@example.com`,
            first_name: credentials.username, // Use username as fallback
            last_name: '', // Empty string as fallback
            role: UserRole.OPERATOR, // Default role for temporary users
            is_active: true,
            permissions: [], // Empty permissions array as fallback
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const expiresAt = Date.now() + (response.expires_in * 1000);
          const refreshExpiresAt = Date.now() + (response.refresh_expires_in * 1000);
          
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            refreshExpiresAt: refreshExpiresAt,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            rememberMe: credentials.remember_me || false
          }));
          
          // Set user
          setUser(userData);
        }
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      console.error('❌ Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = (showToast: boolean = true) => {
    console.log('🚪 Logging out user');
    
    // Clear all authentication data
    clearAuthData();
    
    // Show toast notification if requested
    if (showToast) {
      toast.error('Session expired. Please log in again.');
    }
    
    // Use proper navigation instead of hard redirect
    if (typeof window !== 'undefined') {
      // Use replace to avoid back button issues
      window.history.replaceState(null, '', '/');
      // Trigger a popstate event to notify the app of the route change
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refresh_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (!token || !refreshToken || !sessionData) {
        setUser(null);
        return;
      }
      
      const session = JSON.parse(sessionData);
      const now = Date.now();
      
      // Check if refresh token is still valid
      if (session.refreshExpiresAt <= now) {
        // Refresh token expired, clear everything
        clearAuthData();
        return;
      }
      
      // Check if access token is expired
      if (session.expiresAt <= now) {
        // Access token expired, try to refresh
        try {
          await refreshTokens(refreshToken);
          return;
        } catch (error) {
          console.error('Failed to refresh tokens:', error);
          clearAuthData();
          return;
        }
      }
      
      // Both tokens are valid, refresh user data
      try {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
        
        // Update session with new user data
        session.user = userData;
        session.updatedAt = Date.now();
        localStorage.setItem('auth_session', JSON.stringify(session));
      } catch (error) {
        console.error('Failed to refresh user data:', error);
        // Don't clear auth data here, just keep the existing user
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      clearAuthData();
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
