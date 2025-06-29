import asyncio
import json
import re
import traceback
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

import json5
from app.agents.curriculum_agent import curriculum_agent
from app.api.dependencies import require_subscription
from app.core.auth import get_current_user
from app.db.supabase_client import supabase
from app.models.curriculum import (Curriculum, CurriculumCreate, CurriculumDay,
                                   CurriculumDayCreate)
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

router = APIRouter()

class ProgressRecord(BaseModel):
    id: UUID
    user_id: UUID
    curriculum_id: UUID
    day_id: UUID
    completed_at: datetime

@router.post("/", response_model=Curriculum)
async def create_curriculum(
    curriculum_data: CurriculumCreate,
    current_user: AuthenticatedUser = Depends(require_subscription)
):
    """Create a new curriculum for the current user."""
    user_id = current_user.id
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token")

    # 1. Create the Curriculum entry in Supabase with initial status
    db_curriculum_data = curriculum_data.model_dump()
    
    # Map our model fields to database fields
    db_curriculum_data["title"] = curriculum_data.title or f"Learning {curriculum_data.learning_goal}"
    db_curriculum_data["description"] = curriculum_data.description or curriculum_data.learning_goal
    db_curriculum_data["user_id"] = str(user_id)
    db_curriculum_data["id"] = str(uuid4())
    
    # Map learning_goal to topic and goal (database schema)
    db_curriculum_data["topic"] = curriculum_data.learning_goal
    db_curriculum_data["goal"] = curriculum_data.learning_goal
    
    # Set initial generation status
    db_curriculum_data["generation_status"] = "generating"
    db_curriculum_data["generation_progress"] = "Starting curriculum generation..."
    
    # Store extra fields in metadata
    metadata = db_curriculum_data.get("metadata", {})
    metadata.update({
        "prerequisites": curriculum_data.prerequisites,
        "daily_time_commitment_minutes": curriculum_data.daily_time_commitment_minutes,
        "learning_style": curriculum_data.learning_style
    })
    db_curriculum_data["metadata"] = metadata
    
    # Remove fields that were moved to metadata or renamed
    fields_to_remove = ["learning_goal", "prerequisites", "daily_time_commitment_minutes", "learning_style"]
    for field in fields_to_remove:
        if field in db_curriculum_data:
            del db_curriculum_data[field]

    print(f"Inserting curriculum with fields: {list(db_curriculum_data.keys())}")
    created_curriculum_row = supabase.table("curricula").insert(db_curriculum_data).execute()

    if not created_curriculum_row.data:
        raise HTTPException(status_code=500, detail="Failed to create curriculum in database")
    
    new_curriculum_id = created_curriculum_row.data[0]["id"]

    # Update status: Researching topic
    supabase.table("curricula").update({
        "generation_progress": "Researching your topic and gathering resources..."
    }).eq("id", new_curriculum_id).execute()

    # Prepare initial messages for the agent based on curriculum_data
    agent_messages = [
        {
            "role": "user",
            "content": f"""
            Please generate a detailed curriculum based on the following preferences:
            Learning Goal: {curriculum_data.learning_goal}
            Title (optional): {curriculum_data.title}
            Description (optional): {curriculum_data.description}
            Difficulty: {curriculum_data.difficulty_level}
            Total Duration (days): {curriculum_data.estimated_duration_days}
            Prerequisites: {curriculum_data.prerequisites or 'None specified'}
            Time per Day (minutes): {curriculum_data.daily_time_commitment_minutes or 'Not specified'}
            Learning Style: {curriculum_data.learning_style or 'Balanced'}
            Number of Projects: {curriculum_data.num_projects or 0}
            
            The output should be a JSON object with a main 'curriculum_title' and 'curriculum_description', 
            and a list of 'days'. Each day object in the list should have:
            - 'day_number' (int)
            - 'title' (str, concise title for the day)
            - 'is_project_day' (bool, true if this day is a project day, false otherwise)
            - 'project_data' (dict, optional, only if is_project_day is true. Should contain 'title', 'description', 'objectives', 'requirements', 'deliverables', and 'evaluation_criteria')
            - 'content' (dict, TipTap/ProseMirror JSON object for the learning module. This object MUST have a root 'type': 'doc' and a 'content' array. This array should contain a sequence of nodes representing the day's lesson. Structure each day's lesson content with the following sections, using appropriate TipTap/ProseMirror nodes (like 'heading' with levels 1-3, 'paragraph', 'bulletList', 'orderedList', 'listItem', 'codeBlock' where appropriate, and 'text' nodes with marks for 'bold', 'italic', 'link'):
                1.  "Introduction": (Required) A brief overview of the day's topic (e.g., a 'heading' node with level 2, followed by one or two 'paragraph' nodes).
                2.  "Learning Objectives": (Required) 2-4 clear, actionable objectives for the day (e.g., a 'heading' node with level 3, followed by a 'bulletList' node, where each 'listItem' contains a 'paragraph' with the objective).
                3.  "Key Concepts": (Required) Detailed explanations of the core concepts for the day. This should be the most substantial part. Use multiple 'heading' nodes (level 3) for sub-topics if needed, followed by detailed 'paragraph' nodes. Incorporate information from the 'Supporting Research' (which will be provided to you) to make these explanations comprehensive. If code examples or mathematical formulas are relevant and found in research, represent them accurately, perhaps within 'paragraph' nodes or using 'codeBlock' if appropriate.
                4.  "Examples": (Optional, but highly encouraged) 1-2 worked examples or illustrative scenarios related to the key concepts (e.g., a 'heading' node with level 3, followed by 'paragraph' or 'orderedList' nodes explaining the example step-by-step).
                5.  "Summary": (Required) A concise recap of the day's main points (e.g., a 'heading' node with level 3, followed by a 'bulletList' node).
                Ensure all text content is well-written, clear, and engaging.
            - 'resources' (list of dicts, each with 'title' and 'url')
            - 'estimated_hours' (float, optional)
            
            Focus on creating practical, actionable content for each day.
            Ensure the curriculum spans the specified number of days.
            Provide diverse resources (articles, videos, interactive exercises if possible).
            When generating the 'content' for each day, utilize the 'Supporting Research' (which will be provided to you along with these preferences) to make the explanations and concepts as detailed and accurate as possible.
            
            IMPORTANT: If num_projects is greater than 0, distribute the projects evenly throughout the curriculum. For example:
            - If num_projects=1 and duration=30 days, place the project around day 20-25
            - If num_projects=2 and duration=30 days, place projects around day 10-12 and day 22-25
            - If num_projects=3 and duration=30 days, place projects around day 8-10, day 16-18, and day 24-26
            
            For project days:
            - Set 'is_project_day' to true
            - Include a 'project_data' object with comprehensive project details
            - The project should integrate and apply concepts learned in the preceding days
            - Projects should be practical, hands-on activities that reinforce learning
            - Project titles should be descriptive but not overly playful (e.g., "Build a Weather Data Analyzer" not "Weather Wizard 3000")
            """
        }
    ]
    
    # Agent context can pass along the structured preferences and curriculum_id for status updates
    agent_context = curriculum_data.model_dump()
    agent_context["curriculum_id"] = new_curriculum_id

    try:
        # Update status: Planning curriculum structure
        supabase.table("curricula").update({
            "generation_progress": "Planning curriculum structure and daily topics..."
        }).eq("id", new_curriculum_id).execute()

        # Call the agent to generate the curriculum structure and content
        print(f"Calling agent with messages: {agent_messages[:100]}...")  # Log first 100 chars
        raw_agent_response = await curriculum_agent.run(messages=agent_messages, context=agent_context)
        print(f"Agent response length: {len(raw_agent_response) if raw_agent_response else 0}")
        print(f"Agent response preview: {raw_agent_response[:500] if raw_agent_response else 'None'}...")

        # Update status: Processing content
        supabase.table("curricula").update({
            "generation_progress": "Creating day-by-day content and resources..."
        }).eq("id", new_curriculum_id).execute()
        
        try:
            # First try to extract JSON from the response in case it's wrapped in markdown or other text
            import re
            json_match = re.search(r'\{.*\}', raw_agent_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                print(f"Extracted JSON from response, length: {len(json_str)}")
            else:
                json_str = raw_agent_response
                print("Using raw response as JSON")
            
            # --- Robust JSON cleaning ---
            # General fix for variations of "key" := "value", "key" :- "value", etc.
            # This will replace `:-` or `:=` with just `:` when between a quote and another character.
            json_str = re.sub(r'(?<=["\'])\s*:\s*[-=]\s*(?=["\'\d\[\{tfn])', ': ', json_str)
            
            # Fix for unquoted keys or keys with single quotes (less common but possible)
            json_str = re.sub(r"([{,]\s*)'([^']*)'\s*:", r'\1"\2":', json_str)
            
            # Remove trailing commas before } or ]
            json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
            
            # Fix double commas
            json_str = re.sub(r',\s*,', ',', json_str)
            
            # Escape stray backslashes that are not part of a valid escape sequence
            json_str = re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', json_str)
            
            # Replace raw backticks in JSON strings with their unicode escape to avoid invalid escapes
            json_str = json_str.replace('`', '\\u0060')
            
            # Try to parse the cleaned JSON (standard json), fallback to json5 for lenient parsing
            try:
                generated_curriculum = json.loads(json_str)
            except json.JSONDecodeError as e1:
                try:
                    generated_curriculum = json5.loads(json_str)
                except Exception as e2:
                    raise e1
            
            curriculum_title = generated_curriculum.get("curriculum_title", curriculum_data.title or f"Learning {curriculum_data.learning_goal}")
            curriculum_description = generated_curriculum.get("curriculum_description", curriculum_data.description or curriculum_data.learning_goal)
            generated_days_data = generated_curriculum.get("days", [])
            
            print(f"Parsed curriculum with {len(generated_days_data)} days")
            
            if not isinstance(generated_days_data, list):
                raise ValueError("Agent did not return a list of days.")
        except (json.JSONDecodeError, ValueError) as e:
            # If it still fails, try to find and log the specific error location
            if isinstance(e, json.JSONDecodeError):
                error_line = json_str.split('\n')[e.lineno - 1] if e.lineno else "Unknown"
                print(f"JSON error at line {e.lineno}, col {e.colno}: {error_line}")
                print(f"Error context: {json_str[max(0, e.pos-100):e.pos+100] if e.pos else 'Unknown'}")
            
            print(f"JSON parsing error: {str(e)}")
            print(f"Raw response that failed to parse: {raw_agent_response[:1000]}...")
            
            # Update status to failed
            supabase.table("curricula").update({
                "generation_status": "failed",
                "generation_progress": f"Failed to parse curriculum content: {str(e)}"
            }).eq("id", new_curriculum_id).execute()
            
            raise HTTPException(status_code=500, detail=f"Failed to parse agent response even after cleaning attempts: {str(e)}. Error near position {getattr(e, 'pos', 'unknown')}")

        # Update curriculum with title and description from agent
        supabase.table("curricula").update({
            "title": curriculum_title,
            "description": curriculum_description,
            "generation_progress": f"Creating {len(generated_days_data)} days of content..."
        }).eq("id", new_curriculum_id).execute()

        # 2. Create CurriculumDay entries for each day generated by the agent
        days_to_insert = []
        for i, day_data_raw in enumerate(generated_days_data):
            # Update progress for each day
            if i % 5 == 0:  # Update every 5 days to avoid too many DB calls
                supabase.table("curricula").update({
                    "generation_progress": f"Processing day {i+1} of {len(generated_days_data)}..."
                }).eq("id", new_curriculum_id).execute()
                
            # Validate and create CurriculumDayCreate objects
            # The agent MUST provide data in the format CurriculumDayCreate expects
            try:
                # Extract project fields if present
                is_project_day = day_data_raw.get("is_project_day", False)
                project_data = day_data_raw.get("project_data", None) if is_project_day else None
                
                # Create the day object without project fields for validation
                day_fields = {k: v for k, v in day_data_raw.items() if k not in ["is_project_day", "project_data"]}
                day_create_obj = CurriculumDayCreate(**day_fields)
                
                # Add to insert list with project fields
                day_dict = day_create_obj.model_dump()
                day_dict.update({
                    "curriculum_id": new_curriculum_id,
                    "id": str(uuid4()),
                    "is_project_day": is_project_day,
                    "project_data": project_data
                })
                days_to_insert.append(day_dict)
            except Exception as e: # Catch Pydantic validation errors or others
                # Log this error, maybe skip this day or fail the whole process
                print(f"Skipping day due to parsing error: {str(e)}, data: {day_data_raw}")
                continue # Or raise HTTPException if one bad day should fail all

        # Update status: Saving curriculum
        supabase.table("curricula").update({
            "generation_progress": "Saving curriculum to database..."
        }).eq("id", new_curriculum_id).execute()

        if days_to_insert:
            created_days_response = supabase.table("curriculum_days").insert(days_to_insert).execute()
            if created_days_response.data is None or len(created_days_response.data) != len(days_to_insert):
                # Handle partial insert or error - potentially delete the main curriculum entry for consistency
                supabase.table("curricula").update({
                    "generation_status": "failed",
                    "generation_progress": "Failed to save curriculum days"
                }).eq("id", new_curriculum_id).execute()
                raise HTTPException(status_code=500, detail="Failed to create curriculum days")
        
        # Update status: Completed
        supabase.table("curricula").update({
            "generation_status": "completed",
            "generation_progress": "Curriculum generated successfully!"
        }).eq("id", new_curriculum_id).execute()
        
        # Fetch the created curriculum with its days to return it
        # (Or construct it from created_curriculum_row.data[0] and created_days_response.data)
        # For now, just returning the main curriculum object
        
        # Map database fields back to Pydantic model fields for the response
        response_data = created_curriculum_row.data[0]
        response_data["learning_goal"] = response_data.get("topic") or response_data.get("goal")
        response_data["title"] = curriculum_title
        response_data["description"] = curriculum_description
        response_data["generation_status"] = "completed"
        response_data["generation_progress"] = "Curriculum generated successfully!"
        
        # If topic/goal were stored in metadata, you'd fetch from there
        
        # Ensure all fields required by Curriculum model are present or have defaults
        # For example, if prerequisites, daily_time_commitment_minutes, learning_style are part of Curriculum model
        # and were stored in metadata, fetch them here for the response model if needed.
        metadata_from_db = response_data.get("metadata", {})
        response_data["prerequisites"] = metadata_from_db.get("prerequisites")
        response_data["daily_time_commitment_minutes"] = metadata_from_db.get("daily_time_commitment_minutes")
        response_data["learning_style"] = metadata_from_db.get("learning_style")
        
        return Curriculum(**response_data)

    except HTTPException as e: # Re-raise HTTPExceptions
        raise e
    except Exception as e:
        # Log the full error for debugging
        print(f"Unexpected error creating curriculum: {str(e)}")
        traceback.print_exc()
        
        # Update status to failed
        supabase.table("curricula").update({
            "generation_status": "failed",
            "generation_progress": f"Unexpected error: {str(e)}"
        }).eq("id", new_curriculum_id).execute()
        
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/", response_model=List[Curriculum])
async def list_curricula(current_user: AuthenticatedUser = Depends(get_current_user)):
    """List all curricula for the current user."""
    user_id = current_user.id
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token")

    response = supabase.table("curricula").select("*").eq("user_id", str(user_id)).order("created_at", desc=True).execute()
    
    if response.data:
        processed_curricula = []
        for item in response.data:
            # Map database fields to Pydantic model fields
            item["learning_goal"] = item.get("topic") or item.get("goal")
            
            metadata_from_db = item.get("metadata", {})
            item["prerequisites"] = metadata_from_db.get("prerequisites")
            item["daily_time_commitment_minutes"] = metadata_from_db.get("daily_time_commitment_minutes")
            item["learning_style"] = metadata_from_db.get("learning_style")
            
            try:
                processed_curricula.append(Curriculum(**item))
            except Exception as e:
                print(f"Error validating curriculum data for ID {item.get('id')}: {str(e)}")
                traceback.print_exc()
                # Optionally, skip this item or raise an error if strict validation is required
                # For now, we'll skip problematic items to avoid breaking the whole list
                continue
        return processed_curricula
    return []

# Placeholder for GET /curriculum/{id}
@router.get("/{curriculum_id}", response_model=Curriculum)
async def get_curriculum(
    curriculum_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.id
    response = supabase.table("curricula").select("*").eq("id", curriculum_id).eq("user_id", str(user_id)).maybe_single().execute()
    if response.data:
        # Map database fields to Pydantic model fields
        curriculum_data = response.data
        curriculum_data["learning_goal"] = curriculum_data.get("topic") or curriculum_data.get("goal")
        
        metadata_from_db = curriculum_data.get("metadata", {})
        curriculum_data["prerequisites"] = metadata_from_db.get("prerequisites")
        curriculum_data["daily_time_commitment_minutes"] = metadata_from_db.get("daily_time_commitment_minutes")
        curriculum_data["learning_style"] = metadata_from_db.get("learning_style")
        
        return Curriculum(**curriculum_data)
    raise HTTPException(status_code=404, detail="Curriculum not found")

# New endpoint to mark a day as complete
@router.post("/{curriculum_id}/days/{day_id}/complete", status_code=status.HTTP_201_CREATED, response_model=ProgressRecord)
async def mark_day_complete(
    curriculum_id: UUID,
    day_id: UUID,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id_str = str(current_user.id)
    if not user_id_str:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User ID not found in token")

    s_curriculum_id = str(curriculum_id)
    s_day_id = str(day_id)

    # Validate day belongs to curriculum
    day_check_response = (
        supabase.table("curriculum_days")
        .select("id", count='exact') # Using count='exact' for existence check
        .eq("id", s_day_id)
        .eq("curriculum_id", s_curriculum_id)
        .execute()
    )
    # Check if count is 0 or data is empty (PostgREST v1+ might return count in response)
    # A more robust check for PostgREST v0.x (older Supabase client libs) is just to check if data is empty.
    if not (day_check_response.data and len(day_check_response.data) > 0):
        # If count attribute is available and reliable (depends on Supabase client version & PostgREST version):
        # if hasattr(day_check_response, 'count') and (day_check_response.count is None or day_check_response.count == 0):
        #     raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found in this curriculum (count check)")
        # elif not day_check_response.data: # Fallback for older clients or if count is not definitive
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Day not found in this curriculum (data check)")

    # Check if progress record already exists
    existing_progress_response = (
        supabase.table("progress")
        .select("*")  # Fetch all columns to match ProgressRecord model
        .eq("user_id", user_id_str)
        .eq("curriculum_id", s_curriculum_id)
        .eq("day_id", s_day_id)
        .maybe_single() # Use maybe_single to get one or None
        .execute()
    )

    if existing_progress_response and existing_progress_response.data: # .data will be a dict if row exists, or None if no row with maybe_single()
        print(f"[PROGRESS DEBUG] Day '{s_day_id}' for curriculum '{s_curriculum_id}' already marked complete. Returning existing.")
        return ProgressRecord(**existing_progress_response.data)

    # Create new progress record
    new_progress_id = uuid4()
    progress_data_to_insert = {
        "id": str(new_progress_id),
        "user_id": user_id_str,
        "curriculum_id": s_curriculum_id,
        "day_id": s_day_id,
        "completed_at": datetime.utcnow().isoformat() + "+00:00"
    }

    try:
        print(f"[PROGRESS DEBUG] Inserting new progress record: {progress_data_to_insert}")
        insert_response = (
            supabase.table("progress")
            .insert(progress_data_to_insert)
            .execute()
        )
        
        if insert_response.data and len(insert_response.data) > 0:
            print(f"[PROGRESS DEBUG] Insert successful: {insert_response.data[0]}")
            return ProgressRecord(**insert_response.data[0])
        else:
            error_detail = "Failed to mark day as complete."
            # Error handling for Supabase client v1.x might involve checking insert_response.error
            if hasattr(insert_response, 'error') and insert_response.error:
                 error_msg = getattr(insert_response.error, 'message', str(insert_response.error))
                 error_detail += f" DB Error: {error_msg}"
            # For Supabase client v2.x (postgrest-py v0.11+), errors are usually raised as exceptions
            print(f"[PROGRESS DEBUG] Failed to insert progress. Supabase response was not as expected or contained an error if v1.x client: {insert_response}")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=error_detail)
            
    except HTTPException: 
        raise
    except Exception as e: # Catch other potential errors (e.g., direct exceptions from Supabase client v2+)
        print(f"[PROGRESS DEBUG] Exception marking day complete: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error marking day as complete: {str(e)}")

# We will also need PUT and DELETE later 

# Curriculum Day Management Endpoints

@router.patch("/{curriculum_id}/days/{day_id}")
async def update_day_content(
    curriculum_id: str,
    day_id: str,
    content_update: Dict[str, Any],
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Update the content of a specific curriculum day."""
    user_id = str(current_user.id)
    
    # Verify curriculum ownership
    curriculum_check = supabase.table("curricula").select("id").eq("id", curriculum_id).eq("user_id", user_id).maybe_single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=404, detail="Curriculum not found or access denied")
    
    # Verify day belongs to curriculum
    day_check = supabase.table("curriculum_days").select("id").eq("id", day_id).eq("curriculum_id", curriculum_id).maybe_single().execute()
    if not day_check.data:
        raise HTTPException(status_code=404, detail="Day not found in this curriculum")
    
    # Update the day content
    update_data = {
        "content": content_update.get("content"),
        "title": content_update.get("title"),
        "resources": content_update.get("resources"),
        "updated_at": datetime.utcnow().isoformat()
    }
    # Remove None values
    update_data = {k: v for k, v in update_data.items() if v is not None}
    
    result = supabase.table("curriculum_days").update(update_data).eq("id", day_id).execute()
    
    if result.data:
        return {"message": "Day updated successfully", "data": result.data[0]}
    raise HTTPException(status_code=500, detail="Failed to update day")


@router.put("/{curriculum_id}/days/reorder")
async def reorder_days(
    curriculum_id: str,
    day_order: List[Dict[str, Any]],  # [{"id": "day_id", "day_number": 1}, ...]
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Reorder curriculum days by updating their day_numbers."""
    user_id = str(current_user.id)
    
    # Verify curriculum ownership
    curriculum_check = supabase.table("curricula").select("id").eq("id", curriculum_id).eq("user_id", user_id).maybe_single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=404, detail="Curriculum not found or access denied")
    
    # Phase 1: temporary high numbers to avoid unique constraint collisions
    temp_updates = []
    for i, day_info in enumerate(day_order):
        day_id = day_info.get("id")
        if not day_id:
            continue
        temp_updates.append({"id": day_id, "day_number": 1000 + i})

    for upd in temp_updates:
        supabase.table("curriculum_days").update({"day_number": upd["day_number"]}).eq("id", upd["id"]).execute()

    # Phase 2: set the desired day_numbers
    for day_info in day_order:
        day_id = day_info.get("id")
        new_number = day_info.get("day_number")
        if not day_id or new_number is None:
            continue

        # Fetch current title
        day_data = supabase.table("curriculum_days").select("title").eq("id", day_id).maybe_single().execute()
        update_data = {"day_number": new_number}
        if day_data.data:
            title = day_data.data.get("title", "")
            if title.startswith("Day "):
                colon_idx = title.find(":")
                if colon_idx > 0:
                    update_data["title"] = f"Day {new_number}{title[colon_idx:]}"

        supabase.table("curriculum_days").update(update_data).eq("id", day_id).execute()

    return {"message": "Days reordered successfully"}


@router.post("/{curriculum_id}/days")
async def add_custom_day(
    curriculum_id: str,
    day_data: CurriculumDayCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Add a custom day to a curriculum."""
    user_id = str(current_user.id)
    
    # Verify curriculum ownership
    curriculum_check = supabase.table("curricula").select("id").eq("id", curriculum_id).eq("user_id", user_id).maybe_single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=404, detail="Curriculum not found or access denied")
    
    # Get the current max day_number
    max_day_result = supabase.table("curriculum_days").select("day_number").eq("curriculum_id", curriculum_id).order("day_number", desc=True).limit(1).execute()
    
    next_day_number = 1
    if max_day_result.data and len(max_day_result.data) > 0:
        next_day_number = max_day_result.data[0]["day_number"] + 1
    
    # If day_number not provided, use the next available
    if not hasattr(day_data, 'day_number') or day_data.day_number is None:
        day_data.day_number = next_day_number
    
    # Create the new day
    new_day = {
        **day_data.model_dump(),
        "curriculum_id": curriculum_id,
        "id": str(uuid4())
    }
    
    result = supabase.table("curriculum_days").insert(new_day).execute()
    
    if result.data:
        return CurriculumDay(**result.data[0])
    raise HTTPException(status_code=500, detail="Failed to create day")


@router.delete("/{curriculum_id}/days/{day_id}")
async def delete_day(
    curriculum_id: str,
    day_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Delete a day from a curriculum."""
    user_id = str(current_user.id)
    
    # Verify curriculum ownership
    curriculum_check = supabase.table("curricula").select("id").eq("id", curriculum_id).eq("user_id", user_id).maybe_single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=404, detail="Curriculum not found or access denied")
    
    # Get the day to be deleted
    day_to_delete = supabase.table("curriculum_days").select("day_number").eq("id", day_id).eq("curriculum_id", curriculum_id).maybe_single().execute()
    if not day_to_delete.data:
        raise HTTPException(status_code=404, detail="Day not found")
    
    deleted_day_number = day_to_delete.data["day_number"]
    
    # Delete the day
    supabase.table("curriculum_days").delete().eq("id", day_id).execute()
    
    # Resequence remaining days
    remaining_days = supabase.table("curriculum_days").select("id, day_number, title").eq("curriculum_id", curriculum_id).gt("day_number", deleted_day_number).order("day_number").execute()
    
    if remaining_days.data:
        for day in remaining_days.data:
            new_number = day["day_number"] - 1
            update_data = {"day_number": new_number}
            
            # Update title if it follows "Day X: ..." pattern
            title = day.get("title", "")
            if title.startswith("Day "):
                colon_idx = title.find(":")
                if colon_idx > 0:
                    new_title = f"Day {new_number}{title[colon_idx:]}"
                    update_data["title"] = new_title
            
            supabase.table("curriculum_days").update(update_data).eq("id", day["id"]).execute()
    
    return {"message": "Day deleted successfully"}


@router.post("/{curriculum_id}/days/{day_id}/regenerate")
async def regenerate_day(
    curriculum_id: str,
    day_id: str,
    regenerate_request: Dict[str, str],
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Regenerate a specific day with improvements."""
    user_id = str(current_user.id)
    improvement_prompt = regenerate_request.get("improvement_prompt", "")
    
    # Verify curriculum ownership
    curriculum_check = supabase.table("curricula").select("*").eq("id", curriculum_id).eq("user_id", user_id).maybe_single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=404, detail="Curriculum not found or access denied")
    
    # Get the current day content
    current_day = supabase.table("curriculum_days").select("*").eq("id", day_id).eq("curriculum_id", curriculum_id).maybe_single().execute()
    if not current_day.data:
        raise HTTPException(status_code=404, detail="Day not found")
    
    # Prepare context for the agent
    agent_messages = [
        {
            "role": "user",
            "content": f"""
            Please regenerate this curriculum day with the following improvements: {improvement_prompt}
            
            Current day content:
            Title: {current_day.data.get('title')}
            Content: {json.dumps(current_day.data.get('content'))}
            
            Curriculum context:
            Topic: {curriculum_check.data.get('topic')}
            Goal: {curriculum_check.data.get('goal')}
            Difficulty: {curriculum_check.data.get('difficulty_level')}
            
            Keep the same structure and format as the original, but improve based on the user's feedback.
            The output should be a JSON object with 'title', 'content' (TipTap/ProseMirror format), and 'resources'.
            """
        }
    ]
    
    try:
        # Call the agent to regenerate with proper context
        raw_response = await curriculum_agent.run(
            messages=agent_messages, 
            context={"intent": "regenerate_day"}  # Make sure to pass intent in context
        )
        
        print(f"[REGENERATE DEBUG] Raw agent response: {raw_response[:500]}...")
        
        # Parse the response
        regenerated_data = json.loads(raw_response)
        
        # Update the day
        update_data = {
            "title": regenerated_data.get("title", current_day.data.get("title")),
            "content": regenerated_data.get("content", current_day.data.get("content")),
            "resources": regenerated_data.get("resources", current_day.data.get("resources")),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("curriculum_days").update(update_data).eq("id", day_id).execute()
        
        if result.data:
            return {"message": "Day regenerated successfully", "data": result.data[0]}
        raise HTTPException(status_code=500, detail="Failed to update regenerated day")
        
    except json.JSONDecodeError as e:
        print(f"[REGENERATE ERROR] JSON decode error: {str(e)}")
        print(f"[REGENERATE ERROR] Raw response that failed: {raw_response}")
        raise HTTPException(status_code=500, detail=f"Failed to parse regenerated content: {str(e)}")
    except Exception as e:
        print(f"[REGENERATE ERROR] Unexpected error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to regenerate day: {str(e)}") 