from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.database import get_database
from app.models.user import User, UserUpdate
from app.api.v1.endpoints.auth import get_current_active_user
from app.api.v1.endpoints.auth import verify_password, get_password_hash
import json

router = APIRouter()

@router.get("/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's profile information"""
    try:
        # Get user from database to ensure we have the latest data
        # Use username if id is not available
        if current_user.id:
            user_doc = await db.users.find_one({"_id": current_user.id})
        else:
            user_doc = await db.users.find_one({"username": current_user.username})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get site information if user has a site_id
        site_info = None
        if user_doc.get("site_id"):
            try:
                site_doc = await db.sites.find_one({"_id": user_doc["site_id"]})
                if site_doc:
                    site_info = {
                        "id": str(site_doc["_id"]),
                        "name": site_doc.get("site_name", "Unknown"),
                        "location": site_doc.get("location", "Unknown")
                    }
            except Exception:
                # Site collection might not exist yet
                pass
        
        # Get user statistics
        user_stats = await get_user_statistics(current_user.id or current_user.username, db)
        
        profile_data = {
            "id": str(user_doc["_id"]),
            "username": user_doc["username"],
            "email": user_doc["email"],
            "firstName": user_doc["first_name"],
            "lastName": user_doc["last_name"],
            "fullName": f"{user_doc['first_name']} {user_doc['last_name']}",
            "role": user_doc["role"],
            "site": site_info,
            "isActive": user_doc.get("is_active", True),
            "permissions": user_doc.get("permissions", []),
            "createdAt": user_doc.get("created_at"),
            "updatedAt": user_doc.get("updated_at"),
            "lastLogin": user_doc.get("last_login"),
            "statistics": user_stats
        }
        
        return profile_data
        
    except HTTPException:
        # Re-raise HTTP exceptions (like 404) without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user profile: {str(e)}")

@router.put("/profile")
async def update_user_profile(
    profile_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update current user's profile information"""
    try:
        # Only allow updating certain fields
        allowed_fields = ["first_name", "last_name", "email"]
        update_data = {}
        
        for field in allowed_fields:
            if field in profile_data and profile_data[field] is not None:
                update_data[field] = profile_data[field]
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Check if email is already taken by another user
        if "email" in update_data:
            # Use username if id is not available for the query
            if current_user.id:
                existing_user = await db.users.find_one({
                    "email": update_data["email"],
                    "_id": {"$ne": current_user.id}
                })
            else:
                existing_user = await db.users.find_one({
                    "email": update_data["email"],
                    "username": {"$ne": current_user.username}
                })
            
            if existing_user:
                raise HTTPException(status_code=400, detail="Email already in use")
        
        # Update the user document
        update_data["updated_at"] = datetime.now(timezone.utc)
        
        # Use username if id is not available for the update
        if current_user.id:
            result = await db.users.update_one(
                {"_id": current_user.id},
                {"$set": update_data}
            )
        else:
            result = await db.users.update_one(
                {"username": current_user.username},
                {"$set": update_data}
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes made to profile")
        
        # Return updated profile
        return await get_user_profile(current_user, db)
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user profile: {str(e)}")

@router.put("/password")
async def change_password(
    password_data: Dict[str, str] = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Change current user's password"""
    try:
        current_password = password_data.get("currentPassword")
        new_password = password_data.get("newPassword")
        confirm_password = password_data.get("confirmPassword")
        
        if not all([current_password, new_password, confirm_password]):
            raise HTTPException(status_code=400, detail="All password fields are required")
        
        if new_password != confirm_password:
            raise HTTPException(status_code=400, detail="New passwords do not match")
        
        if len(new_password) < 8:
            raise HTTPException(status_code=400, detail="New password must be at least 8 characters long")
        
        # Get current user document to verify current password
        if current_user.id:
            user_doc = await db.users.find_one({"_id": current_user.id})
        else:
            user_doc = await db.users.find_one({"username": current_user.username})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Verify current password
        if not verify_password(current_password, user_doc["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        
        # Hash new password
        new_password_hash = get_password_hash(new_password)
        
        # Update password
        if current_user.id:
            result = await db.users.update_one(
                {"_id": current_user.id},
                {
                    "$set": {
                        "password_hash": new_password_hash,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            result = await db.users.update_one(
                {"username": current_user.username},
                {
                    "$set": {
                        "password_hash": new_password_hash,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to update password")
        
        return {"message": "Password updated successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error changing password: {str(e)}")

@router.get("/settings")
async def get_user_settings(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's settings and preferences"""
    try:
        # Get user settings from database
        if current_user.id:
            user_doc = await db.users.find_one({"_id": current_user.id})
        else:
            user_doc = await db.users.find_one({"username": current_user.username})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Default settings
        default_settings = {
            "notifications": {
                "email": True,
                "push": True,
                "sms": False
            },
            "privacy": {
                "profileVisibility": "public",
                "activityLog": True,
                "dataSharing": False
            },
            "preferences": {
                "language": "en",
                "timezone": "UTC",
                "dateFormat": "MM/DD/YYYY",
                "theme": "light"
            },
            "security": {
                "twoFactorAuth": False,
                "sessionTimeout": 3600,
                "loginNotifications": True
            }
        }
        
        # Get user's custom settings or use defaults
        user_settings = user_doc.get("settings", {})
        
        # Merge default settings with user settings
        settings = {}
        for category, defaults in default_settings.items():
            settings[category] = {**defaults, **user_settings.get(category, {})}
        
        return settings
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching user settings: {str(e)}")

@router.put("/settings")
async def update_user_settings(
    settings_data: Dict[str, Any] = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Update current user's settings and preferences"""
    try:
        # Validate settings structure
        allowed_categories = ["notifications", "privacy", "preferences", "security"]
        
        for category in settings_data:
            if category not in allowed_categories:
                raise HTTPException(status_code=400, detail=f"Invalid settings category: {category}")
        
        # Update user settings
        if current_user.id:
            result = await db.users.update_one(
                {"_id": current_user.id},
                {
                    "$set": {
                        "settings": settings_data,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            result = await db.users.update_one(
                {"username": current_user.username},
                {
                    "$set": {
                        "settings": settings_data,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="No changes made to settings")
        
        return {"message": "Settings updated successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating user settings: {str(e)}")

@router.get("/security")
async def get_account_security(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Get current user's account security information"""
    try:
        # Get user document
        if current_user.id:
            user_doc = await db.users.find_one({"_id": current_user.id})
        else:
            user_doc = await db.users.find_one({"username": current_user.username})
        
        if not user_doc:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get login history (last 10 logins)
        login_history = await get_login_history(current_user.id, db)
        
        # Get active sessions
        active_sessions = await get_active_sessions(current_user.id, db)
        
        # Get security settings
        security_settings = user_doc.get("settings", {}).get("security", {})
        
        security_info = {
            "accountStatus": {
                "isActive": user_doc.get("is_active", True),
                "lastLogin": user_doc.get("last_login"),
                "accountCreated": user_doc.get("created_at"),
                "lastPasswordChange": user_doc.get("password_changed_at")
            },
            "twoFactorAuth": {
                "enabled": security_settings.get("twoFactorAuth", False),
                "method": "email",  # Default method
                "backupCodes": []  # Would be populated if 2FA is enabled
            },
            "loginHistory": login_history,
            "activeSessions": active_sessions,
            "securityScore": calculate_security_score(user_doc, security_settings),
            "recommendations": get_security_recommendations(user_doc, security_settings)
        }
        
        return security_info
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching account security: {str(e)}")

@router.post("/security/enable-2fa")
async def enable_two_factor_auth(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Enable two-factor authentication for current user"""
    try:
        # This would typically involve generating QR codes, backup codes, etc.
        # For now, we'll just mark it as enabled
        
        if current_user.id:
            result = await db.users.update_one(
                {"_id": current_user.id},
                {
                    "$set": {
                        "settings.security.twoFactorAuth": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            result = await db.users.update_one(
                {"username": current_user.username},
                {
                    "$set": {
                        "settings.security.twoFactorAuth": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to enable 2FA")
        
        return {"message": "Two-factor authentication enabled successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error enabling 2FA: {str(e)}")

@router.post("/security/disable-2fa")
async def disable_two_factor_auth(
    current_user: User = Depends(get_current_active_user),
    db: AsyncIOMotorDatabase = Depends(get_database)
):
    """Disable two-factor authentication for current user"""
    try:
        if current_user.id:
            result = await db.users.update_one(
                {"_id": current_user.id},
                {
                    "$set": {
                        "settings.security.twoFactorAuth": False,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            result = await db.users.update_one(
                {"username": current_user.username},
                {
                    "$set": {
                        "settings.security.twoFactorAuth": False,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        
        if result.modified_count == 0:
            raise HTTPException(status_code=400, detail="Failed to disable 2FA")
        
        return {"message": "Two-factor authentication disabled successfully"}
        
    except HTTPException:
        # Re-raise HTTP exceptions without wrapping them
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error disabling 2FA: {str(e)}")

# Helper functions
async def get_user_statistics(user_id: str, db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """Get user activity statistics"""
    try:
        # Count alerts created by user
        alerts_count = 0
        try:
            alerts_count = await db.alerts.count_documents({"created_by": user_id})
        except Exception:
            # Collection might not exist yet
            pass
        
        # Count reports generated by user
        reports_count = 0
        try:
            reports_count = await db.reports.count_documents({"created_by": user_id})
        except Exception:
            # Collection might not exist yet
            pass
        
        # Get last activity
        last_activity = None
        try:
            last_activity = await db.alerts.find_one(
                {"created_by": user_id},
                sort=[("created_at", -1)]
            )
        except Exception:
            # Collection might not exist yet
            pass
        
        return {
            "totalAlerts": alerts_count,
            "totalReports": reports_count,
            "lastActivity": last_activity["created_at"] if last_activity else None
        }
    except Exception:
        return {"totalAlerts": 0, "totalReports": 0, "lastActivity": None}

async def get_login_history(user_id: str, db: AsyncIOMotorDatabase) -> list:
    """Get user login history"""
    try:
        # This would typically come from a separate login_logs collection
        # For now, return empty list
        return []
    except Exception:
        return []

async def get_active_sessions(user_id: str, db: AsyncIOMotorDatabase) -> list:
    """Get user's active sessions"""
    try:
        # This would typically come from a separate sessions collection
        # For now, return empty list
        return []
    except Exception:
        return []

def calculate_security_score(user_doc: dict, security_settings: dict) -> int:
    """Calculate user's security score (0-100)"""
    score = 50  # Base score
    
    # Password strength (would need to be implemented)
    if user_doc.get("password_hash"):
        score += 20
    
    # Two-factor authentication
    if security_settings.get("twoFactorAuth"):
        score += 20
    
    # Recent password change
    if user_doc.get("password_changed_at"):
        days_since_change = (datetime.now(timezone.utc) - user_doc["password_changed_at"]).days
        if days_since_change < 90:  # Password changed within 90 days
            score += 10
    
    return min(100, score)

def get_security_recommendations(user_doc: dict, security_settings: dict) -> list:
    """Get security recommendations for user"""
    recommendations = []
    
    if not security_settings.get("twoFactorAuth"):
        recommendations.append("Enable two-factor authentication for enhanced security")
    
    if not user_doc.get("password_changed_at"):
        recommendations.append("Change your password from the default")
    
    if not security_settings.get("loginNotifications"):
        recommendations.append("Enable login notifications to monitor account access")
    
    return recommendations
