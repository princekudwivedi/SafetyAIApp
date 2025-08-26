# Centralized Error Handling System

## Overview

This document outlines the centralized error handling system implemented in the frontend to ensure consistent authentication failure responses across all components. The system automatically handles 401 Unauthorized errors by logging users out and redirecting them to the login page, regardless of which component made the API call.

## Problem Solved

**Previous Issue**: Individual components were handling authentication failures inconsistently, leading to broken user experiences when tokens expired.

**Solution**: A global API interceptor that automatically handles all authentication failures, ensuring consistent behavior across the entire application.

## Architecture

### 1. Centralized Error Handler (`/lib/api/error-handler.ts`)

The core error handling system that:
- Intercepts all API responses
- Parses errors into standardized format
- Routes errors to appropriate handlers based on status code
- Automatically handles 401 authentication failures

```typescript
class CentralizedErrorHandler {
  handleError(error: AxiosError): ApiError
  private routeError(apiError: ApiError): void
  private handleUnauthorized(apiError: ApiError): void
  // ... other handlers
}
```

### 2. API Client Integration (`/lib/api/client.ts`)

The axios instance with interceptors that:
- Automatically adds authentication tokens to requests
- Intercepts all responses and errors
- Routes errors to the centralized handler
- Ensures consistent error handling across all API calls

### 3. Auth Context Integration (`/contexts/auth-context.tsx`)

The authentication context that:
- Provides logout functionality
- Manages user state
- Integrates with the error handler for consistent logout behavior

### 4. Error Handler Provider (`/providers/error-handler-provider.tsx`)

A provider that:
- Initializes the error handler with auth context integration
- Ensures the error handler has access to logout functionality
- Updates the global error handler when auth context changes

### 5. Custom Hook (`/hooks/use-error-handler.ts`)

A hook that components can use to:
- Access centralized error handling functionality
- Handle errors consistently in components
- Get user-friendly error messages
- Check error types for conditional handling

## How It Works

### 1. Request Flow

```
Component → API Call → Axios Interceptor → Backend
                ↓
            Response/Error → Error Handler → Component
```

### 2. Error Handling Flow

```
API Error → Parse Error → Route by Status → Execute Handler → Update UI
```

### 3. Authentication Failure Flow

```
401 Error → Clear Auth Data → Trigger Logout → Redirect to Login
```

## Key Features

### 1. **Automatic Authentication Handling**
- 401 errors automatically trigger logout
- All authentication data is cleared
- User is redirected to login page
- No component-specific handling required

### 2. **Consistent Error Responses**
- Standardized error format across all endpoints
- User-friendly error messages
- Consistent error logging
- Predictable error behavior

### 3. **Flexible Configuration**
- Customizable error handlers
- Integration with auth context
- Support for different error types
- Extensible architecture

### 4. **Component Integration**
- Easy-to-use hook for components
- Automatic error type detection
- User-friendly error message generation
- Consistent error handling patterns

## Usage Examples

### 1. Basic Component Error Handling

```typescript
import { useErrorHandler } from '@/hooks/use-error-handler';

export function MyComponent() {
  const { handleApiError, getErrorMessage } = useErrorHandler();
  
  const fetchData = async () => {
    try {
      const data = await api.getData();
      // Handle success
    } catch (error) {
      // Centralized error handling
      handleApiError(error);
      
      // Show user-friendly message
      setErrorMessage(getErrorMessage(error));
    }
  };
}
```

### 2. Conditional Error Handling

```typescript
import { useErrorHandler } from '@/hooks/use-error-handler';

export function MyComponent() {
  const { handleApiError, isAuthError, isServerError } = useErrorHandler();
  
  const fetchData = async () => {
    try {
      const data = await api.getData();
    } catch (error) {
      // Handle different error types
      if (isAuthError(error)) {
        // Auth errors are handled centrally
        return;
      }
      
      if (isServerError(error)) {
        // Show server error message
        setErrorMessage('Server error occurred');
      }
      
      // Use centralized handling for all errors
      handleApiError(error);
    }
  };
}
```

### 3. Custom Error Handler Configuration

```typescript
import { createEnhancedErrorHandler } from '@/lib/api/auth-error-handler';

const customHandler = createEnhancedErrorHandler(
  logoutCallback,
  (type, message) => {
    // Custom notification system
    toast[type](message);
  }
);
```

## Error Types Handled

### 1. **Authentication Errors (401, 403)**
- Automatically handled by centralized system
- Triggers logout and redirect
- Clears all authentication data

### 2. **Server Errors (5xx)**
- Logged for debugging
- User-friendly error messages
- No automatic logout

