from fastapi import APIRouter
from app.api.v1.endpoints import users, cameras, alerts, sites, video, auth, stats, reports, profile, system_settings

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(sites.router, prefix="/sites", tags=["Sites"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["Cameras"])
api_router.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
api_router.include_router(video.router, prefix="/video", tags=["Video"])
api_router.include_router(stats.router, prefix="/stats", tags=["Statistics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(system_settings.router, prefix="/system-settings", tags=["System Settings"])
