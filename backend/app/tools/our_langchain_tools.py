"""LangChain-compatible tools for the onemonth.dev agent."""

import asyncio
from typing import Any, Dict, Optional

from app.tools.scraping import \
    firecrawl_scrape as original_firecrawl_scrape_url
# Need to import the actual underlying search/scrape functions
# Assuming they are in app.tools.search and app.tools.scraping relative to the backend/app directory
from app.tools.search import exa_search as original_exa_search
from app.tools.search import perplexity_search as original_perplexity_search
from langchain_core.tools import tool
from pydantic import BaseModel, Field

# Note: The firecrawl_scrape_url was named firecrawl_scrape in previous discussions for scraping.py
# Let's assume it's firecrawl_scrape_url for clarity based on its function
# If it's named differently in scraping.py, this import will need to be adjusted.

# --- Exa Search Tool ---
class ExaSearchInput(BaseModel):
    query: str = Field(description="The search query for Exa.")

@tool("exa_search", args_schema=ExaSearchInput)
async def exa_search_lc_tool(query: str) -> str:
    """A powerful neural search engine for finding in-depth information, articles, and diverse perspectives. Use for comprehensive research or to find specific documents when a user asks a question that requires deep web exploration."""
    print(f"[LangChain Tool Call] Exa Search with query: {query}")
    try:
        # Assuming original_exa_search takes the query and returns a string or structured data
        # For now, let's expect it returns a string or a dict that we can stringify.
        # If it returns a complex object, we might need to format it.
        result = await original_exa_search(query=query) # Ensure original_exa_search is async and takes 'query'
        if isinstance(result, dict) and 'results' in result: # Exa often returns dict with a 'results' list
            # Let's format the top N results for brevity or concatenate content
            formatted_results = []
            for i, res_item in enumerate(result['results'][:3]): # Top 3 results
                title = res_item.get('title', 'No title')
                url = res_item.get('url', 'No URL')
                snippet = res_item.get('text', 'No snippet') # Or 'highlights' depending on Exa's output
                formatted_results.append(f"Result {i+1}:\nTitle: {title}\nURL: {url}\nSnippet: {snippet[:200]}...\n")
            return "\n".join(formatted_results) if formatted_results else "No results found from Exa."

        return str(result) if result else "No results found from Exa."
    except Exception as e:
        print(f"Error in exa_search_lc_tool: {e}")
        return f"Error performing Exa search: {str(e)}"

# --- Perplexity Search Tool ---
class PerplexitySearchInput(BaseModel):
    query: str = Field(description="The search query for Perplexity AI.")

@tool("perplexity_search", args_schema=PerplexitySearchInput)
async def perplexity_search_lc_tool(query: str) -> str:
    """A conversational AI search engine that provides direct answers and summaries. Use for quick factual answers, summaries, or when the user asks a specific question requiring up-to-date information."""
    print(f"[LangChain Tool Call] Perplexity Search with query: {query}")
    try:
        # Assuming original_perplexity_search returns a string (the answer)
        result_dict = await original_perplexity_search(query=query, return_concise_answer=True, focus_on_question=True) # Added params for focused answer
        
        # Perplexity tool in search.py was returning a dict like {'answer': '...', 'concise_answer': '...'}
        # Let's prioritize concise_answer if available
        answer = result_dict.get('concise_answer') or result_dict.get('answer')
        
        return str(answer) if answer else "Perplexity couldn't find an answer."
    except Exception as e:
        print(f"Error in perplexity_search_lc_tool: {e}")
        return f"Error performing Perplexity search: {str(e)}"

# --- Firecrawl Scrape URL Tool ---
class FirecrawlScrapeInput(BaseModel):
    url: str = Field(description="The exact URL of the webpage to scrape.")

