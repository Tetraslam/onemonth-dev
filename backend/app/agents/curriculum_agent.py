"""LangGraph agent for curriculum generation and management."""

import json
import re  # Added for robust JSON parsing
import traceback  # Added for error logging
from typing import Annotated, Any, Dict, List, Optional, TypedDict, AsyncIterator

import aiohttp
from app.core.config import settings
from app.tools.knowledge_sources import (arxiv_search, github_search,
                                         wikipedia_search, wolfram_alpha_query,
                                         youtube_search)
from app.tools.scraping import (firecrawl_crawl, firecrawl_scrape,
                                firecrawl_search)
from app.tools.search import exa_search, perplexity_search
from langgraph.graph import END, StateGraph


class AgentState(TypedDict):
    """State for the curriculum agent."""
    messages: List[Dict[str, Any]]
    context: Dict[str, Any]
    tools_needed: List[str]
    tools_output: List[Dict[str, Any]]
    final_response: Optional[str]


class CurriculumAgent:
    """Agent for generating and managing curricula."""
    
    def __init__(self):
        self.graph = self._build_graph()
        # self.openrouter_api_key = settings.openrouter_api_key # Old key
        self.gemini_api_key = settings.gemini_api_key # New key for Gemini API
        
        # Check if API key is set
        if not self.gemini_api_key:
            print("CRITICAL WARNING: GEMINI_API_KEY is not set in environment variables!")
        
        # Tool mapping
        self.tools = {
            "firecrawl_search": firecrawl_search,
            "perplexity_search": perplexity_search,
            "exa_search": exa_search,
            "firecrawl_scrape": firecrawl_scrape,
            "firecrawl_crawl": firecrawl_crawl,
            "youtube_search": youtube_search,
            "arxiv_search": arxiv_search,
            "wikipedia_search": wikipedia_search,
            "github_search": github_search,
            "wolfram_alpha_query": wolfram_alpha_query
        }
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        graph = StateGraph(AgentState)
        
        graph.add_node("analyze_context", self._analyze_context)
        graph.add_node("plan_tools", self._plan_tools)
        graph.add_node("execute_tools", self._execute_tools)
        graph.add_node("generate_response", self._generate_response)
        
        graph.set_entry_point("analyze_context")
        graph.add_edge("analyze_context", "plan_tools")
        graph.add_edge("plan_tools", "execute_tools")
        graph.add_edge("execute_tools", "generate_response")
        graph.add_edge("generate_response", END)
        
        return graph.compile()
    
    async def _analyze_context(self, state: AgentState) -> AgentState:
        messages = state.get("messages", [])
        context = state.get("context", {})
        print(f"[AGENT DEBUG] _analyze_context received messages: {messages}") # DEBUG
        user_message = messages[-1] if messages else {}
        query = user_message.get("content", "")
        print(f"[AGENT DEBUG] _analyze_context extracted query: '{query}'") # DEBUG
        context["user_query"] = query
        current_intent = self._determine_intent(query)
        context["intent"] = current_intent
        print(f"[AGENT DEBUG] _analyze_context determined intent: '{current_intent}'") # DEBUG
        context["user_preferences"] = context.get("user_preferences", {})
        state["context"] = context
        return state
    
    def _determine_intent(self, query: str) -> str:
        query_lower = query.lower().strip()
        print(f"[AGENT DEBUG] _determine_intent received query_lower: '{query_lower}'") # DEBUG
        # More specific greeting check first
        if query_lower in ["hi", "hello", "hey", "greetings", "sup", "yo"]:
            return "greeting"
        
        if any(word in query_lower for word in ["create curriculum", "generate curriculum", "build curriculum", "make curriculum", "plan for"]):
            return "create_curriculum"
        elif any(word in query_lower for word in ["explain", "what is", "how does", "why is", "tell me about"]):
            return "explain_concept"
        elif any(word in query_lower for word in ["practice", "exercise", "problem", "quiz me"]):
            return "provide_practice"
        elif any(word in query_lower for word in ["resource", "material", "link", "video", "find me"]):
            return "find_resources"
        elif len(query_lower.split()) < 4: # If it's a very short query, likely general help or chit-chat
            return "general_chat"
        else:
            return "general_help" # Needs research
    
    async def _plan_tools(self, state: AgentState) -> AgentState:
        context = state.get("context", {})
        intent = context.get("intent", "general_help")
        query = context.get("user_query", "")
        
        tools_needed = []
        
        # Only use tools if necessary based on intent
        if intent == "create_curriculum":
            tools_needed = ["firecrawl_search", "youtube_search"]
            if any(word in query.lower() for word in ["math", "calculus", "algebra", "statistics"]):
                tools_needed.append("wolfram_alpha_query")
            if any(word in query.lower() for word in ["programming", "coding", "python", "javascript"]):
                tools_needed.append("github_search")
            if any(word in query.lower() for word in ["research", "academic", "paper"]):
                tools_needed.append("arxiv_search")
        elif intent == "explain_concept":
            tools_needed = ["wikipedia_search", "firecrawl_search", "youtube_search", "perplexity_search"]
            if any(word in query.lower() for word in ["code", "python", "javascript", "algorithm", "programming"]):
                tools_needed.append("github_search")
            if any(word in query.lower() for word in ["math", "equation", "calculate", "algebra", "calculus", "statistics"]):
                tools_needed.append("wolfram_alpha_query")
            if any(word in query.lower() for word in ["academic", "research", "paper"]):
                tools_needed.append("arxiv_search")
        elif intent == "provide_practice":
            tools_needed = ["firecrawl_search", "perplexity_search"]
        elif intent == "find_resources":
            tools_needed = ["youtube_search", "firecrawl_search", "github_search", "perplexity_search", "exa_search"]
        elif intent == "general_help": 
            tools_needed = ["firecrawl_search", "perplexity_search", "exa_search"]
            if any(word in query.lower() for word in ["code", "python", "javascript", "algorithm", "programming"]):
                tools_needed.append("github_search")
            if any(word in query.lower() for word in ["math", "equation", "calculate", "algebra", "calculus", "statistics"]):
                tools_needed.append("wolfram_alpha_query")
            if any(word in query.lower() for word in ["academic", "research", "paper"]):
                tools_needed.append("arxiv_search")
            if any(word in query.lower() for word in ["news", "current events", "recent"]):
                 # Perplexity is good for recent events
                 if "perplexity_search" not in tools_needed: tools_needed.append("perplexity_search")
        # For "greeting" and "general_chat", tools_needed remains empty by default
        
        print(f"[AGENT DEBUG] Intent: {intent}, Query: '{query}', Tools Planned: {tools_needed}")
        state["tools_needed"] = tools_needed
        return state
    
    async def _execute_tools(self, state: AgentState) -> AgentState:
        tools_output = []
        tools_needed = state.get("tools_needed", [])
        query = state.get("context", {}).get("user_query", "")
        print(f"Executing tools: {tools_needed}")
        for tool_name in tools_needed:
            if tool_name in self.tools:
                tool_func = self.tools[tool_name]
                try:
                    if tool_name == "wolfram_alpha_query":
                        if not settings.wolfram_alpha_app_id:
                            print(f"Skipping {tool_name} - WOLFRAM_ALPHA_APP_ID not set")
                            continue
                        result = await tool_func(query, app_id=settings.wolfram_alpha_app_id)
                    elif tool_name in ["firecrawl_scrape", "firecrawl_crawl"]:
                        continue
                    else:
                        if tool_name.startswith("firecrawl") and not settings.firecrawl_api_key:
                            print(f"Skipping {tool_name} - FIRECRAWL_API_KEY not set")
                            continue
                        elif tool_name == "perplexity_search" and not settings.perplexity_api_key:
                            print(f"Skipping {tool_name} - PERPLEXITY_API_KEY not set")
                            continue
                        elif tool_name == "exa_search" and not settings.exa_api_key:
                            print(f"Skipping {tool_name} - EXA_API_KEY not set")
                            continue
                        result = await tool_func(query)
                    print(f"Tool {tool_name} returned result of type {type(result)}")
                    tools_output.append({"tool": tool_name, "result": result})
                except Exception as e:
                    print(f"Error executing tool {tool_name}: {str(e)}")
                    tools_output.append({"tool": tool_name, "error": str(e)})
        state["tools_output"] = tools_output
        return state
    
    async def _generate_response(self, state: AgentState) -> AgentState:
        context = state.get("context", {})
        user_query_from_context = context.get("user_query", "")
        intent = context.get("intent", "general_help")

        # System prompt and user prompt construction (simplified for brevity, use your existing logic)
        system_prompt = "You are a helpful AI assistant. "
        if intent == "greeting":
            system_prompt = "You are a friendly and helpful AI learning assistant. Respond to the user\'s greeting with a short, friendly greeting of your own. For example, if the user says 'hi', you could say 'Hello there!' or 'Hi! How can I help you today?'. Keep it concise."
            user_prompt_content = user_query_from_context
        elif intent == "create_curriculum":
            system_prompt = "You are an expert curriculum designer. Your task is to generate a comprehensive, day-by-day learning plan based *strictly* on the user\'s detailed preferences and the provided supporting research. The user\'s message will outline the desired curriculum structure, including specific sections for each day (like Introduction, Learning Objectives, Key Concepts, Examples, Summary) and the required TipTap/ProseMirror JSON format for the 'content' field. Adhere meticulously to this structure and all formatting requirements. Ensure the output is a single, valid JSON object as specified."
            user_prompt_content = f"User Preferences and Structure for CURRICULUM (MUST FOLLOW EXACTLY): {user_query_from_context}\nSupporting Research (USE THIS TO FILL IN DETAILS): {self._format_tool_results(state.get("tools_output", []))}"
        else:
            user_prompt_content = f"User Query: {user_query_from_context}\nSupporting Research: {self._format_tool_results(state.get("tools_output", []))}\nProvide a concise plain text response."
        
        llm_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_content}
        ]
        
        api_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        model_name = "gemini-2.5-pro"
        headers = {
            "Authorization": f"Bearer {self.gemini_api_key}", 
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name, 
            "messages": llm_messages,
            "temperature": 0.6,
            "max_tokens": 150_000 if intent not in ["create_curriculum"] else 150_000,
            "stream": False, # For this non-streaming version that updates graph state
            "response_format": {"type": "json_object"} if intent == "create_curriculum" else None 
        }
        if payload["response_format"] is None: del payload["response_format"]

        print(f"[AGENT _generate_response] Calling Gemini API ({payload['model']}) for intent '{intent}' with stream=False")
        
        complete_response_content = ""
        # Increased timeout for potentially long curriculum generation
        timeout = aiohttp.ClientTimeout(total=3000) # 5 minutes total timeout
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(api_url, headers=headers, json=payload) as response:
                    print(f"[AGENT _generate_response] Gemini API status: {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        complete_response_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        print(f"[AGENT _generate_response] Received full content, length: {len(complete_response_content)}")
                    else:
                        error_text = await response.text()
                        print(f"[AGENT _generate_response] Gemini API error: {error_text}")
                        err_msg_default = "Sorry, I encountered an error processing your request."
                        complete_response_content = f'{{ "error": "API Error: {response.status}" }}' if intent == "create_curriculum" else err_msg_default
        except Exception as e:
            print(f"[AGENT _generate_response] Exception: {str(e)}")
            traceback.print_exc()
            err_msg_default = "Sorry, an unexpected error occurred."
            complete_response_content = f'{{ "error": "LLM Call Exception" }}' if intent == "create_curriculum" else err_msg_default
        
        state["final_response"] = complete_response_content
        return state

    # New method to prepare context for streaming chat, by running initial graph steps manually
    async def analyze_and_plan_for_chat(self, current_chat_messages: List[Dict[str, Any]], base_context: Dict[str, Any]) -> Dict[str, Any]:
        """Runs analysis, planning, and tool execution to prepare for a streaming LLM call."""
        print(f"[AGENT analyze_and_plan_for_chat] Initial messages: {current_chat_messages}")
        print(f"[AGENT analyze_and_plan_for_chat] Base context: {base_context.keys()}")

        # Mimic initial state for the relevant parts of the agent
        # The user_query for intent determination is the last message.
        # The messages for the LLM in stream_chat_response will use this focused query + tool output.
        
        # 1. Analyze Context (to get intent and focused query)
        # We need to ensure the `messages` field in state for _analyze_context is what it expects,
        # typically the full history for some agents, or just the latest for others.
        # For intent, it's usually based on the latest user message.
        temp_state_for_analysis = AgentState(
            messages=current_chat_messages, # Agent usually looks at the last message for intent
            context=base_context.copy(), # Start with base context
            tools_needed=[],
            tools_output=[],
            final_response=None
        )
        analyzed_state = await self._analyze_context(temp_state_for_analysis)
        intent = analyzed_state["context"].get("intent", "general_chat")
        # The user_query determined by _analyze_context is the one we should focus on for planning and LLM
        focused_user_query = analyzed_state["context"].get("user_query", current_chat_messages[-1]["content"] if current_chat_messages else "")
        print(f"[AGENT analyze_and_plan_for_chat] Intent: {intent}, Focused Query: '{focused_user_query}'")

        # 2. Plan Tools (based on focused query and intent)
        # We need to update the context in temp_state_for_analysis with the focused_user_query for planning
        analyzed_state["context"]["user_query"] = focused_user_query # Ensure _plan_tools uses this
        planned_state = await self._plan_tools(analyzed_state)
        tools_needed = planned_state["tools_needed"]
        print(f"[AGENT analyze_and_plan_for_chat] Tools needed: {tools_needed}")

        # 3. Execute Tools (if any)
        # The query for tool execution should be the focused_user_query
        executed_state = await self._execute_tools(planned_state) # _execute_tools uses context["user_query"]
        tools_output = executed_state["tools_output"]
        print(f"[AGENT analyze_and_plan_for_chat] Tools output: {len(tools_output)} items")

        return {
            "intent": intent,
            "focused_user_query": focused_user_query,
            "tools_output": tools_output,
            "full_chat_history_for_llm": current_chat_messages # LLM might still need full history for convo context
        }

    # Modified method specifically for streaming chat responses
    async def stream_chat_response(self, 
                                   intent: str, 
                                   focused_user_query: str, 
                                   tools_output: List[Dict[str, Any]],
                                   full_chat_history_for_llm: List[Dict[str,Any]]
                                   ) -> AsyncIterator[str]:
        
        print(f"[AGENT stream_chat_response] Intent: {intent}, Query: '{focused_user_query}', Tools output items: {len(tools_output)}")

        if intent == "greeting":
            # Simplest, most direct prompt for greeting to ensure a response
            system_prompt = "You are a friendly AI. User says hi. Respond with a short, friendly greeting."
            user_prompt_content = focused_user_query # This will be "hi"
        elif intent == "create_curriculum": 
            print("[AGENT stream_chat_response] WARNING: 'create_curriculum' intent received in chat stream.")
            yield "To create a new curriculum, please use the 'Create New Curriculum' feature."
            return
        else: 
            system_prompt = "You are a helpful AI learning assistant. Provide a concise, conversational, and helpful plain text response based on the user's query and any provided research."
            research_results_formatted = self._format_tool_results(tools_output)
            if research_results_formatted.strip():
                user_prompt_content = f"Based on the following information:\n{research_results_formatted}\n\nAddress the user's query: {focused_user_query}"
            else:
                user_prompt_content = focused_user_query
        
        llm_messages_for_stream = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_content}
        ]

        api_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        model_name = "gemini-2.5-pro"
        headers = {
            "Authorization": f"Bearer {self.gemini_api_key}", 
            "Content-Type": "application/json",
        }
        payload = {
            "model": model_name, 
            "messages": llm_messages_for_stream,
            "temperature": 0.7,
            "max_tokens": 150_000 if intent == "greeting" else 150_000, # Shorter for greeting
            "stream": True, 
        }

        print(f"[AGENT stream_chat_response] Calling Gemini API ({payload['model']}) for intent '{intent}' with stream=True")
        print(f"[AGENT stream_chat_response] LLM Messages (simplified): {{system: '{system_prompt[:70]}...', user: '{user_prompt_content[:100]}...'}}")
        
        # Increased timeout for chat streaming as well, though less likely to be an issue here
        timeout = aiohttp.ClientTimeout(total=3000) # 5 minutes total timeout
        try:
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(api_url, headers=headers, json=payload) as response:
                    print(f"[AGENT stream_chat_response] Gemini API stream status: {response.status}")
                    if response.status == 200:
                        async for line in response.content:
                            if line:
                                line_str = line.decode('utf-8').strip()
                                print(f"[AGENT RAW STREAM LINE]: <{line_str}> ") # LOG RAW LINE
                                if line_str.startswith("data: "):
                                    line_str = line_str[len("data: "):]
                                if line_str == "[DONE]":
                                    print("[AGENT stream_chat_response] Stream finished [DONE].")
                                    break
                                try:
                                    chunk_json = json.loads(line_str)
                                    text_chunk = chunk_json.get("choices", [{}])[0].get("delta", {}).get("content", None)
                                    if text_chunk is not None:
                                        yield text_chunk
                                    if chunk_json.get("choices", [{}])[0].get("finish_reason") is not None:
                                        print(f"[AGENT stream_chat_response] Stream finished due to finish_reason: {chunk_json['choices'][0]['finish_reason']}")
                                        break 
                                except json.JSONDecodeError:
                                    pass 
                    else:
                        error_text = await response.text()
                        print(f"[AGENT stream_chat_response] Gemini API stream error ({response.status}): {error_text}")
                        yield f"Sorry, I encountered an API error (Status {response.status}). Please try again."
        except Exception as e:
            print(f"[AGENT stream_chat_response] Exception: {str(e)}")
            traceback.print_exc()
            yield "Sorry, an unexpected error occurred while trying to stream a response. Please try again."

    def _format_tool_results(self, tools_output: List[Dict[str, Any]]) -> str:
        formatted = []
        for output in tools_output:
            tool_name = output.get("tool", "Unknown Tool")
            if "error" in output:
                formatted.append(f"\n### {tool_name} Error:\n{output['error']}")
                continue
            result = output.get("result", {})
            if tool_name == "firecrawl_search" and isinstance(result, list):
                formatted.append("\n### Firecrawl Search Results (Full Content):")
                for i, item in enumerate(result[:3]):
                    if isinstance(item, dict) and not item.get("error"):
                        formatted.append(f"\n#### Result {i+1}: {item.get('title', 'Untitled')}")
                        formatted.append(f"URL: {item.get('url', 'N/A')}")
                        formatted.append(f"Description: {item.get('description', 'N/A')}")
                        markdown_content = item.get('markdown', '')
                        if markdown_content:
                            formatted.append(f"Content:\n{markdown_content[:1500]}...")
                        formatted.append("")
            elif tool_name == "perplexity_search" and isinstance(result, list):
                for item in result[:3]:
                    if "content" in item:
                        formatted.append(f"\n### Perplexity Search Result:\n{item['content'][:1000]}...")
            elif tool_name == "youtube_search" and isinstance(result, list):
                formatted.append("\n### YouTube Videos:")
                for video in result[:5]:
                    if not isinstance(video, dict) or "error" in video:
                        continue
                    formatted.append(f"- [{video.get('title', 'Unknown')}]({video.get('url', '#')}) by {video.get('channel', 'Unknown')}")
            elif tool_name == "wikipedia_search" and isinstance(result, dict):
                if "summary" in result:
                    formatted.append(f"\n### Wikipedia: {result.get('title', 'Unknown')}\n{result['summary'][:500]}...")
            elif tool_name == "github_search" and isinstance(result, list):
                formatted.append("\n### GitHub Repositories:")
                for repo in result[:5]:
                    if not isinstance(repo, dict) or "error" in repo:
                        continue
                    formatted.append(f"- [{repo.get('name', 'Unknown')}]({repo.get('url', '#')}) - {repo.get('description', 'No description')[:100]}...")
            elif tool_name == "arxiv_search" and isinstance(result, list):
                formatted.append("\n### Academic Papers:")
                for paper in result[:3]:
                    if not isinstance(paper, dict) or "error" in paper:
                        continue
                    formatted.append(f"- [{paper.get('title', 'Unknown')}]({paper.get('url', '#')}) - {paper.get('summary', '')[:200]}...")
        return "\n".join(formatted)
    
    async def run(self, messages: List[Dict[str, Any]], context: Optional[Dict[str, Any]] = None) -> str:
        initial_state = {
            "messages": messages,
            "context": context or {},
            "tools_needed": [],
            "tools_output": [],
            "final_response": None
        }
        final_state = await self.graph.ainvoke(initial_state)
        return final_state.get("final_response", "I apologize, but I encountered an error generating a response.")

curriculum_agent = CurriculumAgent() 