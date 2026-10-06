from fastapi import APIRouter
from app.routers import health, auth

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
