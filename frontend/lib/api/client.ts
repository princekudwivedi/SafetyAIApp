import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { createErrorHandler, defaultErrorHandlerConfig, CentralizedErrorHandler } from './error-handler';

// Create centralized error handler with default configuration
// This will be updated when the auth context is available
let errorHandler = createErrorHandler(defaultErrorHandlerConfig);

// Flag to track if error handler has been updated
let isErrorHandlerUpdated = false;

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log('🚀 API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      headers: config.headers
    });
    
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔑 Auth token added to request');
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle all errors centrally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    console.log('✅ API Response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.config.url,
      method: response.config.method?.toUpperCase()
    });
    return response;
  },
  async (error) => {
    console.log('🔍 Error interceptor triggered:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url,
      isErrorHandlerUpdated,
      errorHandlerType: errorHandler.constructor.name
    });

    // Use centralized error handler for all errors
    const apiError = errorHandler.handleError(error);
    
    // Log the error for debugging
    console.error('❌ API Response Error:', {
      status: apiError.status,
      message: apiError.message,
      errorCode: apiError.errorCode,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase()
    });

    // For 401 errors, the error handler will automatically:
    // 1. Clear authentication data
    // 2. Trigger logout callback
    // 3. Redirect to login page
    
    // For other errors, they will be handled according to their type
    // and can be customized via the error handler configuration
    
    // Always reject the promise so components can handle errors if needed
    return Promise.reject(apiError);
  }
);

/**
 * Update the error handler with auth context integration
 * This should be called after the auth context is initialized
 */
export function updateErrorHandler(newErrorHandler: CentralizedErrorHandler) {
  errorHandler = newErrorHandler;
  isErrorHandlerUpdated = true;
  console.log('🔄 Error handler updated with auth context integration:', {
    newHandlerType: newErrorHandler.constructor.name,
    isUpdated: isErrorHandlerUpdated
  });
}

/**
 * Check if the error handler has been updated with auth context
 */
export function isErrorHandlerReady(): boolean {
  return isErrorHandlerUpdated;
}

export { apiClient, errorHandler };

// Export types for use in components
export type { CentralizedErrorHandler } from './error-handler';