@tool("firecrawl_scrape_url", args_schema=FirecrawlScrapeInput)
async def firecrawl_scrape_url_lc_tool(url: str) -> str:
    """Fetches and converts the content of a given URL into clean, LLM-ready markdown. Use this to get the textual content of a specific webpage when a URL is provided or discovered through search."""
    print(f"[LangChain Tool Call] Firecrawl Scrape URL: {url}")
    try:
        # The original_firecrawl_scrape_url in scraping.py might take more params (like page_options for markdown)
        # We need to ensure it's called correctly to return markdown.
        # Based on firecrawl docs, formats=['markdown'] should be used.
        # Let's assume original_firecrawl_scrape_url(url=url, page_options={"formats":["markdown"]})
        # and returns a dict like {'markdown': 'content...', 'metadata': {...}}
        
        # Updated to match original_firecrawl_scrape_url signature from scraping.py
        # original_firecrawl_scrape_url(url: str, params: Optional[Dict[str, Any]] = None)
        # params would be like {"pageOptions": {"formats":["markdown"]}}
        # or more simply for FirecrawlApp: scrape_result = app.scrape_url(url, formats=['markdown'])
        # Our original_firecrawl_scrape_url calls app.scrape_url(url, params=scrape_params) where scrape_params can include pageOptions
        
        scrape_params: Dict[str, Any] = {
            "pageOptions": {
                "formats": ["markdown"],
                "onlyMainContent": True # Often good for LLMs
            }
        }
        # If original_firecrawl_scrape_url is designed to accept a dict of params for app.scrape_url(url, **params)
        # then we might pass it as `params=scrape_params`.
        # If it directly takes `page_options` or `formats`, we adjust.
        # For now, assuming it takes `params` which are passed to `app.scrape_url`
        
        # The tool `firecrawl_scrape_url` in `scraping.py` is defined as:
        # async def firecrawl_scrape_url(url: str, params: Optional[Dict[str, Any]] = None, client: Optional[AsyncClient] = None) -> Dict[str, Any]:
        # And calls: response = await app.ascrape_url(url=url, params=scrape_params_for_call)
        # where scrape_params_for_call = {"pageOptions": {"includeRawHtml": False, "screenshot": False, "onlyMainContent": True}}
        # It doesn't seem to take `formats` directly in the scraping.py wrapper in the same way the direct SDK call does.
        # We need to ensure that the `original_firecrawl_scrape_url` is either modified to accept `formats` or
        # that its default behavior provides markdown, or we use a different underlying call.

        # Let's assume for now that we modify original_firecrawl_scrape_url or it implicitly returns markdown.
        # For this LangChain tool, we want to return the markdown string.
        
        # Re-evaluating: The existing `firecrawl_scrape_url` in `scraping.py` returns a dict.
        # It calls `app.ascrape_url(url=url, params=scrape_params_for_call)`
        # The `scrape_params_for_call` includes `onlyMainContent: True`.
        # The `app.ascrape_url` by default returns markdown if no specific `formats` are requested,
        # or if `formats` is not part of its `params` structure.
        # Let's assume the default from `app.ascrape_url` includes markdown or use the `data.get('markdown')`
        
        result_dict = await original_firecrawl_scrape_url(url=url, params=scrape_params) # Pass our desired params
        
        if result_dict and result_dict.get("success"):
            data = result_dict.get("data", {})
            markdown_content = data.get("markdown")
            if markdown_content:
                return str(markdown_content)
            # Fallback if markdown key is missing but data exists
            return f"Scraped data (no specific markdown found): {str(data)[:1000]}..."
        return f"Failed to scrape URL or no content: {result_dict.get('error', 'Unknown error') if result_dict else 'No response'}"
    except Exception as e:
        print(f"Error in firecrawl_scrape_url_lc_tool: {e}")
        return f"Error scraping URL {url}: {str(e)}"

# Example of how they might be used (for testing, not part of the module normally)
# async def main():
#     # Test Exa (ensure EXA_API_KEY is set)
#     exa_res = await exa_search_lc_tool.ainvoke({"query": "latest advancements in AI personal assistants"})
#     print("\n--- Exa Result ---")
#     print(exa_res)

#     # Test Perplexity (ensure PERPLEXITY_API_KEY is set)
#     pplx_res = await perplexity_search_lc_tool.ainvoke({"query": "What is the capital of France?"})
#     print("\n--- Perplexity Result ---")
#     print(pplx_res)

#     # Test Firecrawl (ensure FIRECRAWL_API_KEY is set)
#     # Be mindful of what URL you scrape; use a safe one like firecrawl.dev itself for testing.
#     firecrawl_res = await firecrawl_scrape_url_lc_tool.ainvoke({"url": "https://docs.firecrawl.dev/features/scrape"})
#     print("\n--- Firecrawl Result ---")
#     print(firecrawl_res[:500] + "...")

# if __name__ == "__main__":
#     # To run this test script:
#     # Ensure your .env loads API keys (e.g., via a main app that uses dotenv)
#     # Or set them manually in your environment for testing.
#     # Then python -m app.tools.our_langchain_tools
#     # Note: This requires the script to be runnable as a module, adjust path if needed.
#     # For simple testing, you might copy this to a test.py at project root and adjust imports.
#     asyncio.run(main()) 