# API endpoints 
from fastapi import APIRouter

from . import chat, checkout, curricula, polar

api_router = APIRouter()
api_router.include_router(curricula.router, prefix="/curricula", tags=["curricula"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(checkout.router, prefix="/checkout", tags=["checkout"])
api_router.include_router(polar.router, tags=["polar"]) 