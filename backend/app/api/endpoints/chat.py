"""Chat endpoints."""

import json
from typing import Any, AsyncIterator, Dict, List, Optional
from uuid import uuid4

from app.agents.curriculum_agent import curriculum_agent as agent
from app.core.auth import get_current_user
from app.core.config import settings  # To get GEMINI_API_KEY
from app.db.supabase_client import get_supabase
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import (ChatPromptTemplate, HumanMessagePromptTemplate,
                               MessagesPlaceholder,
                               SystemMessagePromptTemplate)
from langchain_core.messages import AIMessage  # Updated import path
from langchain_core.messages import HumanMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough  # For passing memory
# LangChain imports
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel
from sqlalchemy import select, update
from langchain.agents import AgentExecutor, create_tool_calling_agent
from app.tools.our_langchain_tools import (
    exa_search_lc_tool,
    perplexity_search_lc_tool,
    firecrawl_scrape_url_lc_tool
)
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder, SystemMessagePromptTemplate, HumanMessagePromptTemplate
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage # Ensure ToolMessage is imported
from langchain.memory import ConversationBufferWindowMemory # Already there
from langchain_google_genai import ChatGoogleGenerativeAI # Already there
from app.core.config import settings # Already there
import asyncio # Already there

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


# New request model for LangChain stream if different from ChatRequest
class LangChainChatRequest(BaseModel):
    messages: List[ChatMessage] # Expect the full messages array from useChat
    curriculum_id: Optional[str] = None
    # Add other context fields that might be sent by useChat's body
    current_day_title: Optional[str] = None
    current_day_number: Optional[int] = None
    curriculum_title: Optional[str] = None
    learning_goal: Optional[str] = None
    difficulty_level: Optional[str] = None


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
                "updated_at": "now()",
                "user_id": str(user_id)
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
                "user_id": str(user_id),
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

async def vercel_ai_sdk_hello_stream_generator_data():
    import asyncio
    import json
    await asyncio.sleep(0.05)
    text = "Hello from Python backend via Vercel AI SDK data stream!"
    # send as one chunk
    yield f'0:{json.dumps(text)}\n'
    # finish part
    yield f'd:{json.dumps({"finishReason":"stop"})}\n'

