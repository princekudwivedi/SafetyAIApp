from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models.user import User, UserCreate, UserUpdate, UserRole
from app.api.v1.endpoints.auth import get_current_active_user, get_password_hash
from app.core.database import get_database


router = APIRouter()

@router.get("/", response_model=List[User])
async def get_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get users with filtering options."""
    try:
        # Check if user has permission to view all users
        if current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view users"
            )
        
        database = get_database()
        
        # Build filter
        filter_query = {}
        if role:
            filter_query["role"] = role
        if is_active is not None:
            filter_query["is_active"] = is_active
        
        # Query database
        cursor = database.users.find(filter_query).skip(skip).limit(limit)
        users = []
        
        async for user_doc in cursor:
            users.append(User(**user_doc))
        
        return users
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving users: {str(e)}"
        )

@router.get("/{user_id}", response_model=User)
async def get_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific user by ID."""
    try:
        # Check if user has permission to view this user
        if (current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR] and 
            str(current_user.id) != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to view this user"
            )
        
        database = get_database()
        user_doc = await database.users.find_one({"_id": ObjectId(user_id)})
        
        if not user_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return User(**user_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user: {str(e)}"
        )

@router.post("/", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new user."""
    try:
        # Check if user has permission to create users
        if current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create users"
            )
        
        database = get_database()
        
        # Check if username already exists
        existing_user = await database.users.find_one({"username": user_data.username})
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )
        
        # Check if email already exists
        if user_data.email:
            existing_email = await database.users.find_one({"email": user_data.email})
            if existing_email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already exists"
                )
        
        # Create user document
        user_doc = {
            "username": user_data.username,
            "email": user_data.email,
            "role": user_data.role,
            "site_id": user_data.site_id,
            "is_active": user_data.is_active,
            "password_hash": get_password_hash(user_data.password),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.users.insert_one(user_doc)
        
        if result.inserted_id:
            user_doc["_id"] = result.inserted_id
            return User(**user_doc)
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
            detail=f"Error creating user: {str(e)}"
        )

@router.put("/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a user."""
    try:
        # Check if user has permission to update this user
        if (current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR] and 
            str(current_user.id) != user_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update this user"
            )
        
        # Check if user is trying to change their own role to a higher one
        if (str(current_user.id) == user_id and 
            update_data.role and 
            update_data.role.value > current_user.role.value):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot promote yourself to a higher role"
            )
        
        database = get_database()
        
        # Check if user exists
        existing_user = await database.users.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Prepare update data
        update_fields = {}
        if update_data.username is not None:
            # Check if new username already exists
            if update_data.username != existing_user["username"]:
                existing_username = await database.users.find_one({"username": update_data.username})
                if existing_username:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists"
                    )
            update_fields["username"] = update_data.username
        
        if update_data.email is not None:
            # Check if new email already exists
            if update_data.email != existing_user.get("email"):
                existing_email = await database.users.find_one({"email": update_data.email})
                if existing_email:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Email already exists"
                    )
            update_fields["email"] = update_data.email
        
        if update_data.role is not None:
            update_fields["role"] = update_data.role
        
        if update_data.site_id is not None:
            update_fields["site_id"] = update_data.site_id
        
        if update_data.is_active is not None:
            update_fields["is_active"] = update_data.is_active
        
        update_fields["updated_at"] = datetime.utcnow()
        
        # Update user
        result = await database.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            # Get updated user
            updated_user = await database.users.find_one({"_id": ObjectId(user_id)})
            return User(**updated_user)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user: {str(e)}"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a user."""
    try:
        # Check if user has permission to delete users
        if current_user.role not in [UserRole.ADMINISTRATOR, UserRole.SUPERVISOR]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete users"
            )
        
        # Check if user is trying to delete themselves
        if str(current_user.id) == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete yourself"
            )
        
        database = get_database()
        
        # Check if user exists
        existing_user = await database.users.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Delete user
        result = await database.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count > 0:
            return {"message": "User deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete user"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting user: {str(e)}"
        )

@router.get("/me/profile", response_model=User)
async def get_my_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user's profile."""
    return current_user

@router.put("/me/profile", response_model=User)
async def update_my_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update current user's profile."""
    try:
        # Only allow updating certain fields for self
        allowed_updates = UserUpdate(
            username=update_data.username,
            email=update_data.email,
            site_id=update_data.site_id
        )
        
        return await update_user(str(current_user.id), allowed_updates, current_user)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

@router.get("/roles/list")
async def get_available_roles(current_user: User = Depends(get_current_active_user)):
    """Get list of available user roles."""
    return [
        {"value": role.value, "label": role.value, "description": f"{role.value} role"}
        for role in UserRole
    ]
