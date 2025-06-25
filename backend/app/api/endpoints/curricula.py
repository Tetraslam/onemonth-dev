import json
import traceback
from datetime import datetime
from typing import Any, Dict, List
from uuid import UUID, uuid4

from app.agents.curriculum_agent import curriculum_agent
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
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """Create a new curriculum for the current user."""
    user_id = current_user.id
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token")

    # Prepare initial messages for the agent based on curriculum_data
    # This needs to be a rich prompt that tells the agent what to do.
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
            
            The output should be a JSON object with a main 'curriculum_title' and 'curriculum_description', 
            and a list of 'days'. Each day object in the list should have:
            - 'day_number' (int)
            - 'title' (str, concise title for the day)
            - 'content' (dict, rich text content for the learning module, e.g., {{"type": "paragraph", "children": [{{"text": "..."}}]}})
            - 'resources' (list of dicts, each with 'title' and 'url')
            - 'estimated_hours' (float, optional)
            
            Focus on creating practical, actionable content for each day.
            Ensure the curriculum spans the specified number of days.
            Provide diverse resources (articles, videos, interactive exercises if possible).
            """
        }
    ]
    
    # Agent context can pass along the structured preferences if needed by agent logic
    agent_context = curriculum_data.model_dump()

    try:
        # Call the agent to generate the curriculum structure and content
        # The agent's response needs to be parsed into a list of CurriculumDayCreate objects
        # and overall curriculum title/description.
        # This part is highly dependent on how curriculum_agent.run() is implemented
        # and what it returns. For now, assuming it returns a string that needs parsing.
        
        print(f"Calling agent with messages: {agent_messages[:100]}...")  # Log first 100 chars
        raw_agent_response = await curriculum_agent.run(messages=agent_messages, context=agent_context)
        print(f"Agent response length: {len(raw_agent_response) if raw_agent_response else 0}")
        print(f"Agent response preview: {raw_agent_response[:500] if raw_agent_response else 'None'}...")
        
        # --- Placeholder for parsing agent response --- 
        # This is CRITICAL and needs to be robust.
        # Assuming agent returns a JSON string as described in the prompt.
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
            
            # Try to fix common JSON mistakes from LLMs
            # Fix "key":="value" to "key": "value"
            json_str = re.sub(r'(".*?"):\s*=\s*(".*?")', r'\1: \2', json_str)
            
            # Fix "key":='value' to "key": "value"
            json_str = re.sub(r'(".*?"):\s*=\s*(\'.*?\')', lambda m: f'{m.group(1)}: "{m.group(2)[1:-1]}"', json_str)
            
            # Fix "key":a"value" to "key": "value" (missing space and colon)
            json_str = re.sub(r'(".*?"):([a-zA-Z]+)(".*?")', r'\1: \3', json_str)
            
            # Fix "key":"value"} to "key": "value"} (missing space after colon)
            json_str = re.sub(r'(".*?"):(".*?")', r'\1: \2', json_str)
            
            # Remove trailing commas before } or ]
            json_str = re.sub(r',\s*([}\]])', r'\1', json_str)
            
            # Fix double commas
            json_str = re.sub(r',\s*,', ',', json_str)
            
            # Try to parse the cleaned JSON
            try:
                generated_curriculum = json.loads(json_str)
            except json.JSONDecodeError as e:
                # If it still fails, try to find and log the specific error location
                error_line = json_str.split('\n')[e.lineno - 1] if e.lineno else "Unknown"
                print(f"JSON error at line {e.lineno}, col {e.colno}: {error_line}")
                print(f"Error context: {json_str[max(0, e.pos-100):e.pos+100] if e.pos else 'Unknown'}")
                raise
                
            curriculum_title = generated_curriculum.get("curriculum_title", curriculum_data.title or f"Learning {curriculum_data.learning_goal}")
            curriculum_description = generated_curriculum.get("curriculum_description", curriculum_data.description or curriculum_data.learning_goal)
            generated_days_data = generated_curriculum.get("days", [])
            
            print(f"Parsed curriculum with {len(generated_days_data)} days")
            
            if not isinstance(generated_days_data, list):
                raise ValueError("Agent did not return a list of days.")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"JSON parsing error: {str(e)}")
            print(f"Raw response that failed to parse: {raw_agent_response[:1000]}...")
            
            # As a last resort, try to fix the specific error we saw
            if '"type":=' in raw_agent_response:
                print("Detected 'type':= error, attempting to fix...")
                fixed_response = raw_agent_response.replace('"type":=', '"type":')
                try:
                    json_match = re.search(r'\{.*\}', fixed_response, re.DOTALL)
                    if json_match:
                        generated_curriculum = json.loads(json_match.group(0))
                        curriculum_title = generated_curriculum.get("curriculum_title", curriculum_data.title or f"Learning {curriculum_data.learning_goal}")
                        curriculum_description = generated_curriculum.get("curriculum_description", curriculum_data.description or curriculum_data.learning_goal)
                        generated_days_data = generated_curriculum.get("days", [])
                        print(f"Successfully fixed and parsed curriculum with {len(generated_days_data)} days")
                    else:
                        raise ValueError("Could not extract JSON after fix")
                except Exception as fix_error:
                    print(f"Fix attempt failed: {str(fix_error)}")
                    raise HTTPException(status_code=500, detail=f"Failed to parse agent response even after attempting fixes: {str(e)}. Original error at position {getattr(e, 'pos', 'unknown')}")
            else:
                raise HTTPException(status_code=500, detail=f"Failed to parse agent response: {str(e)}. Response preview: {raw_agent_response[:200] if raw_agent_response else 'None'}")
        # --- End placeholder ---

        # 1. Create the Curriculum entry in Supabase
        db_curriculum_data = curriculum_data.model_dump()
        
        # Map our model fields to database fields
        db_curriculum_data["title"] = curriculum_title # Use title from agent if provided, else fallback
        db_curriculum_data["description"] = curriculum_description # Use desc from agent
        db_curriculum_data["user_id"] = user_id
        db_curriculum_data["id"] = str(uuid4()) # Generate UUID for the new curriculum - convert to string!
        
        # Map learning_goal to topic and goal (database schema)
        db_curriculum_data["topic"] = curriculum_data.learning_goal
        db_curriculum_data["goal"] = curriculum_data.learning_goal
        
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

        # 2. Create CurriculumDay entries for each day generated by the agent
        days_to_insert = []
        for day_data_raw in generated_days_data:
            # Validate and create CurriculumDayCreate objects
            # The agent MUST provide data in the format CurriculumDayCreate expects
            try:
                day_create_obj = CurriculumDayCreate(**day_data_raw)
                days_to_insert.append({
                    **day_create_obj.model_dump(),
                    "curriculum_id": new_curriculum_id,
                    "id": str(uuid4())  # Convert to string!
                })
            except Exception as e: # Catch Pydantic validation errors or others
                # Log this error, maybe skip this day or fail the whole process
                print(f"Skipping day due to parsing error: {str(e)}, data: {day_data_raw}")
                continue # Or raise HTTPException if one bad day should fail all

        if days_to_insert:
            created_days_response = supabase.table("curriculum_days").insert(days_to_insert).execute()
            if created_days_response.data is None or len(created_days_response.data) != len(days_to_insert):
                # Handle partial insert or error - potentially delete the main curriculum entry for consistency
                supabase.table("curricula").delete().eq("id", new_curriculum_id).execute()
                raise HTTPException(status_code=500, detail="Failed to create curriculum days")
        
        # Fetch the created curriculum with its days to return it
        # (Or construct it from created_curriculum_row.data[0] and created_days_response.data)
        # For now, just returning the main curriculum object
        
        # Map database fields back to Pydantic model fields for the response
        response_data = created_curriculum_row.data[0]
        response_data["learning_goal"] = response_data.get("topic") or response_data.get("goal")
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
        return response.data
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