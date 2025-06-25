"""Knowledge source tools for the curriculum agent."""

from typing import Any, Dict, List, Optional

import aiohttp
import arxiv
import wikipediaapi
from youtube_search import YoutubeSearch


async def youtube_search(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search YouTube for educational videos."""
    try:
        results = YoutubeSearch(query, max_results=max_results).to_dict()
        
        formatted_results = []
        for video in results:
            formatted_results.append({
                "title": video.get("title", ""),
                "url": f"https://youtube.com{video.get('url_suffix', '')}",
                "duration": video.get("duration", ""),
                "views": video.get("views", ""),
                "channel": video.get("channel", ""),
                "description": video.get("long_desc", "")[:500] + "..." if video.get("long_desc") else "",
                "thumbnail": video.get("thumbnails", [None])[0] if video.get("thumbnails") else None
            })
        
        return formatted_results
    except Exception as e:
        return [{"error": f"YouTube search failed: {str(e)}"}]


async def arxiv_search(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search arXiv for academic papers."""
    try:
        search = arxiv.Search(
            query=query,
            max_results=max_results,
            sort_by=arxiv.SortCriterion.Relevance
        )
        
        results = []
        for paper in search.results():
            results.append({
                "title": paper.title,
                "authors": [author.name for author in paper.authors],
                "summary": paper.summary,
                "url": paper.entry_id,
                "pdf_url": paper.pdf_url,
                "published": paper.published.isoformat(),
                "categories": paper.categories,
                "primary_category": paper.primary_category
            })
        
        return results
    except Exception as e:
        return [{"error": f"arXiv search failed: {str(e)}"}]


async def wikipedia_search(query: str, lang: str = "en") -> Dict[str, Any]:
    """Search and retrieve Wikipedia articles."""
    try:
        wiki = wikipediaapi.Wikipedia(
            user_agent='OneMonth.dev/1.0 (https://onemonth.dev)',
            language=lang
        )
        
        page = wiki.page(query)
        
        if not page.exists():
            # Try searching for the page
            search_url = f"https://{lang}.wikipedia.org/w/api.php"
            params = {
                "action": "query",
                "format": "json",
                "list": "search",
                "srsearch": query,
                "srlimit": 5
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(search_url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        search_results = data.get("query", {}).get("search", [])
                        
                        if search_results:
                            # Get the first result
                            first_result = search_results[0]
                            page = wiki.page(first_result["title"])
            
        if page.exists():
            return {
                "title": page.title,
                "summary": page.summary,
                "content": page.text[:5000] + "..." if len(page.text) > 5000 else page.text,
                "url": page.fullurl,
                "categories": list(page.categories.keys())[:10],
                "links": list(page.links.keys())[:20]
            }
        else:
            return {"error": f"No Wikipedia page found for: {query}"}
            
    except Exception as e:
        return {"error": f"Wikipedia search failed: {str(e)}"}


async def github_search(query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    """Search GitHub for repositories and code."""
    try:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "OneMonth.dev/1.0"
        }
        
        # Search repositories
        search_url = "https://api.github.com/search/repositories"
        params = {
            "q": query,
            "sort": "stars",
            "order": "desc",
            "per_page": max_results
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(search_url, headers=headers, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    results = []
                    for repo in data.get("items", []):
                        results.append({
                            "name": repo["full_name"],
                            "description": repo["description"],
                            "url": repo["html_url"],
                            "stars": repo["stargazers_count"],
                            "language": repo["language"],
                            "topics": repo.get("topics", []),
                            "updated_at": repo["updated_at"]
                        })
                    
                    return results
                else:
                    return [{"error": f"GitHub API error: {response.status}"}]
                    
    except Exception as e:
        return [{"error": f"GitHub search failed: {str(e)}"}]


async def wolfram_alpha_query(query: str, app_id: Optional[str] = None) -> Dict[str, Any]:
    """Query Wolfram Alpha for computational knowledge."""
    if not app_id:
        return {"error": "Wolfram Alpha App ID not configured"}
    
    try:
        base_url = "https://api.wolframalpha.com/v2/query"
        params = {
            "appid": app_id,
            "input": query,
            "format": "plaintext",
            "output": "json"
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(base_url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    result = {
                        "query": query,
                        "success": data["queryresult"]["success"],
                        "pods": []
                    }
                    
                    if data["queryresult"]["success"]:
                        for pod in data["queryresult"].get("pods", []):
                            pod_data = {
                                "title": pod["title"],
                                "subpods": []
                            }
                            
                            for subpod in pod.get("subpods", []):
                                if "plaintext" in subpod and subpod["plaintext"]:
                                    pod_data["subpods"].append(subpod["plaintext"])
                            
                            if pod_data["subpods"]:
                                result["pods"].append(pod_data)
                    
                    return result
                else:
                    return {"error": f"Wolfram Alpha API error: {response.status}"}
                    
    except Exception as e:
        return {"error": f"Wolfram Alpha query failed: {str(e)}"} 