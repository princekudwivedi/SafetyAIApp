from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_database
from app.models.user import User, UserInDB, UserLogin, Token, TokenData, RefreshToken
from app.models.base import PyObjectId

router = APIRouter()

# Password hashing - use only bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

async def get_user(username: str) -> Optional[UserInDB]:
    """Get a user by username."""
    try:
        database = get_database()
        user_doc = await database.users.find_one({"username": username})
        if user_doc:
            # Ensure all required fields are present and properly formatted
            user_data = {
                "username": user_doc.get("username"),
                "email": user_doc.get("email"),
                "first_name": user_doc.get("first_name", ""),  # Provide default if missing
                "last_name": user_doc.get("last_name", ""),    # Provide default if missing
                "role": user_doc.get("role"),
                "site_id": user_doc.get("site_id"),
                "is_active": user_doc.get("is_active", True),
                "permissions": user_doc.get("permissions", []),
                "password_hash": user_doc.get("password_hash"),
                "created_at": user_doc.get("created_at"),
                "updated_at": user_doc.get("updated_at"),
                "last_login": user_doc.get("last_login")
            }
            
            # Validate that required fields are present
            if not all([user_data["username"], user_data["email"], user_data["first_name"], 
                       user_data["last_name"], user_data["role"], user_data["password_hash"]]):
                print(f"Missing required fields for user {username}: {user_data}")
                return None
            
            return UserInDB(**user_data)
    except Exception as e:
        print(f"Error creating UserInDB: {e}")
        return None
    return None

async def authenticate_user(username: str, password: str) -> Optional[UserInDB]:
    """Authenticate a user."""
    user = await get_user(username)
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a refresh token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        
        if username is None or token_type != "access":
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/token", response_model=Token, 
    summary="OAuth2 Login",
    description="""
    Authenticate user using OAuth2 password flow and return access/refresh tokens.
    
    This endpoint follows the OAuth2 standard for password-based authentication.
    """,
    responses={
        200: {
            "description": "Authentication successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 1800,
                        "refresh_expires_in": 604800
                    }
                }
            }
        },
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Incorrect username or password"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "username"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 password flow authentication endpoint.
    
    - **username**: User's username
    - **password**: User's password
    
    Returns JWT access and refresh tokens upon successful authentication.
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last_login timestamp
    try:
        database = get_database()
        await database.users.update_one(
            {"_id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        print(f"📅 Updated last_login for user: {form_data.username}")
    except Exception as e:
        print(f"⚠️ Failed to update last_login for user {form_data.username}: {e}")
        print(f"🔍 User ID: {user.id}, Type: {type(user.id)}")
    
    # Default to regular token expiration
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    refresh_token = create_refresh_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=refresh_token_expires
    )
    
    return {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
        "refresh_expires_in": int(refresh_token_expires.total_seconds())
    }

@router.post("/login", response_model=Token,
    summary="Custom Login",
    description="""
    Custom login endpoint with remember me functionality.
    
    This endpoint provides extended login options including remember me functionality
    for longer session durations.
    """,
    responses={
        200: {
            "description": "Authentication successful",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 1800,
                        "refresh_expires_in": 604800
                    }
                }
            }
        },
        401: {
            "description": "Authentication failed",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Incorrect username or password"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "username"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def login(user_data: UserLogin):
    """
    Custom login endpoint with remember me support.
    
    - **username**: User's username (required)
    - **password**: User's password (required)
    - **remember_me**: Enable extended session duration (optional, default: false)
    
    Returns JWT access and refresh tokens. Token expiration is extended if remember_me is true.
    """
    print(f"🔐 Login attempt for user: {user_data.username}, remember_me: {user_data.remember_me}")
    
    user = await authenticate_user(user_data.username, user_data.password)
    if not user:
        print(f"❌ Authentication failed for user: {user_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    print(f"✅ Authentication successful for user: {user_data.username}")
    
    # Update last_login timestamp
    try:
        database = get_database()
        await database.users.update_one(
            {"_id": user.id},
            {"$set": {"last_login": datetime.utcnow()}}
        )
        print(f"📅 Updated last_login for user: {user_data.username}")
    except Exception as e:
        print(f"⚠️ Failed to update last_login for user {user_data.username}: {e}")
        print(f"🔍 User ID: {user.id}, Type: {type(user.id)}")
    
    # Set token expiration based on remember me
    if user_data.remember_me:
        access_token_expires = timedelta(days=settings.REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS)
        print(f"🕒 Using remember me expiration: {settings.REMEMBER_ME_ACCESS_TOKEN_EXPIRE_DAYS} days")
    else:
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        print(f"🕒 Using regular expiration: {settings.ACCESS_TOKEN_EXPIRE_MINUTES} minutes")
    
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    print(f"🔑 Creating access token with expiration: {access_token_expires}")
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    print(f"🔄 Creating refresh token with expiration: {refresh_token_expires}")
    refresh_token = create_refresh_token(
        data={"sub": user.username, "role": user.role.value},
        expires_delta=refresh_token_expires
    )
    
    response_data = {
        "access_token": access_token, 
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": int(access_token_expires.total_seconds()),
        "refresh_expires_in": int(refresh_token_expires.total_seconds())
    }
    
    print(f"✅ Login response prepared: {response_data}")
    print(f"🔑 Access token length: {len(access_token)}")
    print(f"🔄 Refresh token length: {len(refresh_token)}")
    
    return response_data

@router.post("/refresh", response_model=Token,
    summary="Refresh Token",
    description="""
    Refresh an expired access token using a valid refresh token.
    
    This endpoint allows users to get a new access token without re-authenticating,
    as long as their refresh token is still valid.
    """,
    responses={
        200: {
            "description": "Token refreshed successfully",
            "content": {
                "application/json": {
                    "example": {
                        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                        "token_type": "bearer",
                        "expires_in": 1800,
                        "refresh_expires_in": 604800
                    }
                }
            }
        },
        401: {
            "description": "Invalid refresh token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate refresh token"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "refresh_token"],
                                "msg": "field required",
                                "type": "value_error.missing"
                            }
                        ]
                    }
                }
            }
        }
    }
)
async def refresh_access_token(refresh_token_data: RefreshToken):
    """
    Refresh access token using refresh token.
    
    - **refresh_token**: Valid refresh token (required)
    
    Returns new access and refresh tokens if the refresh token is valid.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(refresh_token_data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "refresh":
            raise credentials_exception
            
        # Get user to verify they still exist and are active
        user = await get_user(username=username)
        if user is None or not user.is_active:
            raise credentials_exception
            
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        new_access_token = create_access_token(
            data={"sub": user.username, "role": user.role.value}, 
            expires_delta=access_token_expires
        )
        
        # Create new refresh token
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_refresh_token = create_refresh_token(
            data={"sub": user.username, "role": user.role.value},
            expires_delta=refresh_token_expires
        )
        
        return {
            "access_token": new_access_token, 
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "expires_in": int(access_token_expires.total_seconds()),
            "refresh_expires_in": int(refresh_token_expires.total_seconds())
        }
        
    except JWTError:
        raise credentials_exception

@router.get("/me", response_model=User,
    summary="Get Current User",
    description="""
    Retrieve information about the currently authenticated user.
    
    This endpoint returns the user's profile information including role, permissions,
    and account status.
    """,
    responses={
        200: {
            "description": "User information retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "id": "68b3c724f7dd9b36dd0b01e6",
                        "username": "admin",
                        "email": "admin@safetyai.com",
                        "first_name": "System",
                        "last_name": "Administrator",
                        "role": "Administrator",
                        "site_id": "SITE_001",
                        "is_active": True,
                        "permissions": ["read", "write", "delete", "admin"],
                        "created_at": "2025-08-29T17:13:29.182000",
                        "updated_at": "2025-08-30T09:36:54.128000",
                        "last_login": "2025-08-31T03:53:08.930000"
                    }
                }
            }
        },
        401: {
            "description": "Unauthorized - Invalid or missing token",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Could not validate credentials"
                    }
                }
            }
        },
        400: {
            "description": "Inactive user",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Inactive user"
                    }
                }
            }
        }
    }
)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.
    
    Returns the profile information of the currently authenticated user.
    Requires a valid JWT access token.
    """
    return current_user