@router.post("/vercel_ai_sdk")
async def chat_vercel_ai_sdk_endpoint(
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    headers = {"x-vercel-ai-data-stream": "v1"}
    return StreamingResponse(vercel_ai_sdk_hello_stream_generator_data(), media_type="text/plain", headers=headers) 

async def langchain_chat_stream_generator(
    user_id: str, 
    curriculum_id: Optional[str],
    full_messages_history_for_llm: List[Dict[str,str]], 
    current_user_input: str, 
    supabase_client,
    context_data: Dict[str, Any]
):
    if not settings.gemini_api_key:
        print("ERROR: GEMINI_API_KEY not set for LangChain agent!")
        yield f'0:{json.dumps("AI service not configured.")}\n'
        yield f'd:{json.dumps({"finishReason": "error"})}\n'
        return

    # 1. Initialize LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-pro", # Ensure this is your desired Gemini model for tool calling
        google_api_key=settings.gemini_api_key,
        model_kwargs={"generation_config": {"max_output_tokens": 500000, "temperature": 0.7}},
        # The `tools` themselves will be bound via the agent creation process typically,
        # or directly if not using a standard agent creator, but create_tool_calling_agent handles it.
    )

    # 2. Define Tools
    tools = [exa_search_lc_tool, perplexity_search_lc_tool, firecrawl_scrape_url_lc_tool]

    # 3. Construct Agent Prompt
    # System prompt now also subtly hints at tool capabilities by mentioning external info
    # The specific tool instructions are usually best left to the agent framework
    # based on the tool descriptions provided when defining the tools.
    
    # --- Context Augmentation (as before) ---
    lesson_content_for_prompt = ""
    if curriculum_id and context_data.get("current_day_number") is not None:
        try:
            print(f"[LC AGENT CONTEXT] Fetching lesson content for curriculum {curriculum_id}, day {context_data.get('current_day_number')}")
            day_response = (
                supabase_client.table("curriculum_days")
                .select("content, title")
                .eq("curriculum_id", curriculum_id)
                .eq("day_number", context_data.get("current_day_number"))
                .maybe_single()
                .execute()
            )
            if day_response.data:
                raw_lesson_content = day_response.data.get("content")
                if raw_lesson_content:
                    if isinstance(raw_lesson_content, dict) and raw_lesson_content.get('type') == 'doc' and isinstance(raw_lesson_content.get('content'), list):
                        texts_for_lesson = [] 
                        def extract_text_from_tiptap_nodes(nodes_list_recursive):
                            for node_item in nodes_list_recursive:
                                if node_item.get('type') == 'text' and 'text' in node_item:
                                    texts_for_lesson.append(node_item['text'])
                                if isinstance(node_item.get('content'), list):
                                    extract_text_from_tiptap_nodes(node_item['content'])
                        extract_text_from_tiptap_nodes(raw_lesson_content['content'])
                        lesson_content_for_prompt = " ".join(texts_for_lesson).strip()
                        if not lesson_content_for_prompt: 
                            lesson_content_for_prompt = json.dumps(raw_lesson_content) 
                    elif isinstance(raw_lesson_content, str):
                        lesson_content_for_prompt = raw_lesson_content
                    else: 
                        lesson_content_for_prompt = json.dumps(raw_lesson_content)
                    max_lesson_chars = 100000 
                    if len(lesson_content_for_prompt) > max_lesson_chars:
                        lesson_content_for_prompt = lesson_content_for_prompt[:max_lesson_chars] + "... (truncated)"
            # ... (logging for context fetching) ...
        except Exception as e_context_agent:
            print(f"[LC AGENT CONTEXT] Error fetching/processing lesson: {str(e_context_agent)}")
    # --- END CONTEXT AUGMENTATION ---

    system_prompt_text = (
        "You are a helpful and friendly AI learning assistant for onemonth.dev. "
        "Your primary goal is to help the user understand their curriculum content better, answer their questions, "
        "and provide explanations or examples. Be conversational and encouraging. "
        "If a question requires information beyond the provided lesson content or general knowledge (e.g., current events, very specific external facts, or content from a URL), "
        "use your available tools like web search (Exa, Perplexity) or webpage scraping (Firecrawl) to find the answer. "
        "Always strive to provide comprehensive and accurate information."
    )
    if context_data.get("curriculum_title"):
        system_prompt_text += f"\nThe user is currently working on the curriculum: '{context_data["curriculum_title"]}'."
    if context_data.get("current_day_number") and context_data.get("current_day_title"):
        system_prompt_text += f" Specifically, they are on Day {context_data["current_day_number"]}: '{context_data["current_day_title"]}'."
    
    if lesson_content_for_prompt and lesson_content_for_prompt.strip() and lesson_content_for_prompt != "null":
        system_prompt_text += f"\n\nHere is the content for today's lesson:\n---BEGIN LESSON CONTENT---\n{lesson_content_for_prompt}\n---END LESSON CONTENT---"
    else:
        system_prompt_text += ("\nIt seems there is no specific lesson content loaded for today, or the content is empty. "
                               "Try to be helpful with general knowledge based on the curriculum and day title, or use your tools to find relevant information if appropriate, or ask the user for more details.")
    
    if context_data.get("learning_goal"):
        system_prompt_text += f"\n\nThe overall learning goal for this curriculum is: '{context_data["learning_goal"]}'."

    # Prompt for tool calling agent
    # Based on LangChain examples, often uses `નારદ` (Narad) or similar character for placeholders if not directly supported by MessagesPlaceholder for agent_scratchpad.
    # For Gemini with create_tool_calling_agent, the prompt structure is simpler usually.
    # The create_tool_calling_agent typically infers how to format tool calls and responses for the LLM.
    # Let's use a standard prompt structure that works well with tool calling agents.
    agent_prompt = ChatPromptTemplate.from_messages([
        SystemMessagePromptTemplate.from_template(system_prompt_text),
        MessagesPlaceholder(variable_name="chat_history"),
        HumanMessagePromptTemplate.from_template("{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad") # Crucial for agent execution flow
    ])

    # 4. Load Memory (Convert dict history to LangChain message objects)
    chat_history_messages = []
    for msg_data in full_messages_history_for_llm:
        if msg_data.get("role") == "user":
            chat_history_messages.append(HumanMessage(content=msg_data.get("content", "")))
        elif msg_data.get("role") == "assistant":
            # Check if this assistant message contains tool calls (if we start storing them like that)
            # For now, assume it's plain content from previous non-agent interactions
            chat_history_messages.append(AIMessage(content=msg_data.get("content", "")))
        # Later, if we store ToolMessages in history, we'd load them here too.
    print(f"[LC AGENT DEBUG] Chat history for agent: {len(chat_history_messages)} messages.")

    # 5. Create Agent
    agent = create_tool_calling_agent(llm, tools, agent_prompt)

    # 6. Create Agent Executor
    agent_executor = AgentExecutor(
        agent=agent, 
        tools=tools, 
        verbose=True, 
        handle_parsing_errors=True, # Good for robustness
        max_iterations=6, # Prevent runaway agents
        # return_intermediate_steps=True # Consider this if we want to log/show intermediate thoughts/tool calls
    )

    # Ensure tool_input_dict is defined before the try block if it's used in on_tool_start's yield
    # However, it's better to get it from event["data"] directly.

    try:
        print(f"[LC AGENT EVENTS STREAM] Invoking agent_executor.astream_events for input: '{current_user_input}'")
        final_answer_has_streamed = False
        
        async for event in agent_executor.astream_events(
            {"input": current_user_input, "chat_history": chat_history_messages},
            version="v2"
        ):
            kind = event["event"]
            name = event.get("name")
            data = event.get("data", {})

            if kind == "on_llm_stream":
                chunk_data = data.get("chunk")
                if chunk_data and hasattr(chunk_data, 'content'):
                    content_piece = chunk_data.content
                    if isinstance(content_piece, str) and content_piece:
                        print(f"[LC AGENT LLM STREAM - YIELDING]: '{content_piece[:70]}...'")
                        yield content_piece + "\n"
                        final_answer_has_streamed = True

            elif kind == "on_tool_start":
                tool_name = data.get("name", "unknown_tool")
                tool_input_payload = data.get("input", {})
                print(f"[LC AGENT TOOL START]: Tool '{tool_name}' starting with input: {str(tool_input_payload)[:100]}...")
                
                # Prepare input for JSON serialization
                input_for_json = {}
                if isinstance(tool_input_payload, dict):
                    input_for_json = {k: str(v)[:100] + ("..." if len(str(v)) > 100 else "") for k, v in tool_input_payload.items()} # Stringify and truncate values
                else:
                    input_for_json = {"query": str(tool_input_payload)[:100] + ("..." if len(str(tool_input_payload)) > 100 else "")}

                try:
                    yield f"__TOOL_START__!{json.dumps({"name": tool_name, "input": input_for_json})}\n"
                except TypeError as e_json_tool_start:
                    print(f"[LC AGENT TOOL START] JSON serialization error for tool input: {e_json_tool_start}. Input was: {input_for_json}")
                    yield f"__TOOL_START__!{json.dumps({"name": tool_name, "input": "<input details in backend logs>"})}\n"

            elif kind == "on_tool_end":
                tool_name = data.get("name", "unknown_tool")
                # tool_output_preview = str(data.get("output", ""))[:100] # Output not sent to frontend for status
                print(f"[LC AGENT TOOL END]: Tool '{tool_name}' finished.")
                yield f"__TOOL_END__!{json.dumps({"name": tool_name})}\n"
            
            elif kind == "on_chain_end" and name == "AgentExecutor":
                final_agent_output_dict = data.get("output", {})
                print(f"[LC AGENT EXECUTOR END]: Raw output dict: {str(final_agent_output_dict)[:200]}...")
                if not final_answer_has_streamed:
                    final_text_from_executor = final_agent_output_dict.get("output") 
                    if isinstance(final_text_from_executor, str) and final_text_from_executor:
                        print(f"[LC AGENT EXECUTOR END - YIELDING FALLBACK TEXT]: '{final_text_from_executor[:70]}...'")
                        yield final_text_from_executor + "\n"
            
            await asyncio.sleep(0.01)

    except Exception as e:
        print(f"Error during LangChain Agent astream_events: {str(e)}")
        yield f"Sorry, an error occurred: {str(e)}\n"
    finally:
        print(f"[LC AGENT GENERATOR ENDING] User: {user_id}. Sending __END_OF_AI_STREAM__.")
        yield "__END_OF_AI_STREAM__\n"

