"""Chat endpoints."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4

from app.agents.curriculum_agent import curriculum_agent as agent
from app.core.auth import get_current_user
from app.db.supabase_client import get_supabase
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select, update

router = APIRouter()

# Initialize the curriculum agent
# agent = CurriculumAgent()


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


class AppendChatTurnRequest(BaseModel):
    curriculum_id: Optional[str] = None
    user_message: ChatMessage
    assistant_message: ChatMessage


class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessage]


@router.post("/")
async def chat(
    request: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase=Depends(get_supabase)
) -> ChatResponse:
    """Process a chat message and return the AI response."""
    
    # Get or create session
    session_id = request.session_id or str(uuid4())
    
    # Get curriculum context if provided
    context: Dict[str, Any] = {}
    context["user_preferences"] = {} # Initialize with default
    if request.curriculum_id:
        curriculum_response = supabase.table("curricula").select("*").eq("id", request.curriculum_id).eq("user_id", current_user.id).maybe_single().execute()
        if curriculum_response and curriculum_response.data: # Check if curriculum_response itself is not None
            context["curriculum"] = curriculum_response.data
            
    # Fetch user profile more safely
    profile_response = supabase.table("profiles").select("*").eq("id", current_user.id).maybe_single().execute()
    if profile_response and profile_response.data: # Check if profile_response itself is not None
        context["user_preferences"] = profile_response.data
    else:
        print(f"[CHAT DEBUG] No profile found for user {current_user.id}. Proceeding with default/empty preferences.")
    
    # Convert messages to the format expected by the agent
    messages_for_agent = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # Process with the agent
    agent_response_content = await agent.run(messages=messages_for_agent, context=context)
    
    # Store chat session
    try:
        supabase.table("chat_sessions").upsert({
            "id": session_id,
            "user_id": current_user.id,
            "curriculum_id": request.curriculum_id,
            "messages": messages_for_agent + [{"role": "assistant", "content": agent_response_content}],
            "updated_at": "now()"
        }).execute()
    except Exception as e_upsert:
        print(f"[CHAT DEBUG] Error upserting chat session: {str(e_upsert)}")
        # Decide if this error should be fatal to the chat response or just logged
    
    return ChatResponse(message=agent_response_content, session_id=session_id)


async def format_llm_stream_for_sdk(agent_stream: AsyncIterator[str]) -> AsyncIterator[str]:
    """Generate streaming response for Vercel AI SDK."""
    async for text_chunk in agent_stream:
        # Vercel AI SDK text stream format: 0:"chunk of text"\n
        # Ensure the chunk is a string and properly escaped for JSON string conten
        # json.dumps will handle escaping quotes and special characters within the text_chunk itself.
        yield f"0:{json.dumps(text_chunk)}\n"


@router.post("/stream")
async def chat_stream(
    request: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Process a chat message and return streaming AI response for Vercel AI SDK."""
    
    # Get curriculum context if provided
    context: Dict[str, Any] = {}
    context["user_preferences"] = {} # Initialize with default
    if request.curriculum_id:
        curriculum_response = supabase.table("curricula").select("*").eq("id", request.curriculum_id).eq("user_id", current_user.id).maybe_single().execute()
        if curriculum_response and curriculum_response.data: # Check if curriculum_response itself is not None
            context["curriculum"] = curriculum_response.data
            
    # Fetch user profile more safely
    profile_response = supabase.table("profiles").select("*").eq("id", current_user.id).maybe_single().execute()
    if profile_response and profile_response.data: # Check if profile_response itself is not None
        context["user_preferences"] = profile_response.data
    else:
        print(f"[CHAT STREAM DEBUG] No profile found for user {current_user.id}. Proceeding with default/empty preferences.")
    
    # Convert messages to the format expected by the agent
    messages_for_agent = [{"role": msg.role, "content": msg.content} for msg in request.messages]
    
    # 1. Analyze context, plan, and execute tools (if any) - this is a non-streaming part
    try:
        print(f"[CHAT STREAM DEBUG] Calling agent.analyze_and_plan_for_chat for user: {current_user.id}")
        analysis_result = await agent.analyze_and_plan_for_chat(
            current_chat_messages=messages_for_agent, 
            base_context=context
        )
        print(f"[CHAT STREAM DEBUG] Analysis result: intent='{analysis_result['intent']}', tools_output_items={len(analysis_result['tools_output'])}")
    except Exception as e_analysis:
        print(f"[CHAT STREAM DEBUG] Error during agent analysis/planning: {str(e_analysis)}")
        # Fallback to a simple error message stream if analysis fails
        async def error_stream():
            yield f"0:{json.dumps('Sorry, I had trouble understanding that. Please try again.')}\n"
        return StreamingResponse(error_stream(), media_type="text/event-stream")

    # 2. Get the actual LLM stream using the prepared context
    llm_stream_generator = agent.stream_chat_response(
        intent=analysis_result["intent"],
        focused_user_query=analysis_result["focused_user_query"],
        tools_output=analysis_result["tools_output"],
        full_chat_history_for_llm=analysis_result["full_chat_history_for_llm"]
    )
    
    # TODO: Implement chat history saving for streamed responses.
    # This will be handled by the client calling a new /api/chat/append_turn endpoint
    # via the onFinish callback of the useChat hook.

    return StreamingResponse(
        format_llm_stream_for_sdk(llm_stream_generator),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no", # Often helpful for Nginx and other reverse proxies
            "Content-Encoding": "none",
        }
    )

