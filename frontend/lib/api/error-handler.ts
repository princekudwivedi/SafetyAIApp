import { AxiosError, AxiosResponse } from 'axios';

export interface ApiError {
  status: number;
  message: string;
  errorCode?: string;
  details?: any;
}

export interface ErrorHandlerConfig {
  onUnauthorized: () => void;
  onForbidden?: () => void;
  onServerError?: (error: ApiError) => void;
  onNetworkError?: (error: ApiError) => void;
  onValidationError?: (error: ApiError) => void;
}

class CentralizedErrorHandler {
  private config: ErrorHandlerConfig;
  private isHandlingError = false;

  constructor(config: ErrorHandlerConfig) {
    this.config = config;
  }

  /**
   * Handle any API error response
   */
  handleError(error: AxiosError): ApiError {
    // Prevent recursive error handling
    if (this.isHandlingError) {
      console.warn('Error handler is already processing an error, skipping...');
      return this.createDefaultError(error);
    }

    this.isHandlingError = true;

    try {
      const apiError = this.parseError(error);
      
      console.error('🚨 API Error Handled:', {
        status: apiError.status,
        message: apiError.message,
        errorCode: apiError.errorCode,
        url: error.config?.url,
        method: error.config?.method?.toUpperCase()
      });

      // Route error to appropriate handler based on status code
      this.routeError(apiError);

      return apiError;
    } catch (handlerError) {
      console.error('❌ Error in error handler:', handlerError);
      return this.createDefaultError(error);
    } finally {
      this.isHandlingError = false;
    }
  }

