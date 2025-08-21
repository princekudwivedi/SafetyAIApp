from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime
from app.models.user import User
from app.models.safety import Site, SiteCreate, SiteUpdate
from app.api.v1.endpoints.auth import get_current_active_user
from app.core.database import get_database
from app.models.base import PyObjectId

router = APIRouter()

@router.get("/", response_model=List[Site])
async def get_sites(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(get_current_active_user)
):
    """Get sites with filtering options."""
    try:
        database = get_database()
        
        # Build filter
        filter_query = {}
        if is_active is not None:
            filter_query["is_active"] = is_active
        
        # Query database
        cursor = database.sites.find(filter_query).skip(skip).limit(limit)
        sites = []
        
        async for site_doc in cursor:
            sites.append(Site(**site_doc))
        
        return sites
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving sites: {str(e)}"
        )

@router.get("/{site_id}", response_model=Site)
async def get_site(
    site_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific site by ID."""
    try:
        database = get_database()
        site_doc = await database.sites.find_one({"site_id": site_id})
        
        if not site_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        return Site(**site_doc)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving site: {str(e)}"
        )

@router.post("/", response_model=Site)
async def create_site(
    site_data: SiteCreate,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new site."""
    try:
        # Check if user has permission to create sites
        if current_user.role.value not in ["Administrator", "Supervisor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to create sites"
            )
        
        database = get_database()
        
        # Generate site ID
        import uuid
        site_id = f"SITE_{str(uuid.uuid4())[:8].upper()}"
        
        # Create site document
        site_doc = {
            "site_id": site_id,
            "site_name": site_data.site_name,
            "location": site_data.location,
            "contact_person": site_data.contact_person,
            "contact_email": site_data.contact_email,
            "contact_phone": site_data.contact_phone,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        result = await database.sites.insert_one(site_doc)
        
        if result.inserted_id:
            site_doc["_id"] = result.inserted_id
            return Site(**site_doc)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create site"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating site: {str(e)}"
        )

@router.put("/{site_id}", response_model=Site)
async def update_site(
    site_id: str,
    update_data: SiteUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update a site."""
    try:
        # Check if user has permission to update sites
        if current_user.role.value not in ["Administrator", "Supervisor"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to update sites"
            )
        
        database = get_database()
        
        # Check if site exists
        existing_site = await database.sites.find_one({"site_id": site_id})
        if not existing_site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Prepare update data
        update_fields = {}
        if update_data.site_name is not None:
            update_fields["site_name"] = update_data.site_name
        if update_data.location is not None:
            update_fields["location"] = update_data.location
        if update_data.contact_person is not None:
            update_fields["contact_person"] = update_data.contact_person
        if update_data.contact_email is not None:
            update_fields["contact_email"] = update_data.contact_email
        if update_data.contact_phone is not None:
            update_fields["contact_phone"] = update_data.contact_phone
        if update_data.is_active is not None:
            update_fields["is_active"] = update_data.is_active
        
        update_fields["updated_at"] = datetime.utcnow()
        
        # Update site
        result = await database.sites.update_one(
            {"site_id": site_id},
            {"$set": update_fields}
        )
        
        if result.modified_count > 0:
            # Get updated site
            updated_site = await database.sites.find_one({"site_id": site_id})
            return Site(**updated_site)
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update site"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating site: {str(e)}"
        )

@router.delete("/{site_id}")
async def delete_site(
    site_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete a site."""
    try:
        # Check if user has permission to delete sites
        if current_user.role.value not in ["Administrator"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to delete sites"
            )
        
        database = get_database()
        
        # Check if site exists
        existing_site = await database.sites.find_one({"site_id": site_id})
        if not existing_site:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Check if site has active cameras
        camera_count = await database.cameras.count_documents({"site_id": site_id, "status": "Active"})
        if camera_count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete site with active cameras"
            )
        
        # Delete site
        result = await database.sites.delete_one({"site_id": site_id})
        
        if result.deleted_count > 0:
            return {"message": "Site deleted successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete site"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting site: {str(e)}"
        )

@router.get("/{site_id}/cameras")
async def get_site_cameras(
    site_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get all cameras for a specific site."""
    try:
        database = get_database()
        
        # Check if site exists
        site_exists = await database.sites.find_one({"site_id": site_id})
        if not site_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Get cameras for the site
        cursor = database.cameras.find({"site_id": site_id})
        cameras = []
        
        async for camera_doc in cursor:
            cameras.append(camera_doc)
        
        return {
            "site_id": site_id,
            "cameras": cameras,
            "total_cameras": len(cameras)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving site cameras: {str(e)}"
        )

@router.get("/{site_id}/alerts")
async def get_site_alerts(
    site_id: str,
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user)
):
    """Get recent alerts for a specific site."""
    try:
        database = get_database()
        
        # Check if site exists
        site_exists = await database.sites.find_one({"site_id": site_id})
        if not site_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Site not found"
            )
        
        # Get alerts for the site
        cursor = database.alerts.find({"location_id": site_id}).sort("timestamp", -1).limit(limit)
        alerts = []
        
        async for alert_doc in cursor:
            alerts.append(alert_doc)
        
        return {
            "site_id": site_id,
            "alerts": alerts,
            "total_alerts": len(alerts)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving site alerts: {str(e)}"
        )
