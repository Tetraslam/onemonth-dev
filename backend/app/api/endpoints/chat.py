"""Chat endpoints."""

import json
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.agents.curriculum_agent import CurriculumAgent
from app.core.auth import get_current_user
from app.db.supabase_client import get_supabase
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update

router = APIRouter()

# Initialize the curriculum agent
agent = CurriculumAgent()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    curriculum_id: Optional[str] = None
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    message: str
    session_id: str


@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase=Depends(get_supabase)
) -> ChatResponse:
    """Process a chat message and return the AI response."""
    
    # Get or create session
    session_id = request.session_id or str(uuid4())
    
    # Get curriculum context if provided
    context = {}
    if request.curriculum_id:
        curriculum_response = supabase.table("curricula").select("*").eq("id", request.curriculum_id).eq("user_id", current_user['id']).single().execute()
        if curriculum_response.data:
            context["curriculum"] = curriculum_response.data
            
            # Get user preferences
            profile_response = supabase.table("profiles").select("*").eq("id", current_user['id']).single().execute()
            if profile_response.data:
                context["user_preferences"] = profile_response.data
    
    # Convert messages to the format expected by the agent
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Process with the agent
    response = await agent.run(messages, context)
    
    # Store chat session
    supabase.table("chat_sessions").upsert({
        "id": session_id,
        "user_id": current_user['id'],
        "curriculum_id": request.curriculum_id,
        "messages": messages + [{"role": "assistant", "content": response}],
        "updated_at": "now()"
    }).execute()
    
    return ChatResponse(message=response, session_id=session_id)


async def generate_stream(messages: List[dict], context: dict):
    """Generate streaming response for Vercel AI SDK."""
    # Run the agent
    response = await agent.run(messages, context)
    
    # Stream the response in chunks for better UX
    words = response.split()
    current_chunk = ""
    
    for i, word in enumerate(words):
        current_chunk += word + " "
        
        # Send chunk every 5 words or at the end
        if (i + 1) % 5 == 0 or i == len(words) - 1:
            yield f"0:{json.dumps({'content': current_chunk})}\n"
            current_chunk = ""


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Process a chat message and return streaming AI response for Vercel AI SDK."""
    
    # Get curriculum context if provided
    context = {}
    if request.curriculum_id:
        curriculum_response = supabase.table("curricula").select("*").eq("id", request.curriculum_id).eq("user_id", current_user['id']).single().execute()
        if curriculum_response.data:
            context["curriculum"] = curriculum_response.data
            
            # Get user preferences
            profile_response = supabase.table("profiles").select("*").eq("id", current_user['id']).single().execute()
            if profile_response.data:
                context["user_preferences"] = profile_response.data
    
    # Convert messages to the format expected by the agent
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    return StreamingResponse(
        generate_stream(messages, context),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.get("/sessions")
async def get_chat_sessions(
    curriculum_id: str | None = None,
    current_user: Dict[str, Any] = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Get chat sessions for the current user."""
    try:
        query = supabase.table('chat_sessions').select('*').eq('user_id', current_user['id'])
        
        if curriculum_id:
            query = query.eq('curriculum_id', curriculum_id)
            
        response = query.order('created_at', desc=True).execute()
        
        return {"sessions": response.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 