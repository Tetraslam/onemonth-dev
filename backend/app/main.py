from contextlib import asynccontextmanager
from typing import Optional

import redis.asyncio as redis
from app.api.endpoints import polar  # New: webhook endpoint
from app.api.endpoints import (auth, chat, checkout, curricula, logbook,
                               notifications, practice, users)
from app.core.config import settings
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import RedirectResponse

# Global Redis client
redis_client: Optional[redis.Redis] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan events."""
    # Startup
    global redis_client
    redis_client = redis.from_url(settings.redis_url, decode_responses=True)
    
    # Initialize Sentry if configured
    if settings.sentry_dsn:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
        sentry_sdk.init(dsn=settings.sentry_dsn, environment=settings.environment)
    
    yield
    
    # Shutdown
    if redis_client:
        await redis_client.close()


# Create FastAPI app
app = FastAPI(
    title="OneMonth.dev API",
    description="The Cursor for AI-powered learning",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Add TrustedHost middleware to handle proxy headers
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["api.onemonth.dev", "localhost", "127.0.0.1", "*.railway.app"]
)

# Add middleware to handle HTTPS redirects properly
@app.middleware("http")
async def ensure_https_redirects(request: Request, call_next):
    # Get the forwarded proto header to detect if original request was HTTPS
    forwarded_proto = request.headers.get("x-forwarded-proto", "http")
    
    # Store the original URL scheme
    request.scope["scheme"] = forwarded_proto
    
    response = await call_next(request)
    
    # If it's a redirect response and we're in production, ensure it uses HTTPS
    if response.status_code in (301, 302, 303, 307, 308) and forwarded_proto == "https":
        if hasattr(response, "headers") and "location" in response.headers:
            location = response.headers["location"]
            # If the location starts with http://, replace with https://
            if location.startswith("http://"):
                response.headers["location"] = location.replace("http://", "https://", 1)
    
    return response

# Configure CORS
# Ensure this uses the parsed list from settings
allowed_origins = settings.cors_origins_list
if not allowed_origins: # Fallback if the list is somehow empty after parsing
    print("Warning: CORS origins list is empty, falling back to default localhost:5173")
    allowed_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins, # Use the parsed list
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods
    allow_headers=["*"], # Allows all headers
    # expose_headers=["*"], # Exposing all headers might be too permissive for production
                               # For streaming, specific headers like 'Content-Type' are usually enough
                               # if needed. Often not required if allow_origins is correct.
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(curricula.router, prefix="/api/curricula", tags=["curricula"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])
app.include_router(checkout.router, prefix="/api/checkout", tags=["checkout"])
app.include_router(logbook.router, prefix="/api/logbook", tags=["logbook"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
app.include_router(practice.router, prefix="/api/practice", tags=["practice"])
app.include_router(polar.router, prefix="/api/webhooks", tags=["webhooks"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "environment": settings.environment,
        "version": "1.0.0"
    }


# Redirect any mistaken backend success URL to frontend
@app.get("/api/payment-success")
async def payment_success_redirect(checkout_id: str | None = None, customer_session_token: str | None = None):
    # Preserve query params
    query = []
    if checkout_id:
        query.append(f"checkout_id={checkout_id}")
    if customer_session_token:
        query.append(f"customer_session_token={customer_session_token}")
    qs = "&".join(query)
    url = f"https://onemonth.dev/payment-success"
    if qs:
        url += f"?{qs}"
    return RedirectResponse(url)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.environment == "development" else False
    ) 