from typing import Any, Dict

from app.core.auth import get_current_user
from fastapi import APIRouter, Depends

router = APIRouter()


@router.get("/entries")
async def list_logbook_entries(current_user: Dict[str, Any] = Depends(get_current_user)):
    """List all logbook entries for the current user."""
    return {"entries": []} 