from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.core.auth import get_current_user
from app.db.supabase_client import get_supabase_client
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

router = APIRouter()


class LogbookEntry(BaseModel):
    id: Optional[UUID] = None
    user_id: UUID
    curriculum_id: Optional[UUID] = None
    day_id: Optional[UUID] = None
    title: str
    content: Dict[str, Any]  # TipTap/ProseMirror JSON format
    content_text: Optional[str] = None  # Plain text for search
    entry_type: str = Field(..., pattern="^(reflection|project_progress|note|achievement)$")
    mood: Optional[str] = Field(None, pattern="^(excited|confident|neutral|frustrated|stuck)$")
    tags: List[str] = Field(default_factory=list)
    hours_spent: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class CreateLogbookEntryRequest(BaseModel):
    curriculum_id: Optional[UUID] = None
    day_id: Optional[UUID] = None
    title: str
    content: Dict[str, Any]
    content_text: Optional[str] = None
    entry_type: str = Field(..., pattern="^(reflection|project_progress|note|achievement)$")
    mood: Optional[str] = Field(None, pattern="^(excited|confident|neutral|frustrated|stuck)$")
    tags: List[str] = Field(default_factory=list)
    hours_spent: Optional[float] = None


class UpdateLogbookEntryRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[Dict[str, Any]] = None
    content_text: Optional[str] = None
    entry_type: Optional[str] = Field(None, pattern="^(reflection|project_progress|note|achievement)$")
    mood: Optional[str] = Field(None, pattern="^(excited|confident|neutral|frustrated|stuck)$")
    tags: Optional[List[str]] = None
    hours_spent: Optional[float] = None
    curriculum_id: Optional[UUID] = None
    day_id: Optional[UUID] = None


class LogbookEntryResponse(BaseModel):
    entry: LogbookEntry
    
    
class LogbookEntriesResponse(BaseModel):
    entries: List[LogbookEntry]
    total_count: int
    page: int
    page_size: int


