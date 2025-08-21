'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, LoginCredentials } from '@/types/auth';
import { authApi } from '@/lib/api/auth';

interface AuthContextType {
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
      
      // Check dummy credentials first
      const dummyUser = DUMMY_CREDENTIALS.find(
        cred => cred.username === credentials.username && cred.password === credentials.password
      );
      
      if (dummyUser) {
        // Create dummy user object
        const userData: User = {
          id: `dummy-${Date.now()}`,
          username: dummyUser.username,
          email: `${dummyUser.username}@safetyai.com`,
          role: dummyUser.role as any,
          site_id: 'site-001',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        // Store dummy token and session data
        const dummyToken = `dummy-token-${Date.now()}`;
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
        
        localStorage.setItem('auth_token', dummyToken);
        localStorage.setItem('auth_session', JSON.stringify({
          user: userData,
          expiresAt: expiresAt,
          createdAt: Date.now()
        }));
        
        // Set user
        setUser(userData);
        return;
      }
      
      // If not dummy credentials, try real API
      try {
        const response = await authApi.login(credentials);
        const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
        
        localStorage.setItem('auth_token', response.access_token);
        localStorage.setItem('auth_session', JSON.stringify({
          expiresAt: expiresAt,
          createdAt: Date.now()
        }));
        
        await refreshUser();
      } catch (apiError) {
        console.error('API login failed:', apiError);
        throw new Error('Invalid credentials. Please use one of the demo accounts.');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_session');
    setUser(null);
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
