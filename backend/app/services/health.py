import time
from datetime import datetime, timezone
from app.core.config import settings
from app.core.database import check_db_connection
from app.schemas.health import HealthResponse

START_TIME = time.time()


def get_system_health() -> HealthResponse:
    """Service evaluating database connectivity and application status."""
    db_connected = check_db_connection()
    db_status = "connected" if db_connected else "disconnected"
    
    overall_status = "healthy" if db_connected else "degraded"
    
    return HealthResponse(
        status=overall_status,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
        timestamp=datetime.now(timezone.utc),
        services={
            "database": db_status,
            "api": "ready",
            "gps_simulator": "initialized"
        },
        uptime_seconds=round(time.time() - START_TIME, 2)
    )
