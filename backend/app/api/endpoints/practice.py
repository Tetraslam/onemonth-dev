import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.agents.curriculum_agent import CurriculumAgent
from app.api.dependencies import require_subscription
from app.core.auth import get_current_user
from app.core.config import settings
from app.db.supabase_client import get_supabase_client
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter()

class GeneratePracticeRequest(BaseModel):
    curriculum_id: UUID
    day_id: UUID
    day_title: str
    day_content: str
    learning_goal: str
    difficulty_level: str
    num_problems: int = 3

class PracticeProblem(BaseModel):
    question: str
    type: str  # "multiple_choice", "short_answer", "code", "explanation"
    choices: Optional[List[str]] = None  # For multiple choice
    answer: str
    explanation: str
    concept: str  # The concept being tested
    difficulty: str  # "easy", "medium", "hard"

class GeneratePracticeResponse(BaseModel):
    session_id: UUID
    problems: List[PracticeProblem]

class SubmitResponseRequest(BaseModel):
    session_id: UUID
    responses: List[Dict[str, Any]]  # User's answers
    time_spent_seconds: Optional[int] = None

class SubmitResponseResponse(BaseModel):
    score: int
    total: int
    feedback: List[Dict[str, Any]]  # Per-problem feedback
    concepts_mastered: List[str]
    concepts_to_review: List[str]

@router.post("/generate", response_model=GeneratePracticeResponse)
async def generate_practice_problems(
    request: GeneratePracticeRequest,
    current_user: AuthenticatedUser = Depends(require_subscription)
):
    """Generate practice problems for a specific curriculum day"""
    supabase = get_supabase_client()
    
    # Verify user has access to this curriculum
    curriculum_check = supabase.table("curricula").select("id").eq("id", str(request.curriculum_id)).eq("user_id", str(current_user.id)).single().execute()
    if not curriculum_check.data:
        raise HTTPException(status_code=403, detail="You don't have access to this curriculum")
    
    # Create agent and generate problems
    agent = CurriculumAgent()
    
    try:
        # Use the agent to generate practice problems
        problems_data = await agent.generate_practice_problems(
            day_title=request.day_title,
            day_content=request.day_content,
            learning_goal=request.learning_goal,
            difficulty_level=request.difficulty_level,
            num_problems=request.num_problems
        )
        
        # Create practice session
        session_data = {
            "user_id": str(current_user.id),
            "curriculum_id": str(request.curriculum_id),
            "day_id": str(request.day_id),
            "problems": problems_data["problems"],
            "responses": []
        }
        
        session_result = supabase.table("practice_sessions").insert(session_data).execute()
        session = session_result.data[0]
        
        # Convert to response format
        problems = [PracticeProblem(**p) for p in problems_data["problems"]]
        
        return GeneratePracticeResponse(
            session_id=session["id"],
            problems=problems
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate practice problems: {str(e)}")

@router.post("/submit", response_model=SubmitResponseResponse)
async def submit_practice_responses(
    request: SubmitResponseRequest,
    current_user: AuthenticatedUser = Depends(require_subscription)
):
    """Submit responses to practice problems and get feedback"""
    supabase = get_supabase_client()
    
    # Get the practice session
    session_result = supabase.table("practice_sessions").select("*").eq("id", str(request.session_id)).eq("user_id", str(current_user.id)).single().execute()
    if not session_result.data:
        raise HTTPException(status_code=404, detail="Practice session not found")
    
    session = session_result.data
    problems = session["problems"]
    
    # Calculate score and generate feedback
    score = 0
    feedback = []
    concepts_correct = []
    concepts_incorrect = []
    
    for i, (problem, response) in enumerate(zip(problems, request.responses)):
        is_correct = False
        user_answer = response.get("answer", "")
        
        # Check answer based on problem type
        if problem["type"] == "multiple_choice":
            is_correct = user_answer.lower() == problem["answer"].lower()
        elif problem["type"] == "code":
            # For code problems, we might want more sophisticated checking
            # For now, simple string comparison
            is_correct = user_answer.strip() == problem["answer"].strip()
        else:
            # For short answer and explanation, check if key terms are present
            # This is a simplified check - in production you might use LLM for evaluation
            answer_lower = user_answer.lower()
            expected_lower = problem["answer"].lower()
            is_correct = expected_lower in answer_lower or answer_lower in expected_lower
        
        if is_correct:
            score += 1
            concepts_correct.append(problem["concept"])
        else:
            concepts_incorrect.append(problem["concept"])
        
        feedback.append({
            "problem_index": i,
            "correct": is_correct,
            "user_answer": user_answer,
            "correct_answer": problem["answer"],
            "explanation": problem["explanation"]
        })
    
    # Update session with responses and score
    update_data = {
        "responses": request.responses,
        "score": score,
        "completed_at": datetime.now(timezone.utc).isoformat()
    }
    
    supabase.table("practice_sessions").update(update_data).eq("id", str(request.session_id)).execute()
    
    # Update practice history for concept mastery tracking
    for concept in set(concepts_correct):
        # Check if user has history for this concept
        history_check = supabase.table("practice_history").select("*").eq("user_id", str(current_user.id)).eq("concept", concept).execute()
        
        if history_check.data:
            # Update existing mastery level (increment by 1, max 10)
            current_level = history_check.data[0]["mastery_level"]
            new_level = min(current_level + 1, 10)
            supabase.table("practice_history").update({"mastery_level": new_level}).eq("id", history_check.data[0]["id"]).execute()
        else:
            # Create new history entry
            history_data = {
                "user_id": str(current_user.id),
                "session_id": str(request.session_id),
                "concept": concept,
                "mastery_level": 1
            }
            supabase.table("practice_history").insert(history_data).execute()
    
    # Decrease mastery for incorrect concepts
    for concept in set(concepts_incorrect):
        history_check = supabase.table("practice_history").select("*").eq("user_id", str(current_user.id)).eq("concept", concept).execute()
        
        if history_check.data:
            current_level = history_check.data[0]["mastery_level"]
            new_level = max(current_level - 1, 0)
            supabase.table("practice_history").update({"mastery_level": new_level}).eq("id", history_check.data[0]["id"]).execute()
    
    return SubmitResponseResponse(
        score=score,
        total=len(problems),
        feedback=feedback,
        concepts_mastered=list(set(concepts_correct)),
        concepts_to_review=list(set(concepts_incorrect))
    )

@router.get("/history/{curriculum_id}")
async def get_practice_history(
    curriculum_id: UUID,
    current_user: AuthenticatedUser = Depends(require_subscription)
):
    """Get practice history for a curriculum"""
    supabase = get_supabase_client()
    
    # Get all practice sessions for this curriculum
    sessions_result = supabase.table("practice_sessions").select("*").eq("user_id", str(current_user.id)).eq("curriculum_id", str(curriculum_id)).order("created_at", desc=True).execute()
    
    # Get concept mastery levels
    mastery_result = supabase.table("practice_history").select("*").eq("user_id", str(current_user.id)).execute()
    
    mastery_map = {item["concept"]: item["mastery_level"] for item in mastery_result.data}
    
    return {
        "sessions": sessions_result.data,
        "concept_mastery": mastery_map
    } 