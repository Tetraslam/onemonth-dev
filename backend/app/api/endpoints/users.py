from typing import Any, Dict

import httpx
from app.core.auth import get_current_user
from app.core.config import settings
from app.db.supabase_client import supabase
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

router = APIRouter()


@router.get("/me")
async def get_current_user_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Get the current user's profile."""
    return {"user": current_user}

@router.get("/me/subscription")
async def get_subscription_status(user = Depends(get_current_user)):
    """Check subscription status directly from Polar."""
    if not settings.polar_access_token:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Polar API not configured"
        )
    
    print(f"Checking subscription for user: {user['email']}")
    
    async with httpx.AsyncClient() as client:
        try:
            # Get customer ID from Polar using email
            customers_response = await client.get(
                "https://api.polar.sh/v1/customers",
                headers={"Authorization": f"Bearer {settings.polar_access_token}"},
                params={"email": user["email"]}
            )
            print(f"Polar customers API status: {customers_response.status_code}")
            customers_response.raise_for_status()
            customers_data = customers_response.json()
            print(f"Customers data: {customers_data}")
            
            if not customers_data.get("items"):
                print(f"No Polar customer found for email: {user['email']}")
                return {"status": "none", "customer_id": None}
            
            customer = customers_data["items"][0]
            customer_id = customer["id"]
            print(f"Found customer ID: {customer_id}")
            
            # Get active subscriptions for this customer
            subs_response = await client.get(
                "https://api.polar.sh/v1/subscriptions",
                headers={"Authorization": f"Bearer {settings.polar_access_token}"},
                params={"customer_id": customer_id, "status": "active"}
            )
            print(f"Polar subscriptions API status: {subs_response.status_code}")
            subs_response.raise_for_status()
            subs_data = subs_response.json()
            print(f"Subscriptions data: {subs_data}")
            
            if subs_data.get("items") and len(subs_data["items"]) > 0:
                print(f"Found active subscription for user {user['email']}")
                # Update user metadata with subscription status
                try:
                    supabase.auth.admin.update_user_by_id(
                        user["id"], 
                        {"user_metadata": {"subscription_status": "active"}}
                    )
                    print("Updated user metadata with active subscription")
                except Exception as e:
                    print(f"Failed to update user metadata: {e}")
                
                return {"status": "active", "customer_id": customer_id}
            else:
                print(f"No active subscription found for user {user['email']}")
                return {"status": "none", "customer_id": customer_id}
                
        except httpx.HTTPStatusError as e:
            print(f"Polar API error: {e.response.text}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to check subscription status: {str(e)}"
            )
        except Exception as e:
            print(f"Unexpected error checking Polar: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check subscription status"
            ) 