'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginCredentials, UserRole } from '@/types/auth';
import { authApi } from '@/lib/api/auth';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo credentials from seed data
const DEMO_CREDENTIALS = [
  { username: 'admin', password: 'admin123', role: UserRole.ADMINISTRATOR },
  { username: 'supervisor', password: 'supervisor123', role: UserRole.SUPERVISOR },
  { username: 'safety_officer', password: 'safety123', role: UserRole.SAFETY_OFFICER },
  { username: 'operator', password: 'operator123', role: UserRole.OPERATOR },
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
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_session');
        }
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking session:', error);
      // Clear invalid session data
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_session');
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      
      // First, try real API authentication
      try {
        const formData = new FormData();
        formData.append('username', credentials.username);
        formData.append('password', credentials.password);
        
        const response = await fetch('http://localhost:8000/api/v1/auth/token', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('API authentication successful:', data);
          
          // Store real token and refresh token
          localStorage.setItem('auth_token', data.access_token);
          if (data.refresh_token) {
            localStorage.setItem('refresh_token', data.refresh_token);
          }
          
          // Create user object from API response
          const userData: User = {
            id: `api-${Date.now()}`,
            username: credentials.username,
            email: `${credentials.username}@safetyai.com`,
            role: UserRole.ADMINISTRATOR, // Default role for API users
            site_id: 'site-001',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            createdAt: Date.now(),
            isApiUser: true
          }));
          
          setUser(userData);
          toast.success('Login successful!');
          return;
        }
      } catch (apiError) {
        console.error('API authentication failed:', apiError);
        console.log('Trying demo credentials...');
      }
      
      // If API fails, check demo credentials
      const demoUser = DEMO_CREDENTIALS.find(
        cred => cred.username === credentials.username && cred.password === credentials.password
      );
      
      if (demoUser) {
        // Create demo user object
        const userData: User = {
          id: `demo-${Date.now()}`,
          username: demoUser.username,
          email: `${demoUser.username}@safetyai.com`,
          role: demoUser.role as any,
          site_id: 'site-001',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Store demo token and session data
        const demoToken = `demo-token-${Date.now()}`;
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
        
        localStorage.setItem('auth_token', demoToken);
        localStorage.setItem('auth_session', JSON.stringify({
          user: userData,
          expiresAt: expiresAt,
          createdAt: Date.now(),
          isApiUser: false
        }));
        
        // Set user
        setUser(userData);
        toast.success('Demo login successful!');
        return;
      }
      
      // If neither API nor demo credentials work
      throw new Error('Invalid credentials. Please check your username and password.');
      
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_session');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const sessionData = localStorage.getItem('auth_session');
      
      if (!token || !sessionData) {
        setUser(null);
        return;
      }
      
      const session = JSON.parse(sessionData);
      
      // Check if session is expired
      if (session.expiresAt <= Date.now()) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_session');
        setUser(null);
        return;
      }
      
      if (token.startsWith('demo-token-')) {
        // For demo users, restore from session
        setUser(session.user);
      } else {
        // For API users, try to refresh from API
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
          
          // Update session
          const expiresAt = Date.now() + (24 * 60 * 60 * 1000);
          localStorage.setItem('auth_session', JSON.stringify({
            user: userData,
            expiresAt: expiresAt,
            createdAt: Date.now(),
            isApiUser: true
          }));
        } catch (error) {
          console.error('Failed to refresh API user:', error);
          // If API refresh fails, clear session
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_session');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
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
    isAuthenticated: !!user,
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
