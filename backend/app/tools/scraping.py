"""Web scraping and search tools using Firecrawl API."""

import asyncio
from typing import Any, Dict, List, Optional

import aiohttp
from app.core.config import settings


async def firecrawl_search(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search the web and get full content using Firecrawl's search endpoint.
    
    This is Firecrawl's most powerful feature - it searches the web and returns
    full markdown content for each result, not just snippets.
    """
    if not settings.firecrawl_api_key:
        return [{"error": "Firecrawl API key not configured"}]
    
    headers = {
        "Authorization": f"Bearer {settings.firecrawl_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "query": query,
        "limit": limit,
        "scrapeOptions": {
            "formats": ["markdown"],
            "onlyMainContent": True,
            "includeHtml": False
        }
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.firecrawl.dev/v1/search",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    if data.get("success") and data.get("data"):
                        results = []
                        for item in data["data"]:
                            results.append({
                                "url": item.get("url", ""),
                                "title": item.get("metadata", {}).get("title", ""),
                                "description": item.get("metadata", {}).get("description", ""),
                                "markdown": item.get("markdown", ""),
                                "metadata": item.get("metadata", {})
                            })
                        return results
                    else:
                        return [{"error": "No results found"}]
                else:
                    error_data = await response.text()
                    return [{"error": f"Firecrawl search error: {response.status} - {error_data}"}]
        except Exception as e:
            return [{"error": f"Search failed: {str(e)}"}]


async def firecrawl_scrape(url: str, wait_for_selector: Optional[str] = None, extract_schema: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Scrape a webpage using Firecrawl API with optional extraction."""
    if not settings.firecrawl_api_key:
        return {"error": "Firecrawl API key not configured"}
    
    headers = {
        "Authorization": f"Bearer {settings.firecrawl_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "formats": ["markdown", "html"] if not extract_schema else ["markdown", "json"],
        "waitFor": wait_for_selector if wait_for_selector else 1000,
        "timeout": 30000,
        "removeTags": ["script", "style", "nav", "footer", "aside"],
        "onlyMainContent": True
    }
    
    # Add extraction if schema provided
    if extract_schema:
        payload["jsonOptions"] = {
            "schema": extract_schema
        }
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    result = {
                        "success": True,
                        "markdown": data.get("data", {}).get("markdown", ""),
                        "metadata": data.get("data", {}).get("metadata", {}),
                        "url": url
                    }
                    
                    if extract_schema:
                        result["extracted_data"] = data.get("data", {}).get("json", {})
                    else:
                        result["html"] = data.get("data", {}).get("html", "")
                    
                    return result
                else:
                    error_data = await response.text()
                    return {"error": f"Firecrawl API error: {response.status} - {error_data}"}
        except Exception as e:
            return {"error": f"Scraping failed: {str(e)}"}


async def firecrawl_crawl(url: str, max_depth: int = 2, limit: int = 10) -> Dict[str, Any]:
    """Crawl a website and its subpages using Firecrawl API."""
    if not settings.firecrawl_api_key:
        return {"error": "Firecrawl API key not configured"}
    
    headers = {
        "Authorization": f"Bearer {settings.firecrawl_api_key}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "url": url,
        "maxDepth": max_depth,
        "limit": limit,
        "formats": ["markdown"],
        "includePaths": [],
        "excludePaths": ["/privacy", "/terms", "/cookies", "/legal"],
        "onlyMainContent": True
    }
    
    async with aiohttp.ClientSession() as session:
        try:
            # Start the crawl job
            async with session.post(
                "https://api.firecrawl.dev/v1/crawl",
                headers=headers,
                json=payload
            ) as response:
                if response.status == 200:
                    job_data = await response.json()
                    job_id = job_data.get("id")
                    
                    # Poll for job completion
                    for _ in range(30):  # Max 30 seconds
                        await asyncio.sleep(1)
                        
                        async with session.get(
                            f"https://api.firecrawl.dev/v1/crawl/{job_id}",
                            headers=headers
                        ) as status_response:
                            if status_response.status == 200:
                                status_data = await status_response.json()
                                if status_data.get("status") == "completed":
                                    return {
                                        "success": True,
                                        "data": status_data.get("data", []),
                                        "total": status_data.get("total", 0)
                                    }
                                elif status_data.get("status") == "failed":
                                    return {"error": "Crawl job failed"}
                    
                    return {"error": "Crawl job timed out"}
                else:
                    return {"error": f"Firecrawl API error: {response.status}"}
        except Exception as e:
            return {"error": f"Crawling failed: {str(e)}"} 