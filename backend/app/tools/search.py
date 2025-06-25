"""Search tools for the curriculum agent."""

from typing import Any, Dict, List

import aiohttp
from app.core.config import settings


async def perplexity_search(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    """Search using Perplexity API for up-to-date information."""
    if not settings.perplexity_api_key:
        return [{"error": "Perplexity API key not configured"}]
    
    headers = {
        "Authorization": f"Bearer {settings.perplexity_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": "llama-3.1-sonar-small-128k-online",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful search assistant. Return comprehensive, factual information."
            },
            {
                "role": "user",
                "content": query
            }
        ],
        "temperature": 0.2,
        "top_p": 0.9,
        "search_domain_filter": ["perplexity.ai"],
        "return_images": False,
        "return_related_questions": False,
        "search_recency_filter": "month",
        "stream": False
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.perplexity.ai/chat/completions",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return [{
                        "content": data["choices"][0]["message"]["content"],
                        "citations": data.get("citations", [])
                    }]
                else:
                    return [{"error": f"Perplexity API error: {response.status}"}]
        except Exception as e:
            return [{"error": f"Search failed: {str(e)}"}]


async def exa_search(query: str, use_autoprompt: bool = True, num_results: int = 10) -> List[Dict[str, Any]]:
    """Search using Exa API for high-quality web content."""
    if not settings.exa_api_key:
        return [{"error": "Exa API key not configured"}]
    
    headers = {
        "x-api-key": settings.exa_api_key,
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "useAutoprompt": use_autoprompt,
        "numResults": num_results,
        "contents": {
            "text": True,
            "highlights": True
        }
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.exa.ai/search",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    return data.get("results", [])
                else:
                    return [{"error": f"Exa API error: {response.status}"}]
        except Exception as e:
            return [{"error": f"Exa search failed: {str(e)}"}] 