from fastapi import APIRouter
from app.routers import (
    health, auth, drivers, incharges, students,
    buses, routes, seats, trips, attendance, finance, fleet, tracking, safety
)

api_router = APIRouter()

# Register modular sub-routers
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(drivers.router)
api_router.include_router(incharges.router)
api_router.include_router(students.router)
api_router.include_router(buses.router)
api_router.include_router(routes.router)
api_router.include_router(seats.router)
api_router.include_router(trips.router)
api_router.include_router(attendance.router)
api_router.include_router(finance.router)
api_router.include_router(fleet.router)
api_router.include_router(tracking.router)
api_router.include_router(safety.router)
