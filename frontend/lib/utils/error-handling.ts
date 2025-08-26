/**
 * Safely extract error message from various error object structures
 * This prevents React rendering errors when error objects are passed directly
 */
export function extractErrorMessage(error: any, defaultMessage: string = 'An error occurred'): string {
  if (!error) {
    return defaultMessage;
  }

  // If it's already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If it's an object, try to extract the message
  if (typeof error === 'object') {
    // Check for common error message properties
    if (error.message) {
      return error.message;
    }
    
    if (error.detail) {
      return error.detail;
    }
    
    if (error.error) {
      return error.error;
    }
    
    if (error.msg) {
      return error.msg;
    }
    
    // If it's a validation error object with specific structure
    if (error.type && error.loc && error.msg) {
      return `Validation error: ${error.msg}`;
    }
    
    // If none of the above, stringify the object (but limit length)
    const errorString = JSON.stringify(error);
    if (errorString.length > 200) {
      return errorString.substring(0, 200) + '...';
    }
    return errorString;
  }

  // Fallback: convert to string
  return String(error);
}

/**
 * Check if an error is a validation error (422 status)
 */
export function isValidationError(error: any): boolean {
  if (error && typeof error === 'object') {
    return error.status === 422 || error.statusCode === 422;
  }
  return false;
}

/**
 * Check if an error is an authentication error (401/403 status)
 */
export function isAuthError(error: any): boolean {
  if (error && typeof error === 'object') {
    return error.status === 401 || error.status === 403 || 
           error.statusCode === 401 || error.statusCode === 403;
  }
  return false;
}

/**
 * Check if an error is a server error (5xx status)
 */
export function isServerError(error: any): boolean {
  if (error && typeof error === 'object') {
    const status = error.status || error.statusCode;
    return status >= 500 && status < 600;
  }
  return false;
}
