from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from datetime import datetime, timedelta, timezone
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from app.core.config import settings
from app.core.database import get_database
from app.models.user import User, UserLogin, Token, TokenData


router = APIRouter()

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    # First try bcrypt (new format)
    try:
        if pwd_context.verify(plain_password, hashed_password):
            return True
    except:
        pass
    
    # Fallback to SHA-256 (old format from seed data)
    import hashlib
    sha256_hash = hashlib.sha256(plain_password.encode()).hexdigest()
    return sha256_hash == hashed_password

def get_password_hash(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create an access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a refresh token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=7)  # Refresh tokens last longer
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_user(username: str) -> Optional[User]:
    """Get a user by username."""
    try:
        database = get_database()
        user_doc = await database.users.find_one({"username": username})
        if user_doc:
            # Process the user document similar to authenticate_user
            from app.models.user import UserRole
            from datetime import datetime, timezone
            from bson import ObjectId
            
            # Convert role string to UserRole enum
            role_str = user_doc.get("role", "")
            try:
                role_enum = UserRole(role_str)
            except ValueError:
                role_enum = UserRole.OPERATOR
            
            # Convert datetime strings to datetime objects
            created_at = user_doc.get("created_at")
            if isinstance(created_at, str):
                try:
                    created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                except:
                    created_at = datetime.now(timezone.utc)
            elif not created_at:
                created_at = datetime.now(timezone.utc)
            
            updated_at = user_doc.get("updated_at")
            if isinstance(updated_at, str):
                try:
                    updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
                except:
                    updated_at = None
            elif not updated_at:
                updated_at = None
            
            # Handle ObjectId conversion
            user_id = user_doc.get("_id")
            if not user_id:
                user_id = str(ObjectId())
            elif isinstance(user_id, ObjectId):
                user_id = str(user_id)
            
            # Handle site_id conversion
            site_id = user_doc.get("site_id")
            if site_id and isinstance(site_id, ObjectId):
                site_id = str(site_id)
            
            user_data = {
                "_id": user_id,
                "username": user_doc.get("username", ""),
                "email": user_doc.get("email", ""),
                "role": role_enum,
                "site_id": site_id,
                "is_active": user_doc.get("is_active", True),
                "created_at": created_at,
                "updated_at": updated_at
            }
            return User(**user_data)
    except Exception as e:
        return None
    return None

async def get_user_with_password(username: str):
    """Get a user by username including password hash for authentication."""
    try:
        database = get_database()
        user_doc = await database.users.find_one({"username": username})
        return user_doc
    except Exception as e:
        return None

async def authenticate_user(username: str, password: str) -> Optional[User]:
    """Authenticate a user."""
    user_doc = await get_user_with_password(username)
    if not user_doc:
        return None
    if not verify_password(password, user_doc.get("password_hash", "")):
        return None
    
    # Create User object with only the fields that the User model expects
    from app.models.user import UserRole
    
    # Convert role string to UserRole enum
    role_str = user_doc.get("role", "")
    try:
        role_enum = UserRole(role_str)
    except ValueError:
        # Default to OPERATOR if role is invalid
        role_enum = UserRole.OPERATOR
    
    from datetime import datetime, timezone
    
    # Convert datetime strings to datetime objects
    created_at = user_doc.get("created_at")
    if isinstance(created_at, str):
        try:
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        except:
            created_at = datetime.now(timezone.utc)
    elif not created_at:
        created_at = datetime.now(timezone.utc)
    
    updated_at = user_doc.get("updated_at")
    if isinstance(updated_at, str):
        try:
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))
        except:
            updated_at = None
    elif not updated_at:
        updated_at = None
    
    from bson import ObjectId
    
    # Handle ObjectId conversion
    user_id = user_doc.get("_id")
    if not user_id:
        user_id = str(ObjectId())
    elif isinstance(user_id, ObjectId):
        user_id = str(user_id)
    
    # Handle site_id conversion
    site_id = user_doc.get("site_id")
    if site_id and isinstance(site_id, ObjectId):
        site_id = str(site_id)
    
    user_data = {
        "_id": user_id,  # Use _id (the actual field name with alias)
        "username": user_doc.get("username", ""),
        "email": user_doc.get("email", ""),
        "role": role_enum,
        "site_id": site_id,
        "is_active": user_doc.get("is_active", True),
        "created_at": created_at,
        "updated_at": updated_at
    }
    return User(**user_data)



async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Handle demo tokens
    if token.startswith('demo-token-'):
        # Create a demo user for demo tokens
        from app.models.user import UserRole
        from datetime import datetime, timezone
        from bson import ObjectId
        
        demo_user_data = {
            "_id": str(ObjectId()),  # Use _id (the actual field name with alias)
            "username": "demo_user",
            "email": "demo@safetyai.com",
            "role": UserRole.ADMINISTRATOR,
            "site_id": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        return User(**demo_user_data)
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Get the current active user."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """Login endpoint to get access token."""
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=7)  # 7 days
    refresh_token = create_refresh_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=refresh_token_expires
    )
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """Alternative login endpoint."""
    user = await authenticate_user(user_data.username, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=access_token_expires
    )
    
    refresh_token_expires = timedelta(days=7)  # 7 days
    refresh_token = create_refresh_token(
        data={"sub": user.username, "role": user.role.value}, 
        expires_delta=refresh_token_expires
        )
    
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@router.get("/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    """Get current user information."""
    return current_user

@router.post("/register")
async def register_user(user_data: UserLogin):
    """Register a new user (for development/testing purposes)."""
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
            "role": UserRole.OPERATOR.value,
            "is_active": True,
            "password_hash": get_password_hash(user_data.password),
                    "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc)
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

@router.post("/refresh")
async def refresh_access_token(request: dict):
    """Refresh an access token using a refresh token."""
    try:
        # Extract refresh token from request body
        refresh_token = request.get("refresh_token")
        if not refresh_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refresh token is required"
            )
        
        # Decode the refresh token
        payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        if username is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get the user
        user = await get_user(username=username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.username, "role": user.role.value}, 
            expires_delta=access_token_expires
        )
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
