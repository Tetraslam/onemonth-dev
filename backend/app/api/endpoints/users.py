from typing import Any, Dict

from app.core.auth import get_current_user
from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/me")
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the current user's profile."""
    return {"user": current_user} 