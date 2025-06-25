from typing import Any, Dict, Optional

from app.db.supabase_client import supabase
from fastapi import HTTPException, Request, status


async def get_current_user(request: Request) -> Dict[str, Any]:
    """Get the current authenticated user from Supabase auth token."""
    # Get the Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Extract the token
    token = auth_header.split(" ")[1]
    
    try:
        # Verify the token with Supabase
        user = supabase.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        
        return {
            "id": user.user.id,
            "email": user.user.email,
            "metadata": user.user.user_metadata
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


async def get_current_user_optional(request: Request) -> Optional[Dict[str, Any]]:
    """Get the current user if authenticated, otherwise return None."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None 