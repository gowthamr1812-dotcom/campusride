from fastapi import APIRouter
from app.routers import health

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router)