@router.post("/entries", response_model=LogbookEntryResponse)
async def create_logbook_entry(
    request: CreateLogbookEntryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Create a new logbook entry."""
    supabase = get_supabase_client()
    
    # If content_text is not provided, extract text from content
    if not request.content_text and request.content:
        request.content_text = extract_text_from_content(request.content)
    
    entry_data = {
        "user_id": str(current_user.id),
        "curriculum_id": str(request.curriculum_id) if request.curriculum_id else None,
        "day_id": str(request.day_id) if request.day_id else None,
        "title": request.title,
        "content": request.content,
        "content_text": request.content_text,
        "entry_type": request.entry_type,
        "mood": request.mood,
        "tags": request.tags,
        "hours_spent": request.hours_spent,
    }
    
    try:
        response = supabase.table("logbook_entries").insert(entry_data).execute()
        
        if response.data:
            return LogbookEntryResponse(entry=LogbookEntry(**response.data[0]))
        else:
            raise HTTPException(status_code=500, detail="Failed to create logbook entry")
            
    except Exception as e:
        print(f"Error creating logbook entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entries", response_model=LogbookEntriesResponse)
async def get_logbook_entries(
    current_user: AuthenticatedUser = Depends(get_current_user),
    curriculum_id: Optional[UUID] = Query(None),
    day_id: Optional[UUID] = Query(None),
    entry_type: Optional[str] = Query(None),
    mood: Optional[str] = Query(None),
    tags: Optional[List[str]] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern="^(created_at|updated_at|title)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    """Get logbook entries with filtering and pagination."""
    supabase = get_supabase_client()
    
    query = supabase.table("logbook_entries").select("*", count="exact")
    query = query.eq("user_id", str(current_user.id))
    
    if curriculum_id:
        query = query.eq("curriculum_id", str(curriculum_id))
    if day_id:
        query = query.eq("day_id", str(day_id))
    if entry_type:
        query = query.eq("entry_type", entry_type)
    if mood:
        query = query.eq("mood", mood)
    if tags:
        query = query.contains("tags", tags)
    
    if search:
        # Use ILIKE for simple substring matching instead of full-text search
        # This searches both title and content_text fields
        print(f"[LOGBOOK DEBUG] Searching with term: '{search}'")
        search_pattern = f"%{search}%"
        query = query.or_(f"title.ilike.{search_pattern},content_text.ilike.{search_pattern}")
    else:
        # Apply sorting and pagination only if not searching
        query = query.order(sort_by, desc=(sort_order == "desc"))
        offset = (page - 1) * page_size
        query = query.range(offset, offset + page_size - 1)
    
    try:
        response = query.execute()
        
        validated_entries = []
        if response.data:
            for entry_data in response.data:
                try:
                    validated_entries.append(LogbookEntry(**entry_data))
                except Exception as e_val:
                    print(f"Pydantic validation error for logbook entry ID {entry_data.get('id', 'UNKNOWN')}: {str(e_val)}")
                    print(f"Problematic entry data: {entry_data}")
                    # Depending on strictness, you might raise here or skip the entry
                    # For now, let it fail to surface the root cause in server logs if a specific entry is bad.
                    raise HTTPException(status_code=500, detail=f"Data validation error for entry {entry_data.get('id', 'UNKNOWN')}")
        
        total_count = response.count if response.count is not None else 0
        
        return LogbookEntriesResponse(
            entries=validated_entries,
            total_count=total_count,
            page=page,
            page_size=page_size
        )
        
    except HTTPException: # Re-raise HTTPExceptions explicitly
        raise
    except Exception as e:
        print(f"Error fetching logbook entries: {e}")
        # Add traceback for unexpected errors
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred while fetching logbook entries: {str(e)}")


@router.get("/entries/{entry_id}", response_model=LogbookEntryResponse)
async def get_logbook_entry(
    entry_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get a specific logbook entry."""
    supabase = get_supabase_client()
    
    try:
        response = (
            supabase.table("logbook_entries")
            .select("*")
            .eq("id", str(entry_id))
            .eq("user_id", str(current_user.id))
            .single()
            .execute()
        )
        
        if response.data:
            return LogbookEntryResponse(entry=LogbookEntry(**response.data))
        else:
            raise HTTPException(status_code=404, detail="Logbook entry not found")
            
    except Exception as e:
        if "No rows found" in str(e):
            raise HTTPException(status_code=404, detail="Logbook entry not found")
        print(f"Error fetching logbook entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/entries/{entry_id}", response_model=LogbookEntryResponse)
async def update_logbook_entry(
    entry_id: UUID,
    request: UpdateLogbookEntryRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Update a logbook entry."""
    supabase = get_supabase_client()
    
    update_data: Dict[str, Any] = {}

    # Iterate over fields in the request model that were actually set by the client
    # Pydantic v2: request.model_fields_set contains names of fields explicitly set by client
    if not request.model_fields_set:
        raise HTTPException(status_code=400, detail="No fields provided in the request payload.")

    if "title" in request.model_fields_set:
        update_data["title"] = request.title
    
    if "content" in request.model_fields_set:
        update_data["content"] = request.content
        # If content is being set, always update content_text accordingly
        update_data["content_text"] = request.content_text or extract_text_from_content(request.content)
    elif "content_text" in request.model_fields_set: # Only if content itself isn't being updated
        update_data["content_text"] = request.content_text

    if "entry_type" in request.model_fields_set:
        update_data["entry_type"] = request.entry_type
    
    if "mood" in request.model_fields_set:
        update_data["mood"] = request.mood
    
    if "tags" in request.model_fields_set:
        update_data["tags"] = request.tags
    
    if "hours_spent" in request.model_fields_set:
        update_data["hours_spent"] = request.hours_spent

    if "curriculum_id" in request.model_fields_set:
        update_data["curriculum_id"] = str(request.curriculum_id) if request.curriculum_id else None
    
    if "day_id" in request.model_fields_set:
        update_data["day_id"] = str(request.day_id) if request.day_id else None
    
    # After attempting to populate, if update_data is still empty, 
    # it means the client sent fields that are not part of our UpdateLogbookEntryRequest model 
    # or all were handled such that no actual database update is needed (e.g. only unknown fields).
    # Pydantic would have stripped unknown fields. So if model_fields_set was not empty, 
    # but update_data is, it implies an issue or only non-updatable fields were sent.
    # However, our logic above ensures that if a known field is in model_fields_set, it goes into update_data.
    # So, this check primarily catches if only unknown fields were sent (which Pydantic strips).
    if not update_data:
         raise HTTPException(status_code=400, detail="No updatable fields provided in the request or fields were invalid.")

    print(f"[LOGBOOK UPDATE DEBUG] Updating entry {entry_id} with data: {update_data}")
    
    try:
        response = (
            supabase.table("logbook_entries")
            .update(update_data)
            .eq("id", str(entry_id))
            .eq("user_id", str(current_user.id))
            .execute()
        )
        
        if response.data:
            return LogbookEntryResponse(entry=LogbookEntry(**response.data[0]))
        else:
            # This could be due to the entry_id not found for that user, or other update issue
            # Supabase update usually returns data if successful, even if no rows matched (empty list).
            # If data is empty list and no error, means no row matched the .eq() conditions.
            # If error occurred during update, Supabase client should raise an exception.
            print(f"[LOGBOOK UPDATE DEBUG] Update for entry {entry_id} returned no data. Response: {response}")
            raise HTTPException(status_code=404, detail="Logbook entry not found or update failed.")
            
    except Exception as e:
        print(f"Error updating logbook entry {entry_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/entries/{entry_id}")
async def delete_logbook_entry(
    entry_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Delete a logbook entry."""
    supabase = get_supabase_client()
    
    try:
        response = (
            supabase.table("logbook_entries")
            .delete()
            .eq("id", str(entry_id))
            .eq("user_id", str(current_user.id))
            .execute()
        )
        
        if response.data:
            return {"message": "Logbook entry deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Logbook entry not found")
            
    except Exception as e:
        print(f"Error deleting logbook entry: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_logbook_stats(
    current_user: AuthenticatedUser = Depends(get_current_user),
    curriculum_id: Optional[UUID] = Query(None),
):
    """Get statistics about user's logbook entries."""
    supabase = get_supabase_client()
    
    try:
        # Base query
        query = supabase.table("logbook_entries").select("entry_type, mood, hours_spent, created_at")
        query = query.eq("user_id", str(current_user.id))
        
        if curriculum_id:
            query = query.eq("curriculum_id", str(curriculum_id))
        
        response = query.execute()
        
        # Calculate stats
        total_entries = len(response.data)
        total_hours = sum(entry.get("hours_spent", 0) or 0 for entry in response.data)
        
        # Count by type
        entry_types = {}
        moods = {}
        
        for entry in response.data:
            # Count entry types
            entry_type = entry.get("entry_type")
            if entry_type:
                entry_types[entry_type] = entry_types.get(entry_type, 0) + 1
            
            # Count moods
            mood = entry.get("mood")
            if mood:
                moods[mood] = moods.get(mood, 0) + 1
        
        # Calculate streak (consecutive days with entries)
        dates = sorted(set(
            datetime.fromisoformat(entry["created_at"].replace("Z", "+00:00")).date()
            for entry in response.data
        ))
        
        current_streak = 0
        longest_streak = 0
        
        if dates:
            # Calculate longest_streak
            if len(dates) == 1:
                longest_streak = 1
            else:
                current_sequence = 1
                for i in range(1, len(dates)):
                    if (dates[i] - dates[i-1]).days == 1:
                        current_sequence += 1
                    else:
                        longest_streak = max(longest_streak, current_sequence)
                        current_sequence = 1
                longest_streak = max(longest_streak, current_sequence)

            # Calculate current_streak (active streak ending today or yesterday)
            from datetime import date, timedelta
            today = date.today()
            
            # Check if the most recent entry was today or yesterday
            if dates[-1] == today or dates[-1] == (today - timedelta(days=1)):
                current_streak = 1 # Start with 1 for the last day
                # Iterate backwards from the second to last date
                for i in range(len(dates) - 2, -1, -1):
                    # If the current date is one day before the next date in the (reversed) sequence
                    if (dates[i+1] - dates[i]).days == 1:
                        current_streak += 1
                    else:
                        # Break if the sequence is broken
                        break
            else:
                # If the last entry wasn't today or yesterday, current streak is 0
                current_streak = 0
            
            # If there's only one entry and it's today/yesterday, current_streak is 1, longest is 1.
            # If it's older, current_streak is 0, longest is 1.
            if len(dates) == 1:
                if not (dates[-1] == today or dates[-1] == (today - timedelta(days=1))):
                     current_streak = 0
                # longest_streak is already 1 if dates has one element.

        return {
            "total_entries": total_entries,
            "total_hours": total_hours,
            "entry_types": entry_types,
            "moods": moods,
            "current_streak": current_streak,
            "longest_streak": longest_streak,
            "last_entry_date": dates[-1].isoformat() if dates else None,
        }
        
    except Exception as e:
        print(f"Error fetching logbook stats: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def extract_text_from_content(content: Dict[str, Any]) -> str:
    """Extract plain text from TipTap/ProseMirror content."""
    text_parts = []
    
    def extract_from_node(node: Dict[str, Any]):
        if node.get("type") == "text":
            text_parts.append(node.get("text", ""))
        
        if "content" in node and isinstance(node["content"], list):
            for child in node["content"]:
                extract_from_node(child)
    
    extract_from_node(content)
    return " ".join(text_parts) 