### 3. **Client Errors (4xx)**
- Validation errors (400)
- Permission errors (403)
- User-friendly error messages
- No automatic logout

### 4. **Network Errors**
- Connection failures
- Timeout errors
- User-friendly error messages
- No automatic logout

## Configuration Options

### 1. **Default Configuration**
```typescript
const defaultConfig: ErrorHandlerConfig = {
  onUnauthorized: () => window.location.href = '/',
  onForbidden: () => console.warn('Access denied'),
  onServerError: (error) => console.error('Server error:', error),
  onNetworkError: (error) => console.error('Network error:', error),
  onValidationError: (error) => console.warn('Validation error:', error),
};
```

### 2. **Custom Configuration**
```typescript
const customConfig: ErrorHandlerConfig = {
  onUnauthorized: () => {
    // Custom logout logic
    customLogout();
    showLogoutNotification();
  },
  onServerError: (error) => {
    // Custom server error handling
    sendErrorToAnalytics(error);
    showRetryButton();
  },
};
```

## Integration Points

### 1. **Provider Setup**
```typescript
// In your app providers
<AuthProvider>
  <ErrorHandlerProvider>
    <WebSocketProvider>
      {children}
    </WebSocketProvider>
  </ErrorHandlerProvider>
</AuthProvider>
```

### 2. **Component Usage**
```typescript
// In any component
const { handleApiError, getErrorMessage } = useErrorHandler();

// Automatic error handling
try {
  await apiCall();
} catch (error) {
  handleApiError(error);
}
```

### 3. **API Client Usage**
```typescript
// All API calls automatically use centralized error handling
import { apiClient } from '@/lib/api/client';

const response = await apiClient.get('/api/v1/data');
// Errors are automatically handled
```

## Benefits

### 1. **Consistency**
- All components handle errors the same way
- Predictable user experience
- No broken authentication states

### 2. **Maintainability**
- Centralized error handling logic
- Easy to update error behavior
- Consistent error logging

### 3. **User Experience**
- Automatic logout on authentication failure
- User-friendly error messages
- Consistent error responses

### 4. **Developer Experience**
- Simple error handling in components
- Automatic error type detection
- Easy error message customization

## Best Practices

### 1. **Always Use Centralized Handling**
```typescript
// ✅ Good
try {
  await apiCall();
} catch (error) {
  handleApiError(error);
}

// ❌ Bad
try {
  await apiCall();
} catch (error) {
  if (error.response?.status === 401) {
    // Don't handle auth errors manually
    logout();
  }
}
```

### 2. **Use Error Type Detection**
```typescript
// ✅ Good
if (isAuthError(error)) {
  // Auth errors are handled centrally
  return;
}

if (isServerError(error)) {
  // Show server error message
  setErrorMessage('Server error occurred');
}
```

### 3. **Provide User-Friendly Messages**
```typescript
// ✅ Good
setErrorMessage(getErrorMessage(error));

// ❌ Bad
setErrorMessage(error.message || 'Error occurred');
```

## Troubleshooting

### 1. **Error Handler Not Working**
- Check if `ErrorHandlerProvider` is properly set up
- Verify auth context is available
- Check console for error handler initialization logs

### 2. **Authentication Errors Not Logging Out**
- Verify logout callback is properly passed to error handler
- Check if auth context logout function is working
- Ensure error handler is updated when auth context changes

### 3. **Custom Error Handling Not Working**
- Check error handler configuration
- Verify error type detection is working
- Ensure custom handlers are properly registered

## Future Enhancements

### 1. **Toast Notifications**
- Integrate with toast library for better UX
- Customizable notification types
- Automatic error message display

### 2. **Error Analytics**
- Track error patterns
- Monitor authentication failures
- Performance metrics

### 3. **Retry Mechanisms**
- Automatic retry for network errors
- Exponential backoff
- User-controlled retry options

### 4. **Offline Support**
- Handle offline scenarios
- Queue failed requests
- Sync when connection restored

## Conclusion

The centralized error handling system provides a robust, maintainable solution for consistent error handling across the entire application. By automatically handling authentication failures and providing consistent error responses, it ensures a better user experience and easier maintenance for developers.

Key benefits:
- **Automatic authentication handling** - No more broken user states
- **Consistent error responses** - Predictable user experience
- **Easy component integration** - Simple error handling in components
- **Flexible configuration** - Customizable error behavior
- **Maintainable architecture** - Centralized error handling logic

This system ensures that whether a 401 comes from the live monitoring API, dashboard API, or any other endpoint, the user is always logged out correctly, preventing confusion and maintaining application security.
