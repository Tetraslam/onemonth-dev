from app.core.auth import get_current_user
from app.models.user import AuthenticatedUser
from fastapi import Depends, HTTPException, status


def require_subscription(user: AuthenticatedUser = Depends(get_current_user)):
    meta = user.user_metadata or {}
    if meta.get('subscription_status') != 'active':
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail='Subscription required')
    return user 