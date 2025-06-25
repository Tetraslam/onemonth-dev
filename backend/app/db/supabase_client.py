from app.core.config import settings
from supabase import Client, create_client


def get_supabase_client() -> Client:
    """Get Supabase client with service key for server-side operations."""
    return create_client(settings.supabase_url, settings.supabase_service_key)


def get_supabase_anon_client() -> Client:
    """Get Supabase client with anon key for client-side operations."""
    return create_client(settings.supabase_url, settings.supabase_anon_key)


# Initialize clients
supabase = get_supabase_client()
supabase_anon = get_supabase_anon_client()

# FastAPI dependency

def get_supabase():
    """FastAPI dependency that returns the primary Supabase client."""
    return supabase 