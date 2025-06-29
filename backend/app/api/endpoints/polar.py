import hashlib
import hmac
import json
import os

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

    event = data.get("type")
    customer_id = data.get("data", {}).get("user_id") or data.get("data", {}).get("customer_id")
    if not customer_id:
        return  # Cannot identify user

    status_value = "active" if event == "subscription.created" else "cancelled" if event == "subscription.cancelled" else None
    if status_value:
        try:
            supabase.auth.admin.update_user_by_id(customer_id, {"user_metadata": {"subscription_status": status_value}})
        except Exception as e:
            print("Polar webhook update error", e)
    return 