@router.post("/lc_stream")
async def chat_langchain_stream(
    request_data: LangChainChatRequest, 
    current_user: AuthenticatedUser = Depends(get_current_user),
    supabase_client = Depends(get_supabase)
):
    if not current_user or not current_user.id:
         raise HTTPException(status_code=401, detail="User not authenticated")

    user_id_str = str(current_user.id)
    print(f"[LCEL CHAT DEBUG] Request for /lc_stream user: {user_id_str}, curriculum: {request_data.curriculum_id}")

    # Extract the last user message as the current input
    current_user_input = ""
    raw_messages_for_history = [] # For LLM, don't include system messages if any in raw list
    if request_data.messages:
        for msg in request_data.messages:
            raw_messages_for_history.append({"role": msg.role, "content": msg.content})
        # The last message in the list sent by useChat is the current user input
        if request_data.messages[-1].role == 'user':
            current_user_input = request_data.messages[-1].content
    
    if not current_user_input:
        # Handle case where there's no user input, maybe return an error or a default greeting
        async def empty_input_stream():
            yield f'0:{json.dumps("Hello! How can I help you today?")}\n'
            yield f'd:{json.dumps({"finishReason": "stop"})}\n'
        return StreamingResponse(empty_input_stream(), media_type="text/event-stream", headers={"x-vercel-ai-data-stream": "v1"})

    # Prepare context data for the system prompt
    context_data_for_prompt = {
        "curriculum_title": request_data.curriculum_title,
        "current_day_number": request_data.current_day_number,
        "current_day_title": request_data.current_day_title,
        "learning_goal": request_data.learning_goal
    }

    # History for LangChain memory: use all messages *before* the current user input
    # The current user input will be added by the chain itself.
    history_for_memory = []
    if len(raw_messages_for_history) > 1:
        history_for_memory = raw_messages_for_history[:-1]

    headers = {"x-vercel-ai-data-stream": "v1", "Content-Type": "text/event-stream"}
    return StreamingResponse(
        langchain_chat_stream_generator(
            user_id=user_id_str,
            curriculum_id=request_data.curriculum_id,
            full_messages_history_for_llm=history_for_memory, # Pass history for memory
            current_user_input=current_user_input, # Pass current input separately
            supabase_client=supabase_client,
            context_data=context_data_for_prompt
        ),
        media_type="text/event-stream", # Ensure this is text/event-stream for SSE
        headers=headers
    ) 