  /**
   * Parse axios error into standardized API error format
   */
  private parseError(error: AxiosError): ApiError {
    const status = error.response?.status || 0;
    const responseData = error.response?.data;

    // Handle different types of errors
    if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK') {
      return {
        status: 0,
        message: 'Network error - unable to connect to server',
        errorCode: 'NETWORK_ERROR',
        details: { originalError: error.message }
      };
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        status: 0,
        message: 'Request timeout - server took too long to respond',
        errorCode: 'TIMEOUT',
        details: { originalError: error.message }
      };
    }

    // Handle HTTP response errors
    if (error.response) {
      const { status: responseStatus, data } = error.response;
      
      // Extract error details from response
      let message = 'An error occurred';
      let errorCode: string | undefined;
      let details: any = {};

      if (typeof data === 'object' && data !== null) {
        const responseData = data as any;
        message = responseData.detail || responseData.message || responseData.error || message;
        errorCode = responseData.error_code || responseData.errorCode;
        details = { ...responseData, originalError: error.message };
      } else if (typeof data === 'string') {
        message = data;
        details = { originalError: error.message };
      }

      return {
        status: responseStatus,
        message,
        errorCode,
        details
      };
    }

    // Fallback for unexpected errors
    return {
      status: 0,
      message: error.message || 'An unexpected error occurred',
      errorCode: 'UNKNOWN_ERROR',
      details: { originalError: error }
    };
  }

  /**
   * Route error to appropriate handler based on status code
   */
  private routeError(apiError: ApiError): void {
    const { status, errorCode } = apiError;

    switch (status) {
      case 401:
        this.handleUnauthorized(apiError);
        break;
      
      case 403:
        this.handleForbidden(apiError);
        break;
      
      case 400:
      case 422:
        this.handleValidationError(apiError);
        break;
      
      case 500:
      case 502:
      case 503:
      case 504:
        this.handleServerError(apiError);
        break;
      
      case 0:
        this.handleNetworkError(apiError);
        break;
      
      default:
        // For other status codes, just log them
        console.warn('Unhandled API error status:', status, apiError);
        break;
    }
  }

  /**
   * Handle 401 Unauthorized errors
   */
  private handleUnauthorized(apiError: ApiError): void {
    console.warn('🔐 Authentication failed:', apiError.message);
    console.log('🔍 handleUnauthorized details:', {
      status: apiError.status,
      message: apiError.message,
      hasOnUnauthorized: !!this.config.onUnauthorized,
      configType: typeof this.config.onUnauthorized,
      configKeys: Object.keys(this.config)
    });
    
    // Clear all authentication data
    this.clearAuthData();
    
    // Trigger logout callback
    if (this.config.onUnauthorized) {
      console.log('🚀 Calling onUnauthorized callback...');
      try {
        this.config.onUnauthorized();
        console.log('✅ onUnauthorized callback executed successfully');
      } catch (error) {
        console.error('❌ Error in onUnauthorized callback:', error);
      }
    } else {
      console.error('❌ No onUnauthorized callback configured!');
    }
  }

  /**
   * Handle 403 Forbidden errors
   */
  private handleForbidden(apiError: ApiError): void {
    console.warn('🚫 Access forbidden:', apiError.message);
    
    if (this.config.onForbidden) {
      this.config.onForbidden();
    } else {
      // Default behavior: show error message
      this.showErrorNotification('Access Denied', apiError.message);
    }
  }

  /**
   * Handle server errors (5xx)
   */
  private handleServerError(apiError: ApiError): void {
    console.error('💥 Server error:', apiError.message);
    
    if (this.config.onServerError) {
      this.config.onServerError(apiError);
    } else {
      // Default behavior: show error message
      this.showErrorNotification('Server Error', 'The server encountered an error. Please try again later.');
    }
  }

  /**
   * Handle network errors
   */
  private handleNetworkError(apiError: ApiError): void {
    console.error('🌐 Network error:', apiError.message);
    
    if (this.config.onNetworkError) {
      this.config.onNetworkError(apiError);
    } else {
      // Default behavior: show error message
      this.showErrorNotification('Connection Error', 'Unable to connect to the server. Please check your internet connection.');
    }
  }

  /**
   * Handle validation errors (4xx and 422)
   */
  private handleValidationError(apiError: ApiError): void {
    if (apiError.status === 422) {
      console.warn('⚠️ 422 Unprocessable Content - Validation Error:', apiError.message);
      console.log('🔍 422 Error Details:', {
        status: apiError.status,
        message: apiError.message,
        errorCode: apiError.errorCode,
        details: apiError.details
      });
    } else {
      console.warn('⚠️ Validation error:', apiError.message);
    }
    
    if (this.config.onValidationError) {
      this.config.onValidationError(apiError);
    } else {
      // Default behavior: show error message
      const title = apiError.status === 422 ? 'Data Validation Error' : 'Validation Error';
      this.showErrorNotification(title, apiError.message);
    }
  }

  /**
   * Clear all authentication data from localStorage
   */
  private clearAuthData(): void {
    try {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('auth_session');
      console.log('🧹 Authentication data cleared');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Show error notification (can be customized or replaced with toast library)
   */
  private showErrorNotification(title: string, message: string): void {
    // This can be replaced with a proper toast notification system
    console.error(`${title}: ${message}`);
    
    // For now, we'll use browser alert as fallback
    // In production, you might want to use a toast library like react-toastify
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      alert(`${title}: ${message}`);
    }
  }

  /**
   * Create a default error object when error handling fails
   */
  private createDefaultError(error: AxiosError): ApiError {
    return {
      status: error.response?.status || 0,
      message: 'Error handling failed',
      errorCode: 'HANDLER_ERROR',
      details: { originalError: error }
    };
  }

  /**
   * Check if an error is an authentication error
   */
  isAuthError(error: ApiError): boolean {
    return error.status === 401 || error.status === 403;
  }

  /**
   * Check if an error is a server error
   */
  isServerError(error: ApiError): boolean {
    return error.status >= 500;
  }

  /**
   * Check if an error is a client error
   */
  isClientError(error: ApiError): boolean {
    return error.status >= 400 && error.status < 500;
  }

  /**
   * Check if an error is a network error
   */
  isNetworkError(error: ApiError): boolean {
    return error.status === 0;
  }
}

// Export the class and a factory function
export { CentralizedErrorHandler };

/**
 * Create a centralized error handler instance
 */
export function createErrorHandler(config: ErrorHandlerConfig): CentralizedErrorHandler {
  return new CentralizedErrorHandler(config);
}

/**
 * Default error handler configuration
 */
export const defaultErrorHandlerConfig: ErrorHandlerConfig = {
  onUnauthorized: () => {
    console.log('🔄 Default error handler: onUnauthorized triggered');
    // Default behavior: redirect to login page
    if (typeof window !== 'undefined') {
      console.log('🔄 Default error handler: Redirecting to login page');
      window.location.href = '/';
    }
  },
  onForbidden: () => {
    // Default behavior: show access denied message
    console.warn('Access denied - user lacks required permissions');
  },
  onServerError: (error: ApiError) => {
    // Default behavior: log server error
    console.error('Server error occurred:', error);
  },
  onNetworkError: (error: ApiError) => {
    // Default behavior: log network error
    console.error('Network error occurred:', error);
  },
  onValidationError: (error: ApiError) => {
    // Default behavior: log validation error
    console.warn('Validation error occurred:', error);
  }
};
