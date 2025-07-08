import os
from typing import Optional

import httpx
from app.core.auth import get_current_user
from app.core.config import settings
from app.db.supabase_client import supabase
from app.models.user import AuthenticatedUser
from fastapi import APIRouter, Depends, HTTPException, status

router = APIRouter()

@router.post("/session")
async def create_checkout_session(
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    user: AuthenticatedUser = Depends(get_current_user)
):
    """Create a Polar checkout session for the user."""
    if not settings.polar_access_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment system not configured"
        )
    
    # Check if user already has an active subscription
    result = supabase.table("subscription_status").select("*").eq("user_id", str(user.id)).execute()
    
    if result.data and result.data[0].get("status") == "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has an active subscription"
        )
    
    # Set default URLs if not provided
    if not success_url:
        success_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/payment-success"
    if not cancel_url:
        cancel_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:5173')}/dashboard"
    
    async with httpx.AsyncClient() as client:
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            # Log the request details
            logger.info(f"Creating checkout session for user {user.id}")
            logger.info(f"Product ID: {settings.polar_product_id}")
            logger.info(f"Success URL: {success_url}")
            
            # Create checkout session with Polar API
            response = await client.post(
                "https://api.polar.sh/v1/checkouts/",
                headers={
                    "Authorization": f"Bearer {settings.polar_access_token}",
                    "Content-Type": "application/json"
                },
                json={
                    "products": [settings.polar_product_id],
                    "success_url": success_url,
                    "metadata": {
                        "user_id": str(user.id)
                    },
                    "customer_email": user.email,
                    "customer_external_id": str(user.id),
                    "allow_discount_codes": True,
                    "customer_billing_address": {
                        "country": "US"
                    }
                },
                timeout=30.0,
                follow_redirects=True
            )
            
            if response.status_code != 201:
                logger.error(f"Failed to create checkout session: {response.status_code} - {response.text}")
                logger.error(f"Response headers: {response.headers}")
                
                # Check if it's a redirect issue
                if response.status_code in [301, 302, 307, 308]:
                    logger.error(f"Redirect location: {response.headers.get('location')}")
                
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create checkout session"
                )
            
            data = response.json()
            return {"url": data.get("url")}
            
        except httpx.RequestError as e:
            logger.error(f"Request error creating checkout session: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create checkout session"
            ) 