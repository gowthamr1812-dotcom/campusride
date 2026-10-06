from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.transport import BusSeatResponse, SeatAssignmentRequest
from app.services.transport import SeatService

router = APIRouter(prefix="/seats", tags=["Seats"])


@router.get(
    "",
    response_model=List[BusSeatResponse],
    status_code=status.HTTP_200_OK,
    summary="List Seats by Bus",
    description="Retrieve all seat grids and occupancy details for a specified bus ID."
)
async def list_seats(
    bus_id: int = Query(..., description="Target Bus primary key ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    seats = SeatService.list_seats(db=db, bus_id=bus_id)
    return [BusSeatResponse.model_validate(s) for s in seats]


@router.post(
    "/assign",
    response_model=BusSeatResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign Student to Seat",
    description="Assigns a student passenger to a specific bus seat, strictly protected by DB unique constraints."
)
async def assign_seat(
    bus_id: int = Query(..., description="Target Bus ID"),
    assignment: SeatAssignmentRequest = ...,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    seat = SeatService.assign_seat(
        db=db,
        bus_id=bus_id,
        seat_number=assignment.seat_number,
        student_id=assignment.student_id
    )
    return BusSeatResponse.model_validate(seat)


@router.put(
    "/status",
    response_model=BusSeatResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Seat Status",
    description="Sets seat state to Available, Reserved, Blocked, or Maintenance."
)
async def update_seat_status(
    bus_id: int = Query(..., description="Target Bus ID"),
    seat_number: str = Query(..., description="Seat designation (e.g. 01A)"),
    status: str = Query(..., description="Available, Reserved, Blocked, Maintenance"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    seat = SeatService.update_seat_status(
        db=db,
        bus_id=bus_id,
        seat_number=seat_number,
        status=status
    )
    return BusSeatResponse.model_validate(seat)
