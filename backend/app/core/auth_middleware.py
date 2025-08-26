from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from datetime import datetime, timezone
from app.core.config import settings
from app.core.logging import get_logger
from typing import Optional, List
import re

logger = get_logger(__name__)

class GlobalAuthMiddleware:
    """Global authentication middleware that enforces consistent JWT validation."""
    
    def __init__(self, app):
        self.app = app
        # Define protected routes that require authentication
        self.protected_routes = [
            r"/api/v1/users/.*",
            r"/api/v1/sites/.*", 
            r"/api/v1/cameras/.*",
            r"/api/v1/alerts/.*",
            r"/api/v1/video/.*",
            r"/api/v1/stats/.*",
        ]
        # Define public routes that don't require authentication
        self.public_routes = [
            r"/api/v1/auth/login",
            r"/api/v1/auth/register",
            r"/api/v1/auth/token",
            r"/",
            r"/docs",
            r"/redoc",
            r"/openapi.json"
        ]
    
    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        
        # Convert scope to request for easier handling
        request = Request(scope, receive)
        
        # Check if route is public
        if self._is_public_route(request.url.path):
            await self.app(scope, receive, send)
            return
        
        # Check if route is protected
        if self._is_protected_route(request.url.path):
            # Validate authentication
            auth_result = await self._validate_authentication(request)
            if not auth_result["valid"]:
                # Return 401 Unauthorized for authentication failures
                response = JSONResponse(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    content={
                        "detail": auth_result["error"],
                        "error_code": auth_result["error_code"]
                    },
                    headers={"WWW-Authenticate": "Bearer"}
                )
                await response(scope, receive, send)
                return
        
        # Continue with the request if authentication is valid
        await self.app(scope, receive, send)
    
    def _is_public_route(self, path: str) -> bool:
        """Check if the route is public (no authentication required)."""
        return any(re.match(pattern, path) for pattern in self.public_routes)
    
    def _is_protected_route(self, path: str) -> bool:
        """Check if the route is protected (authentication required)."""
        return any(re.match(pattern, path) for pattern in self.protected_routes)
    
    async def _validate_authentication(self, request: Request) -> dict:
        """
        Validate JWT authentication token.
        
        Returns:
            dict: {
                "valid": bool,
                "error": str (if not valid),
                "error_code": str (if not valid)
            }
        """
        try:
            # Get Authorization header
            auth_header = request.headers.get("Authorization")
            if not auth_header:
                return {
                    "valid": False,
                    "error": "Missing Authorization header",
                    "error_code": "MISSING_AUTH_HEADER"
                }
            
            # Check if it's a Bearer token
            if not auth_header.startswith("Bearer "):
                return {
                    "valid": False,
                    "error": "Invalid Authorization header format. Expected 'Bearer <token>'",
                    "error_code": "INVALID_AUTH_FORMAT"
                }
            
            # Extract token
            token = auth_header.split(" ")[1]
            if not token:
                return {
                    "valid": False,
                    "error": "Empty token",
                    "error_code": "EMPTY_TOKEN"
                }
            
            # Validate token signature and decode
            try:
                payload = jwt.decode(
                    token, 
                    settings.SECRET_KEY, 
                    algorithms=[settings.ALGORITHM]
                )
            except JWTError as e:
                logger.warning(f"JWT decode error: {str(e)}")
                return {
                    "valid": False,
                    "error": "Invalid token signature",
                    "error_code": "INVALID_SIGNATURE"
                }
            
            # Check if token has required fields
            if "sub" not in payload:
                return {
                    "valid": False,
                    "error": "Token missing required subject field",
                    "error_code": "MISSING_SUBJECT"
                }
            
            # Check if token has expiration
            if "exp" not in payload:
                return {
                    "valid": False,
                    "error": "Token missing expiration field",
                    "error_code": "MISSING_EXPIRATION"
                }
            
            # Validate expiration
            exp_timestamp = payload["exp"]
            current_timestamp = datetime.now(timezone.utc).timestamp()
            
            if current_timestamp > exp_timestamp:
                logger.warning(f"Token expired for user {payload.get('sub', 'unknown')}")
                return {
                    "valid": False,
                    "error": "Token has expired",
                    "error_code": "TOKEN_EXPIRED"
                }
            
            # Token is valid
            logger.debug(f"Token validated successfully for user {payload.get('sub', 'unknown')}")
            return {"valid": True}
            
        except Exception as e:
            logger.error(f"Unexpected error in authentication validation: {str(e)}")
            return {
                "valid": False,
                "error": "Internal authentication error",
                "error_code": "INTERNAL_ERROR"
            }

def add_global_auth_middleware(app):
    """Add global authentication middleware to FastAPI app."""
    app.add_middleware(GlobalAuthMiddleware)
    logger.info("Global authentication middleware added successfully")
