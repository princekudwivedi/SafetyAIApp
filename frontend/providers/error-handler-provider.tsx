import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import { updateErrorHandler, isErrorHandlerReady } from '../lib/api/client';
import { createAuthErrorHandler } from '../lib/api/auth-error-handler';
import { createErrorHandler } from '../lib/api/error-handler';

/**
 * Provider that initializes the centralized error handler with auth context
 * This ensures that authentication errors are handled consistently across the app
 */
export function ErrorHandlerProvider({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();

  // Create a stable logout callback that includes fallback behavior
  const logoutCallback = useCallback(() => {
    console.log('🔐 Logout callback triggered from error handler');
    
    try {
      // Call the auth context logout if available
      if (logout) {
        logout();
      } else {
        console.warn('⚠️ Auth context logout not available, using fallback');
        // Fallback logout behavior
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_session');
        
        // Redirect to login page
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('❌ Error in logout callback:', error);
      // Emergency fallback
      localStorage.clear();
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    }
  }, [logout]);

  useEffect(() => {
    console.log('🔧 ErrorHandlerProvider: Initializing error handler...');
    
    try {
      // Create error handler config with auth context integration
      const errorHandlerConfig = createAuthErrorHandler(logoutCallback);
      
      // Create the actual error handler instance
      const authErrorHandler = createErrorHandler(errorHandlerConfig);
      
      // Update the global error handler
      updateErrorHandler(authErrorHandler);
      
      console.log('✅ Error handler initialized with auth context');
    } catch (error) {
      console.error('❌ Failed to initialize error handler:', error);
      
      // Create a basic error handler as fallback
      const fallbackConfig = createAuthErrorHandler(() => {
        console.warn('🔄 Using fallback logout handler');
        localStorage.clear();
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      });
      
      const fallbackHandler = createErrorHandler(fallbackConfig);
      updateErrorHandler(fallbackHandler);
      console.log('🔄 Fallback error handler initialized');
    }
  }, [logoutCallback]);

  // Debug effect to check if error handler is ready
  useEffect(() => {
    const checkHandler = () => {
      const isReady = isErrorHandlerReady();
      console.log('🔍 Error handler status check:', { isReady });
    };
    
    // Check immediately
    checkHandler();
    
    // Check after a short delay to ensure initialization
    const timer = setTimeout(checkHandler, 100);
    
    return () => clearTimeout(timer);
  }, []);

  return <>{children}</>;
}
