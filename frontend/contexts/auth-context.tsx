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
    // Check if user is already logged in
    const token = localStorage.getItem('auth_token');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

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
        
        // Store dummy token
        const dummyToken = `dummy-token-${Date.now()}`;
        localStorage.setItem('auth_token', dummyToken);
        
        // Set user
        setUser(userData);
        return;
      }
      
      // If not dummy credentials, try real API
      try {
        const response = await authApi.login(credentials);
        localStorage.setItem('auth_token', response.access_token);
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
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token && token.startsWith('dummy-token-')) {
        // For dummy users, just return the current user
        return;
      }
      
      const userData = await authApi.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('auth_token');
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
