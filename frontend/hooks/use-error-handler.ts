import { useCallback } from 'react';
import { useAuth } from '../contexts/auth-context';
import { createAuthErrorHandler } from '../lib/api/auth-error-handler';
import { ApiError } from '../lib/api/error-handler';

/**
 * Custom hook that provides access to the centralized error handler
 * Components can use this to handle errors consistently
 */
export function useErrorHandler() {
  const { logout } = useAuth();

  // Create error handler with auth context integration
  const errorHandler = useCallback(() => {
    return createAuthErrorHandler(logout);
  }, [logout]);

  /**
   * Handle API errors with consistent behavior
   */
  const handleApiError = useCallback((error: ApiError | Error) => {
    console.error('🚨 API Error in component:', error);

    // If it's already an ApiError, handle it directly
    if ('status' in error) {
      const apiError = error as ApiError;
      
      switch (apiError.status) {
        case 401:
          console.log('🔐 Authentication failed - logging out');
          logout();
          break;
        
        case 403:
          console.warn('🚫 Access forbidden');
          // Could show a toast notification here
          break;
        
        case 400:
          console.warn('⚠️ Validation error:', apiError.message);
          // Could show validation error message
          break;
        
        case 500:
        case 502:
        case 503:
        case 504:
          console.error('💥 Server error:', apiError.message);
          // Could show server error message
          break;
        
        case 0:
          console.error('🌐 Network error:', apiError.message);
          // Could show network error message
          break;
        
        default:
          console.warn('⚠️ Unhandled error status:', apiError.status, apiError.message);
          break;
      }
    } else {
      // Handle generic errors
      console.error('❌ Generic error:', error.message);
    }
  }, [logout]);

  /**
   * Check if an error is an authentication error
   */
  const isAuthError = useCallback((error: ApiError | Error): boolean => {
    if ('status' in error) {
      const apiError = error as ApiError;
      return apiError.status === 401 || apiError.status === 403;
    }
    return false;
  }, []);

  /**
   * Check if an error is a server error
   */
  const isServerError = useCallback((error: ApiError | Error): boolean => {
    if ('status' in error) {
      const apiError = error as ApiError;
      return apiError.status >= 500;
    }
    return false;
  }, []);

  /**
   * Check if an error is a client error
   */
  const isClientError = useCallback((error: ApiError | Error): boolean => {
    if ('status' in error) {
      const apiError = error as ApiError;
      return apiError.status >= 400 && apiError.status < 500;
    }
    return false;
  }, []);

  /**
   * Check if an error is a network error
   */
  const isNetworkError = useCallback((error: ApiError | Error): boolean => {
    if ('status' in error) {
      const apiError = error as ApiError;
      return apiError.status === 0;
    }
    return false;
  }, []);

  /**
   * Get user-friendly error message
   */
  const getErrorMessage = useCallback((error: ApiError | Error): string => {
    if ('status' in error) {
      const apiError = error as ApiError;
      
      switch (apiError.status) {
        case 401:
          return 'Your session has expired. Please log in again.';
        
        case 403:
          return 'You do not have permission to access this resource.';
        
        case 400:
          return apiError.message || 'Please check your input and try again.';
        
        case 500:
        case 502:
        case 503:
        case 504:
          return 'The server encountered an error. Please try again later.';
        
        case 0:
          return 'Unable to connect to the server. Please check your internet connection.';
        
        default:
          return apiError.message || 'An unexpected error occurred.';
      }
    }
    
    return error.message || 'An unexpected error occurred.';
  }, []);

  return {
    errorHandler,
    handleApiError,
    isAuthError,
    isServerError,
    isClientError,
    isNetworkError,
    getErrorMessage,
  };
}
