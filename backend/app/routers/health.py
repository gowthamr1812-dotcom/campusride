from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.services.health import get_system_health

router = APIRouter(prefix="/health", tags=["Health & Diagnostics"])


@router.api_route(
    "",
    methods=["GET", "HEAD"],
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="Application Health Probe",
    description="Returns detailed liveness and readiness status of CampusRide API and dependent services."
)
async def check_health() -> HealthResponse:
    return get_system_health()