@router.get("/sessions")
async def get_chat_sessions(
    curriculum_id: str | None = None,
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Get chat sessions for the current user."""
    try:
        query = supabase.table('chat_sessions').select('*').eq('user_id', current_user.id)
        
        if curriculum_id:
            query = query.eq('curriculum_id', curriculum_id)
            
        response = query.order('created_at', desc=True).execute()
        
        return {"sessions": response.data}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/append_turn")
async def append_chat_turn(
    request: AppendChatTurnRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Appends a user message and an assistant message to a chat session."""
    user_id = current_user.id
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token")

    session_query = supabase.table("chat_sessions").select("*").eq("user_id", user_id)
    if request.curriculum_id:
        session_query = session_query.eq("curriculum_id", request.curriculum_id)
    else:
        # Handle sessions not tied to a specific curriculum, e.g., by checking for curriculum_id IS NULL
        # For now, if curriculum_id is None in request, we assume it means we are looking for a session
        # where curriculum_id is also NULL in the database.
        session_query = session_query.is_("curriculum_id", None) 

    existing_session_response = session_query.maybe_single().execute()

    new_messages_to_append = [
        request.user_message.model_dump(),
        request.assistant_message.model_dump()
    ]

    if existing_session_response and existing_session_response.data:
        session_id = existing_session_response.data["id"]
        current_messages = existing_session_response.data.get("messages", [])
        if not isinstance(current_messages, list): # Ensure current_messages is a list
            current_messages = []
        
        updated_messages = current_messages + new_messages_to_append
        
        try:
            update_response = supabase.table("chat_sessions").update({
                "messages": updated_messages,
                "updated_at": "now()"
            }).eq("id", session_id).execute()
            if not update_response.data: # Or check for errors if client lib provides
                print(f"[CHAT APPEND DEBUG] Failed to update chat session {session_id}. Response: {update_response}")
                raise HTTPException(status_code=500, detail="Failed to update chat session messages.")
            print(f"[CHAT APPEND DEBUG] Appended to session {session_id}")
            return {"session_id": session_id, "status": "appended"}
        except Exception as e_update:
            print(f"[CHAT APPEND DEBUG] Error updating chat session {session_id}: {str(e_update)}")
            raise HTTPException(status_code=500, detail=f"Error updating chat session: {str(e_update)}")
    else:
        # Create new session
        session_id = str(uuid4())
        try:
            insert_response = supabase.table("chat_sessions").insert({
                "id": session_id,
                "user_id": user_id,
                "curriculum_id": request.curriculum_id, # This will be None if not provided in request
                "messages": new_messages_to_append,
                # created_at and updated_at should have defaults in DB or be set to now()
            }).execute() # Assuming DB defaults for created_at, updated_at or set them explicitly
            
            if not insert_response.data: # Or check for errors
                print(f"[CHAT APPEND DEBUG] Failed to create new chat session. Response: {insert_response}")
                raise HTTPException(status_code=500, detail="Failed to create new chat session.")
            print(f"[CHAT APPEND DEBUG] Created new session {session_id}")
            return {"session_id": session_id, "status": "created"}
        except Exception as e_insert:
            print(f"[CHAT APPEND DEBUG] Error creating new chat session: {str(e_insert)}")
            raise HTTPException(status_code=500, detail=f"Error creating new chat session: {str(e_insert)}")


@router.get("/history/{curriculum_id}", response_model=ChatHistoryResponse)
async def get_chat_history_for_curriculum(
    curriculum_id: str, # Assuming curriculum_id will always be provided for specific history
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase=Depends(get_supabase)
):
    """Gets the chat message history for a given curriculum and the current user."""
    user_id = current_user.id
    if not user_id:
        raise HTTPException(status_code=403, detail="User ID not found in token")

    if not curriculum_id: # Should not happen if path param is mandatory
        raise HTTPException(status_code=400, detail="Curriculum ID is required.")

    session_response = (
        supabase.table("chat_sessions")
        .select("messages")
        .eq("user_id", user_id)
        .eq("curriculum_id", curriculum_id)
        .maybe_single() # Assuming one session per user/curriculum for simplicity
        .execute()
    )

    if session_response and session_response.data and session_response.data.get("messages"):
        messages_data = session_response.data["messages"]
        # Ensure messages_data is a list before trying to instantiate ChatMessage
        if not isinstance(messages_data, list):
            messages_data = [] # Default to empty list if it's not a list (e.g. null from DB)
            
        # Validate that each item in messages_data can be parsed into ChatMessage
        # This is implicitly handled by Pydantic during response_model validation if types match
        # For direct construction:
        # valid_messages = []
        # for msg_data in messages_data:
        #     try:
        #         valid_messages.append(ChatMessage(**msg_data))
        #     except ValidationError:
        #         print(f"Skipping invalid message data: {msg_data}")
        # return ChatHistoryResponse(messages=valid_messages)
        return ChatHistoryResponse(messages=[ChatMessage(**msg) for msg in messages_data if isinstance(msg, dict)])
    
    return ChatHistoryResponse(messages=[]) # Return empty list if no session or no messages 