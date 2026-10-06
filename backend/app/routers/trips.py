from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.transport import (
    TripCreate, TripUpdate, TripResponse, TripListResponse
)
from app.services.transport import TripService

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.get(
    "",
    response_model=TripListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Scheduled and Active Trips",
    description="Retrieve transportation runs filtered by bus, driver, or operational state."
)
async def list_trips(
    bus_id: Optional[int] = Query(None, description="Filter by Bus ID"),
    driver_id: Optional[int] = Query(None, description="Filter by Driver ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Scheduled, Ready, Started, In Progress, Delayed, Completed, Cancelled"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = TripService.list_trips(db=db, bus_id=bus_id, driver_id=driver_id, status=status_filter)
    return TripListResponse(total=len(items), items=items)


@router.get(
    "/{trip_identifier}",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Trip Details",
    description="Retrieve single trip metadata by primary ID or Trip Code."
)
async def get_trip(
    trip_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TripService.get_trip(db=db, trip_identifier=trip_identifier)


@router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule Trip",
    description="Creates a new route run (Admin / Transport Manager only)."
)
async def create_trip(
    data: TripCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return TripService.create_trip(db=db, data=data)


@router.post(
    "/{trip_identifier}/check",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Complete Pre-Trip Vehicle Check",
    description="Driver records that safety checklist has been verified before departure."
)
async def complete_vehicle_check(
    trip_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    return TripService.complete_vehicle_check(db=db, trip_id=trip_identifier)


@router.post(
    "/{trip_identifier}/start",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="Start Trip",
    description="Transitions trip to Started / In Progress and marks the bus as Running."
)
async def start_trip(
    trip_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    return TripService.start_trip(db=db, trip_id=trip_identifier)


@router.post(
    "/{trip_identifier}/end",
    response_model=TripResponse,
    status_code=status.HTTP_200_OK,
    summary="End Trip",
    description="Marks the run as Completed and sets the bus status to Stopped."
)
async def end_trip(
    trip_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    return TripService.end_trip(db=db, trip_id=trip_identifier)
