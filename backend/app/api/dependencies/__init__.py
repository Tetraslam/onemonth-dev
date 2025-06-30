from datetime import datetime

from app.core.auth import get_current_user
from app.db.supabase_client import supabase
from app.models.user import AuthenticatedUser
from fastapi import Depends, HTTPException, status


def require_subscription(user: AuthenticatedUser = Depends(get_current_user)):
    try:
        res = supabase.table("subscription_status") \
            .select("status, updated_at") \
            .eq("user_id", str(user.id)) \
            .maybe_single() \
            .execute()
        if res and getattr(res, 'data', None):
            if res.data.get('status') == 'active':
                return user
    except Exception as e:
        print(f"require_subscription DB lookup error: {e}")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Subscription required') 