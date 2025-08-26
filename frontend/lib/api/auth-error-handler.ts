import { createErrorHandler, ErrorHandlerConfig, ApiError } from './error-handler';

/**
 * Custom error handler configuration that integrates with the auth context
 * This provides better logout handling and user experience
 */
export const createAuthErrorHandler = (logoutCallback: () => void): ErrorHandlerConfig => {
  console.log('🔧 Creating auth error handler with logout callback:', {
    hasLogoutCallback: !!logoutCallback,
    logoutCallbackType: typeof logoutCallback,
    logoutCallbackName: logoutCallback.name || 'anonymous'
  });

  return {
    onUnauthorized: () => {
      console.log('🔐 Authentication failed - logging out user');
      console.log('🔍 onUnauthorized callback details:', {
        hasLogoutCallback: !!logoutCallback,
        logoutCallbackType: typeof logoutCallback
      });
      
      // Call the logout callback from auth context
      // This ensures the auth state is properly updated
      try {
        logoutCallback();
        console.log('✅ Logout callback executed successfully');
      } catch (error) {
        console.error('❌ Error executing logout callback:', error);
      }
      
      // Additional cleanup if needed
      // The auth context logout should handle most cleanup
    },
    
    onForbidden: () => {
      console.warn('🚫 Access forbidden - user lacks required permissions');
      
      // For forbidden errors, we might want to show a specific message
      // but not necessarily log the user out
      // This could be customized based on your requirements
    },
    
    onServerError: (error: ApiError) => {
      console.error('💥 Server error occurred:', error);
      
      // For server errors, we might want to show a user-friendly message
      // but not log the user out
      // This could trigger a toast notification or error modal
    },
    
    onNetworkError: (error: ApiError) => {
      console.error('🌐 Network error occurred:', error);
      
      // For network errors, we might want to show a connection error message
      // but not log the user out
      // This could trigger a retry mechanism or offline mode
    },
    
    onValidationError: (error: ApiError) => {
      console.warn('⚠️ Validation error occurred:', error);
      
      // For validation errors, we might want to show the specific error message
      // but not log the user out
      // This could trigger a form validation display
    }
  };
};

/**
 * Enhanced error handler configuration with additional features
 */
export const createEnhancedErrorHandler = (
  logoutCallback: () => void,
  showNotification?: (type: 'error' | 'warning' | 'info', message: string) => void
): ErrorHandlerConfig => {
  const baseConfig = createAuthErrorHandler(logoutCallback);
  
  return {
    ...baseConfig,
    
    onForbidden: () => {
      console.warn('🚫 Access forbidden - user lacks required permissions');
      
      if (showNotification) {
        showNotification('warning', 'You do not have permission to access this resource.');
      }
    },
    
    onServerError: (error: ApiError) => {
      console.error('💥 Server error occurred:', error);
      
      if (showNotification) {
        showNotification('error', 'A server error occurred. Please try again later.');
      }
    },
    
    onNetworkError: (error: ApiError) => {
      console.error('🌐 Network error occurred:', error);
      
      if (showNotification) {
        showNotification('error', 'Unable to connect to the server. Please check your internet connection.');
      }
    },
    
    onValidationError: (error: ApiError) => {
      console.warn('⚠️ Validation error occurred:', error);
      
      if (showNotification) {
        showNotification('warning', error.message || 'Please check your input and try again.');
      }
    }
  };
};
