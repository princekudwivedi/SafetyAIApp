# Module 1: Authentication System

## Overview
The Authentication System provides secure user authentication, authorization, and session management for the SafetyAI application. It implements JWT-based authentication with role-based access control and comprehensive security features.

## Key Features

### JWT Token Management
- **Access Tokens**: Short-lived tokens (30 minutes) for API access
- **Refresh Tokens**: Long-lived tokens (7 days) for token renewal
- **Remember Me**: Extended session duration (30 days) for convenience
- **Automatic Refresh**: Seamless token renewal without user intervention

### Role-Based Access Control
- **Administrator**: Full system access and user management
- **Supervisor**: Site and camera management, user oversight
- **Safety Officer**: Alert management and safety monitoring
- **Operator**: Basic monitoring and reporting access

### Security Features
- **Password Hashing**: bcrypt with salt for secure password storage
- **Session Management**: Automatic session validation and cleanup
- **Error Handling**: Centralized authentication error management
- **Last Login Tracking**: User activity monitoring and audit trails

## Backend Implementation

### Core Files
- `backend/app/api/v1/endpoints/auth.py` - Authentication endpoints
- `backend/app/models/user.py` - User data models
- `backend/app/core/config.py` - Security configuration

### Key Endpoints
```python
POST /api/v1/auth/login          # User login with credentials
POST /api/v1/auth/token          # OAuth2 token endpoint
POST /api/v1/auth/refresh        # Token refresh
GET  /api/v1/auth/me             # Current user info
POST /api/v1/auth/register       # User registration (dev only)
```

### Authentication Flow
1. User submits credentials via login form
2. Backend validates credentials against database
3. JWT tokens are generated and returned
4. Frontend stores tokens and sets up automatic refresh
5. API requests include Bearer token in Authorization header
6. Backend validates token and extracts user information

### Database Schema
```python
class UserInDB(UserBase, BaseDBModel):
    password_hash: str
    site_id: Optional[str] = None
    last_login: Optional[datetime] = None

class User(UserBase, BaseDBModel):
    last_login: Optional[datetime] = None
```

## Frontend Implementation

### Core Files
- `frontend/contexts/auth-context.tsx` - Authentication context
- `frontend/hooks/use-auth.ts` - Authentication hooks
- `frontend/lib/api/auth.ts` - API client for auth
- `frontend/components/auth/login-form.tsx` - Login interface

### Authentication Context
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: (showToast?: boolean) => void;
  refreshUser: () => Promise<void>;
}
```

### Token Management
- **Storage**: Secure localStorage for token persistence
- **Refresh Logic**: Automatic token renewal before expiration
- **Error Handling**: Graceful handling of token expiration
- **Logout**: Complete session cleanup and redirection

## Security Considerations

### Password Security
- Minimum 8 character requirement
- bcrypt hashing with appropriate salt rounds
- No plaintext password storage
- Password confirmation for registration

### Token Security
- Short-lived access tokens to minimize exposure
- Secure refresh token rotation
- Token validation on every request
- Automatic cleanup of expired tokens

### Session Security
- Secure session storage
- Automatic logout on token expiration
- Cross-site request forgery protection
- Secure cookie configuration (if used)

## Error Handling

### Authentication Errors
- **401 Unauthorized**: Invalid credentials or expired tokens
- **403 Forbidden**: Insufficient permissions for resource
- **422 Validation Error**: Invalid input data
- **500 Server Error**: Internal authentication system errors

### User Experience
- Clear error messages for authentication failures
- Toast notifications for session expiration
- Automatic redirection to login on authentication failure
- Graceful handling of network errors

## Configuration

### Environment Variables
```bash
# Backend
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS=30

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Security Settings
- JWT algorithm: HS256
- Token expiration: Configurable via environment
- Password requirements: Enforced in validation
- Session timeout: Automatic cleanup

## Usage Examples

### Backend Login Endpoint
```python
@router.post("/login")
async def login(user_data: UserLogin):
    user = await authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
    
    # Update last login timestamp
    await database.users.update_one(
        {"_id": ObjectId(user.id)},
        {"$set": {"last_login": datetime.utcnow()}}
    )
    
    # Generate tokens
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
```

### Frontend Authentication Hook
```typescript
const { user, login, logout, isLoading } = useAuth();

// Login
await login({
  username: 'admin',
  password: 'admin123',
  remember_me: true
});

// Logout
logout(false); // Don't show toast notification
```

### Protected Route Example
```typescript
function ProtectedComponent() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginForm />;
  
  return <DashboardContent />;
}
```

## Testing

### Unit Tests
- Authentication function testing
- Token generation and validation
- Password hashing verification
- Role-based access control testing

### Integration Tests
- End-to-end login flow
- Token refresh mechanism
- Session management
- Error handling scenarios

### Security Tests
- Password strength validation
- Token security verification
- Session hijacking prevention
- Cross-site scripting protection

## Dependencies

### Backend Dependencies
```
fastapi>=0.104.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
python-multipart>=0.0.6
motor>=3.3.0
pydantic>=2.5.0
```

### Frontend Dependencies
```
next>=14.0.0
react>=18.0.0
axios>=1.6.0
react-hot-toast>=2.4.0
@types/node>=20.0.0
typescript>=5.0.0
```

## Performance Considerations

### Token Validation
- Efficient JWT parsing and validation
- Minimal database queries for user lookup
- Caching of user permissions
- Optimized token refresh logic

### Session Management
- Lightweight session storage
- Efficient cleanup of expired sessions
- Minimal memory footprint
- Fast authentication checks

## Monitoring and Logging

### Authentication Events
- Login attempts (successful and failed)
- Token refresh operations
- Logout events
- Permission denied access attempts

### Security Monitoring
- Failed login attempt tracking
- Suspicious activity detection
- Session anomaly monitoring
- Token abuse detection

This authentication system provides a robust, secure, and user-friendly foundation for the SafetyAI application with comprehensive security features and excellent user experience.
