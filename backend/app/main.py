from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, check_db_connection
from app.core.exceptions import (
    CampusRideException,
    campusride_exception_handler,
    global_exception_handler,
)
from app.routers.api import api_router
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.seed.seed_fleet import seed_fleet

# Configure structured logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("campusride.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    logger.info("Initializing %s v%s in %s mode...", settings.PROJECT_NAME, settings.VERSION, settings.ENVIRONMENT)
    db_ok = check_db_connection()
    if db_ok:
        logger.info("Database connection successfully established.")
        # Ensure schema tables exist and seed demo users for all 5 roles
        try:
            Base.metadata.create_all(bind=engine)
            seed_default_users()
            seed_people()
            seed_transport()
            seed_attendance()
            seed_finance()
            seed_fleet()
            logger.info("Database models initialized and default users, people, transport, attendance, finance, and fleet seeded.")
        except Exception as e:
            logger.error(f"Error during database startup initialization: {e}")
    else:
        logger.warning("Database connection failed or not yet reachable.")
    yield
    # Shutdown sequence
    logger.info("Shutting down %s...", settings.PROJECT_NAME)


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="CampusRide Enterprise College Transportation Management Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Configure CORS
origins = settings.BACKEND_CORS_ORIGINS
if isinstance(origins, list):
    cors_origins = [str(origin) for origin in origins]
else:
    cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register custom exception handlers
app.add_exception_handler(CampusRideException, campusride_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Top-level WebSocket mount for live telematics stream
from app.routers.tracking import websocket_tracking_endpoint
app.add_api_websocket_route("/ws/tracking", websocket_tracking_endpoint)


@app.get("/", tags=["Root"])
async def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "documentation": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
