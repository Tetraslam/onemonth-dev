import hashlib
import hmac
import json
import logging
import os
from datetime import datetime

from app.db.supabase_client import supabase
from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from starlette.requests import ClientDisconnect

router = APIRouter()

POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET", "")

@router.post("/polar", status_code=204)
async def polar_webhook(request: Request, polar_signature: str = Header(None)):
    logger = logging.getLogger(__name__)
    
    try:
        payload = await request.body()
    except ClientDisconnect:
        # Polar closed the connection before sending a body; treat as success
        return Response(status_code=204)
    
    # If secret configured verify signature
    if POLAR_WEBHOOK_SECRET:
        if not polar_signature:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing signature")
        computed = hmac.new(POLAR_WEBHOOK_SECRET.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(computed, polar_signature):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid signature")
    
    try:
        data = json.loads(payload.decode())
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    # Log the webhook data to understand structure
    logger.info(f"Polar webhook received: {json.dumps(data, indent=2)}")
    print(f"Polar webhook received: {json.dumps(data, indent=2)}")
    
    event = data.get("type")
    event_data = data.get("data", {})
    
    # Extract user information
    user_id = None
    customer_email = None
    customer_id = None
    
    # Handle checkout.completed event
    if event == "checkout.completed":
        logger.info(f"Processing checkout.completed event")
        
        # Get user_id from customer_external_id first
        user_id = event_data.get("customer_external_id")
        logger.info(f"customer_external_id: {user_id}")
        
        # If not found, try metadata
        if not user_id:
            metadata = event_data.get("metadata", {})
            user_id = metadata.get("user_id") or metadata.get("external_customer_id")
            logger.info(f"metadata user_id: {user_id}")
        
        customer_email = event_data.get("customer_email")
        customer_id = event_data.get("customer_id")
        
        logger.info(f"Extracted - user_id: {user_id}, email: {customer_email}, customer_id: {customer_id}")
        
        if user_id:
            try:
                # Create or update subscription status
                result = supabase.table("subscription_status").upsert({
                    "user_id": user_id,
                    "status": "active",
                    "customer_id": customer_id,
                    "updated_at": datetime.utcnow().isoformat()
                }).execute()
                logger.info(f"Activated subscription for user {user_id} after checkout - Result: {result}")
                print(f"Activated subscription for user {user_id} after checkout")
            except Exception as e:
                logger.error(f"Error updating subscription after checkout: {e}")
                print(f"Error updating subscription after checkout: {e}")
        else:
            logger.warning("No user_id found in checkout.completed event")
    
    # Handle subscription events
    elif event in ["subscription.created", "subscription.updated", "subscription.cancelled", "subscription.revoked"]:
        logger.info(f"Processing {event} event")
        
        # Try to get user_id from metadata first (most reliable)
        metadata = event_data.get("metadata", {})
        user_id = metadata.get("user_id")
        logger.info(f"metadata user_id: {user_id}")
        
        # If not in metadata, try customer.external_id
        if not user_id and "customer" in event_data:
            customer_data = event_data["customer"]
            customer_id = customer_data.get("id")
            customer_email = customer_data.get("email")
            # The field is external_id, not external_customer_id
            external_id = customer_data.get("external_id")
            if external_id:
                user_id = external_id
                logger.info(f"customer external_id: {user_id}")
        
        # If we still don't have user_id and have email, try email lookup
        if not user_id and customer_email:
            try:
                # Look up user by email in auth.users
                users_response = supabase.from_("users").select("id").eq("email", customer_email).execute()
                if users_response.data and len(users_response.data) > 0:
                    user_id = users_response.data[0]["id"]
                    logger.info(f"Found user by email lookup: {user_id}")
            except Exception as e:
                logger.error(f"Error looking up user by email: {e}")
                print(f"Error looking up user by email: {e}")
        
        # Determine the status
        status_value = None
        if event == "subscription.created" or (event == "subscription.updated" and event_data.get("status") == "active"):
            status_value = "active"
        elif event in ["subscription.cancelled", "subscription.revoked"]:
            status_value = "cancelled"
        
        logger.info(f"Final extracted - user_id: {user_id}, status: {status_value}, customer_id: {customer_id}")
        
        # Update subscription status if we have user_id
        if user_id and status_value:
            try:
                result = supabase.table("subscription_status").upsert({
                    "user_id": user_id,
                    "status": status_value,
                    "customer_id": customer_id,
                    "updated_at": datetime.utcnow().isoformat()
                }).execute()
                logger.info(f"Updated subscription status for user {user_id} to {status_value} - Result: {result}")
                print(f"Updated subscription status for user {user_id} to {status_value}")
            except Exception as e:
                logger.error(f"Error updating subscription status: {e}")
                print(f"Error updating subscription status: {e}")
        else:
            logger.warning(f"Missing data - user_id: {user_id}, status_value: {status_value}")
    
    # Handle customer events
    elif event in ["customer.created", "customer.updated"]:
        # Extract customer data
        customer_data = event_data
        customer_id = customer_data.get("id")
        customer_email = customer_data.get("email")
        external_id = customer_data.get("external_customer_id")
        
        # If external_customer_id is set, that's our user_id
        if external_id:
            user_id = external_id
            try:
                # Update customer_id in subscription_status
                existing = supabase.table("subscription_status").select("*").eq("user_id", user_id).maybe_single().execute()
                if existing.data:
                    supabase.table("subscription_status").update({
                        "customer_id": customer_id,
                        "updated_at": datetime.utcnow().isoformat()
                    }).eq("user_id", user_id).execute()
                else:
                    supabase.table("subscription_status").insert({
                        "user_id": user_id,
                        "status": "none",
                        "customer_id": customer_id,
                        "updated_at": datetime.utcnow().isoformat()
                    }).execute()
                print(f"Updated customer_id for user {user_id}")
            except Exception as e:
                print(f"Error updating customer data: {e}")
    
    return Response(status_code=204)

@router.post("/polar/test-activation")
async def test_activation(user_id: str, customer_id: str = "test_customer"):
    """Test endpoint to manually activate a subscription."""
    try:
        result = supabase.table("subscription_status").upsert({
            "user_id": user_id,
            "status": "active", 
            "customer_id": customer_id,
            "updated_at": datetime.utcnow().isoformat()
        }).execute()
        return {"success": True, "result": result.data}
    except Exception as e:
        return {"success": False, "error": str(e)} 