'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, LoginCredentials } from '../types/auth';
import { authApi } from '../lib/api/auth';
import { createAuthErrorHandler } from '../lib/api/auth-error-handler';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
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

  const checkExistingSession = () => {
    try {
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (token && sessionData) {
        const session = JSON.parse(sessionData);
        const now = Date.now();
        
        // Check if session is still valid (24 hours)
        if (session.expiresAt > now) {
          // Session is valid, restore user
          setUser(session.user);
          setIsLoading(false);
          return;
        } else {
          // Session expired, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_session');
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking session:', error);
      // Clear invalid session data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_session');
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      console.log('🔐 Attempting login with credentials:', credentials.username);
      console.log('🌐 API Client baseURL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');
      
      // Use real backend authentication
      const response = await authApi.login(credentials);
      
      console.log('✅ Login response received:', response);
      
      if (response.access_token) {
        // Store real JWT token
        localStorage.setItem('auth_token', response.access_token);
        console.log('💾 Auth token stored in localStorage');
        
        // Get user information from the token or fetch user details
        try {
          console.log('👤 Fetching user details...');
          const userResponse = await authApi.getCurrentUser();
          const userData = userResponse;
          console.log('👤 User details received:', userData);
          
          // Store session data
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            createdAt: Date.now()
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
            role: credentials.role as any,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            createdAt: Date.now()
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

  const logout = () => {
    console.log('🚪 Logging out user');
    
    // Clear all authentication data
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_session');
    
    // Update state
    setUser(null);
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (token && token.startsWith('dummy-token-')) {
        // For dummy users, check if session is still valid
        if (sessionData) {
          const session = JSON.parse(sessionData);
          if (session.expiresAt > Date.now()) {
            setUser(session.user);
            return;
          } else {
            // Session expired, clear it
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_session');
            setUser(null);
          }
        }
        return;
      }
      
      // For real API users, check session expiration first
      if (sessionData) {
        const session = JSON.parse(sessionData);
        if (session.expiresAt <= Date.now()) {
          // Session expired, clear it
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_session');
          setUser(null);
          return;
        }
      }
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_session');
      setUser(null);
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