@router.post("/register",
    summary="Register User",
    description="""
    Register a new user account (development/testing purposes only).
    
    This endpoint creates a new user account with default Operator role.
    For production use, user registration should be handled through proper admin interfaces.
    """,
    responses={
        200: {
            "description": "User registered successfully",
            "content": {
                "application/json": {
                    "example": {
                        "message": "User registered successfully",
                        "user_id": "68b3c724f7dd9b36dd0b01e6"
                    }
                }
            }
        },
        400: {
            "description": "Username already exists",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Username already registered"
                    }
                }
            }
        },
        422: {
            "description": "Validation error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": [
                            {
                                "loc": ["body", "username"],
                                "msg": "ensure this value has at least 3 characters",
                                "type": "value_error.any_str.min_length"
                            }
                        ]
                    }
                }
            }
        },
        500: {
            "description": "Internal server error",
            "content": {
                "application/json": {
                    "example": {
                        "detail": "Internal server error: Database connection failed"
                    }
                }
            }
        }
    }
)
async def register_user(user_data: UserLogin):
    """
    Register a new user account.
    
    - **username**: Username for the new account (required, min 3 chars)
    - **password**: Password for the new account (required, min 8 chars)
    - **remember_me**: Not used for registration (optional)
    
    Creates a new user with Operator role and default permissions.
    Returns the user ID upon successful registration.
    """
    try:
        database = get_database()
        
        # Check if user already exists
        existing_user = await database.users.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already registered"
            )
        
        # Create new user (default role: Operator)
        from app.models.user import UserRole
        user_doc = {
            "username": user_data.username,
            "email": f"{user_data.username}@example.com",  # Default email
            "first_name": user_data.username.title(),  # Use username as first name
            "last_name": "User",  # Default last name
            "role": UserRole.OPERATOR.value,
            "is_active": True,
            "permissions": ["read"],  # Default permissions for Operator
            "password_hash": get_password_hash(user_data.password),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_login": None
        }
        
        result = await database.users.insert_one(user_doc)
        
        if result.inserted_id:
            return {"message": "User registered successfully", "user_id": str(result.inserted_id)}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create user"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )
