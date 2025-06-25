import traceback
from typing import Any, Dict, Optional

from app.db.supabase_client import supabase
from app.models.user import AuthenticatedUser
from fastapi import HTTPException, Request, status

# Correctly attempt to import AuthApiError for Supabase/GoTrue auth errors
try:
    from gotrue.errors import AuthApiError
except ImportError:
    print("[AUTH DEBUG] gotrue.errors.AuthApiError not found. Supabase auth error handling will use a generic Exception for GoTrue errors.")
    # Fallback to generic Exception if AuthApiError is not available in the installed gotrue version
    AuthApiError = Exception 


async def get_current_user(request: Request) -> AuthenticatedUser:
    """Get the current authenticated user from Supabase auth token (header or query param)."""
    print(f"---- [AUTH DEBUG] get_current_user called for path: {request.url.path} ----")
    token: Optional[str] = None
    auth_header = request.headers.get("Authorization")
    print(f"[AUTH DEBUG] Raw Authorization header: {auth_header}")

    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        print(f"[AUTH DEBUG] Token found in Authorization header.")
    else:
        print("[AUTH DEBUG] Authorization header missing or not Bearer. Checking query parameters for 'token'...")
        token = request.query_params.get("token")
        if token:
            print(f"[AUTH DEBUG] Token found in query parameters.")
        else:
            print("[AUTH DEBUG] Token not found in header or query parameters.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token in header or query parameter",
                headers={"WWW-Authenticate": "Bearer"},
            )

    if not token:
        print("[AUTH DEBUG] Token is effectively empty.") # Should be caught by above
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Empty token provided",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    print(f"[AUTH DEBUG] Extracted token (first 20 chars): {token[:20]}...")

    try:
        print("[AUTH DEBUG] Calling supabase.auth.get_user(token)...")
        user_response = supabase.auth.get_user(token)
        
        # Check presence of user and error attributes more safely
        has_user = hasattr(user_response, 'user') and user_response.user is not None
        has_error = hasattr(user_response, 'error') and user_response.error is not None
        print(f"[AUTH DEBUG] Supabase auth.get_user response: User present: {has_user}, Error present: {has_error}")

        if has_error: # If an error attribute exists and is not None
            error_obj = user_response.error
            error_message = str(error_obj)
            error_status = getattr(error_obj, 'status', status.HTTP_401_UNAUTHORIZED)
            if not isinstance(error_status, int):
                 error_status = status.HTTP_401_UNAUTHORIZED

            print(f"[AUTH DEBUG] Supabase auth.get_user returned an error object: {error_message} (Status: {error_status})")
            raise HTTPException(
                status_code=error_status,
                detail=f"Token validation error: {error_message}"
            )

        if not has_user: # If no error, user must be present
            print("[AUTH DEBUG] No error from Supabase, but no user object returned.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token or user not found (no user data after successful call)",
            )
        
        user_obj = user_response.user
        if not all(hasattr(user_obj, attr) and getattr(user_obj, attr) is not None for attr in ['id', 'email']):
            print(f"[AUTH DEBUG] User data from token is incomplete. ID: {getattr(user_obj, 'id', 'MISSING')}, Email: {getattr(user_obj, 'email', 'MISSING')}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User data from token is incomplete",
            )

        print(f"[AUTH DEBUG] User successfully authenticated: {user_obj.email} (ID: {user_obj.id})")
        return AuthenticatedUser(
            id=user_obj.id, 
            email=user_obj.email, 
            metadata=user_obj.user_metadata or {}
        )
    # Specific handling for GoTrue/Auth API errors
    except AuthApiError as e: 
        error_status = getattr(e, 'status', status.HTTP_401_UNAUTHORIZED)
        if not isinstance(error_status, int):
            error_status = status.HTTP_401_UNAUTHORIZED
        error_message = getattr(e, 'message', str(e))
        print(f"[AUTH DEBUG] GoTrue AuthApiError in get_current_user: Status: {error_status}, Message: {error_message}")
        raise HTTPException(
            status_code=error_status,
            detail=f"Token validation failed (Auth Error): {error_message}",
        )
    # Re-raise HTTPExceptions that might have been raised within the try block (e.g., from error checks)
    except HTTPException as e:
        raise e
    # Catch any other unexpected exceptions during the auth process
    except Exception as e:
        print(f"[AUTH DEBUG] Generic exception in get_current_user: {type(e).__name__} - {str(e)}")
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token (Unexpected error: {type(e).__name__})",
        )


async def get_current_user_optional(request: Request) -> Optional[AuthenticatedUser]:
    """Get the current user if authenticated, otherwise return None."""
    try:
        return await get_current_user(request)
    except HTTPException:
        return None 