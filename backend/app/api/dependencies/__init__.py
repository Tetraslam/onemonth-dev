from datetime import datetime

import httpx
from app.core.auth import get_current_user
from app.core.config import settings
from app.db.supabase_client import supabase
from app.models.user import AuthenticatedUser
from fastapi import Depends, HTTPException, status


async def require_subscription(user: AuthenticatedUser = Depends(get_current_user)):
    # 1. Check DB first
    try:
        res = supabase.table("subscription_status").select("status").eq("user_id", str(user.id)).maybe_single().execute()
        if res and getattr(res, 'data', None) and res.data.get('status') == 'active':
            return user
    except Exception:
        pass # Fallback to Polar API check

    # 2. Check Polar API
    if not settings.polar_access_token:
        raise HTTPException(status_code=500, detail="Polar not configured")
    
    try:
        async with httpx.AsyncClient() as client:
            customers_response = await client.get("https://api.polar.sh/v1/customers", headers={"Authorization": f"Bearer {settings.polar_access_token}"}, params={"email": user.email}, follow_redirects=True)
            if customers_response.status_code == 200:
                customers_data = customers_response.json()
                if customers_data.get("items"):
                    customer_id = customers_data["items"][0]["id"]
                    subs_response = await client.get("https://api.polar.sh/v1/subscriptions", headers={"Authorization": f"Bearer {settings.polar_access_token}"}, params={"customer_id": customer_id, "status": "active"}, follow_redirects=True)
                    if subs_response.status_code == 200 and subs_response.json().get("items"):
                        # Update DB for next time
                        supabase.table("subscription_status").upsert({"user_id": str(user.id), "status": "active", "customer_id": customer_id}).execute()
                        return user
    except Exception as e:
        print(f"Polar check failed in require_subscription: {e}")

    raise HTTPException(status_code=403, detail="Active subscription required.") 