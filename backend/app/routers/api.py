from fastapi import APIRouter
from app.routers import health, auth, drivers, incharges, students

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(drivers.router)
api_router.include_router(incharges.router)
api_router.include_router(students.router)
