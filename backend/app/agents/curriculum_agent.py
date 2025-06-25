"""LangGraph agent for curriculum generation and management."""

import json
import re  # Added for robust JSON parsing
import traceback  # Added for error logging
from typing import Annotated, Any, Dict, List, Optional, TypedDict

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
        user_message = messages[-1] if messages else {}
        query = user_message.get("content", "")
        context["user_query"] = query
        context["intent"] = self._determine_intent(query)
        context["user_preferences"] = context.get("user_preferences", {})
        state["context"] = context
        return state
    
    def _determine_intent(self, query: str) -> str:
        query_lower = query.lower()
        if any(word in query_lower for word in ["create", "generate", "build", "make"]):
            return "create_curriculum"
        elif any(word in query_lower for word in ["explain", "what", "how", "why"]):
            return "explain_concept"
        elif any(word in query_lower for word in ["practice", "exercise", "problem", "quiz"]):
            return "provide_practice"
        elif any(word in query_lower for word in ["resource", "material", "link", "video"]):
            return "find_resources"
        else:
            return "general_help"
    
    async def _plan_tools(self, state: AgentState) -> AgentState:
        context = state.get("context", {})
        intent = context.get("intent", "general_help")
        query = context.get("user_query", "")
        tools_needed = []
        if intent == "create_curriculum":
            tools_needed = ["firecrawl_search", "youtube_search"]
            if any(word in query.lower() for word in ["math", "calculus", "algebra", "statistics"]):
                tools_needed.append("wolfram_alpha_query")
            if any(word in query.lower() for word in ["programming", "coding", "python", "javascript"]):
                tools_needed.append("github_search")
            if any(word in query.lower() for word in ["research", "academic", "paper"]):
                tools_needed.append("arxiv_search")
        elif intent == "explain_concept":
            tools_needed = ["wikipedia_search", "firecrawl_search", "youtube_search"]
        elif intent == "provide_practice":
            tools_needed = ["firecrawl_search", "github_search"]
        elif intent == "find_resources":
            tools_needed = ["youtube_search", "firecrawl_search", "github_search"]
        else:
            tools_needed = ["firecrawl_search"]
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
        tools_output = state.get("tools_output", [])
        user_query_from_context = context.get("user_query", "")
        system_prompt = """You are an expert curriculum designer for onemonth.dev.
Your task is to generate a structured curriculum in JSON format.
The JSON output MUST have the following top-level keys:
- "curriculum_title": A string for the overall title of the curriculum.
- "curriculum_description": A string describing the curriculum.
- "days": A list of day objects.
Each day object in the "days" list MUST have the following keys:
- "day_number": An integer representing the day number (starting from 1).
- "title": A concise string title for the day's topic.
- "content": A JSON object representing rich text content for the learning module. For example: {"type": "doc", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Today you will learn about X..."}]}]}
- "resources": A list of JSON objects, where each object has "title" (string) and "url" (string) for relevant learning resources.
- "estimated_hours": An optional float for the estimated hours for the day.
Adhere strictly to this JSON structure. Do not include any explanatory text outside of the JSON object itself.
"""
        research_results = self._format_tool_results(tools_output)
        user_prompt_content = f"""User Preferences and Goal (this was the input from the user/system that initiated the curriculum generation):
{user_query_from_context}
Supporting Research & Tool Outputs:
{research_results}
Based on ALL the information above, generate the curriculum in the specified JSON format.
Ensure the curriculum directly addresses the user's learning goal and preferences.
Make sure the number of days in the generated "days" list matches the requested "Total Duration (days)" from the user preferences.
"""
        llm_messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt_content}
        ]
        
        api_url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
        model_name = "gemini-2.5-pro" # User specified model

        async with aiohttp.ClientSession() as session:
            headers = {
                "Authorization": f"Bearer {self.gemini_api_key}", 
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name, 
                "messages": llm_messages,
                "temperature": 0.6,
                "max_tokens": 50_000, # Adjusted for potentially large JSON, but within typical API limits
                "response_format": {"type": "json_object"}
            }
            print(f"Calling Gemini API ({payload['model']}) at {api_url}")
            print(f"Message count: {len(llm_messages)}, Total chars in messages: {sum(len(m['content']) for m in llm_messages)}")
            try:
                async with session.post(api_url, headers=headers, json=payload) as response:
                    print(f"Gemini API response status: {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        generated_content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                        print(f"Generated content length from Gemini: {len(generated_content)}")
                        state["final_response"] = generated_content
                    else:
                        error_text = await response.text()
                        print(f"Gemini API error ({response.status}): {error_text}")
                        state["final_response"] = f'{{ "error": "Failed to generate curriculum via Gemini API. Status: {response.status}. Details: {error_text[:500]}" }}'
            except Exception as e:
                print(f"Exception during Gemini API call: {str(e)}")
                traceback.print_exc()
                state["final_response"] = f'{{ "error": "Exception during LLM call: {str(e)}" }}'
        return state
    
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