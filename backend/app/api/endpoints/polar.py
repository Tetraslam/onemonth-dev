import hashlib
import hmac
import json
import os
from datetime import datetime

from app.db.supabase_client import supabase
from fastapi import APIRouter, Header, HTTPException, Request, Response, status
from starlette.requests import ClientDisconnect

router = APIRouter()

POLAR_WEBHOOK_SECRET = os.getenv("POLAR_WEBHOOK_SECRET", "")

@router.post("/polar", status_code=204)
async def polar_webhook(request: Request, polar_signature: str = Header(None)):
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
    print(f"Polar webhook received: {json.dumps(data, indent=2)}")
    
    event = data.get("type")
    event_data = data.get("data", {})
    
    # Try multiple fields to find the user identifier
    customer_email = None
    customer_id = None
    
    # Check for email in various locations
    if "customer" in event_data:
        customer_email = event_data["customer"].get("email")
        customer_id = event_data["customer"].get("id")
    elif "email" in event_data:
        customer_email = event_data["email"]
    elif "user" in event_data:
        customer_email = event_data["user"].get("email")
        customer_id = event_data["user"].get("id")
    
    # Fallback to old fields
    if not customer_email and not customer_id:
        customer_id = event_data.get("user_id") or event_data.get("customer_id")
    
    print(f"Extracted - Email: {customer_email}, ID: {customer_id}, Event: {event}")
    
    if not customer_email and not customer_id:
        print("Cannot identify user from webhook data")
        return Response(status_code=204)  # Return success anyway

    status_value = None
    if event in ["subscription.created", "subscription.updated"] and event_data.get("status") == "active":
        status_value = "active"
    elif event == "subscription.cancelled":
        status_value = "cancelled"
    
    if status_value:
        try:
            # Try to find user by email first
            if customer_email:
                # Get user by email
                users_response = supabase.from_("users").select("id").eq("email", customer_email).execute()
                if users_response.data and len(users_response.data) > 0:
                    user_id = users_response.data[0]["id"]
                    # Update subscription status in table
                    supabase.table("subscription_status").upsert({
                        "user_id": user_id,
                        "status": status_value,
                        "customer_id": customer_id,
                        "updated_at": datetime.utcnow().isoformat()
                    }).execute()
                    print(f"Updated subscription_status table for user {user_id} to {status_value}")
                else:
                    print(f"No user found with email {customer_email}")
            elif customer_id:
                # If we only have customer_id, we can't update the table without user_id
                print(f"Have customer_id {customer_id} but no user_id to update subscription_status table")
        except Exception as e:
            print(f"Polar webhook update error: {e}")
    
    return Response(status_code=204) 