from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.transport import (
    BusCreate, BusUpdate, BusResponse, BusListResponse, BusSummaryResponse, BusSeatResponse
)
from app.services.transport import BusService, SeatService

router = APIRouter(prefix="/buses", tags=["Buses"])


@router.get(
    "/summary",
    response_model=BusSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Fleet Operational Summary",
    description="Returns aggregate counts of buses across all operational states."
)
async def get_bus_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BusService.get_bus_summary(db=db)


@router.get(
    "",
    response_model=BusListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Fleet Buses",
    description="Retrieve all college buses with driver/incharge assignments, routes, telematics status, and occupancy."
)
async def list_buses(
    search: Optional[str] = Query(None, description="Search by bus number (BUS-01), registration, or GPS ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Running, Delayed, Stopped, Offline, Maintenance"),
    route_id: Optional[int] = Query(None, description="Filter by assigned route ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    buses = BusService.list_buses(db=db, search=search, status=status_filter, route_id=route_id)
    items = []
    for b in buses:
        # Calculate seat occupancy count
        occupancy = len([s for s in b.seats if s.status == "Assigned"])
        pct = round((occupancy / b.capacity) * 100, 1) if b.capacity > 0 else 0.0
        
        resp = BusResponse.model_validate(b)
        resp.occupancy_count = occupancy
        resp.occupancy_percentage = pct
        items.append(resp)

    return BusListResponse(total=len(items), items=items)


@router.get(
    "/{bus_identifier}",
    response_model=BusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Bus Details",
    description="Retrieve comprehensive details for a specific bus by primary ID or Bus Number (e.g., BUS-07)."
)
async def get_bus(
    bus_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bus = BusService.get_bus(db=db, bus_identifier=bus_identifier)
    occupancy = len([s for s in bus.seats if s.status == "Assigned"])
    pct = round((occupancy / bus.capacity) * 100, 1) if bus.capacity > 0 else 0.0
    
    resp = BusResponse.model_validate(bus)
    resp.occupancy_count = occupancy
    resp.occupancy_percentage = pct
    return resp


@router.get(
    "/{bus_identifier}/seats",
    response_model=List[BusSeatResponse],
    status_code=status.HTTP_200_OK,
    summary="List Bus Seats",
    description="Retrieve seat layout grid and allocation statuses for the specified bus."
)
async def get_bus_seats(
    bus_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    bus = BusService.get_bus(db=db, bus_identifier=bus_identifier)
    seats = SeatService.list_seats(db=db, bus_id=bus.id)
    return [BusSeatResponse.model_validate(s) for s in seats]


@router.post(
    "",
    response_model=BusResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Bus",
    description="Adds a new bus to the college fleet (Admin / Transport Manager only)."
)
async def create_bus(
    data: BusCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    bus = BusService.create_bus(db=db, data=data)
    resp = BusResponse.model_validate(bus)
    resp.occupancy_count = 0
    resp.occupancy_percentage = 0.0
    return resp


@router.put(
    "/{bus_identifier}",
    response_model=BusResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Bus",
    description="Modifies vehicle details or allocations (Admin / Transport Manager only)."
)
async def update_bus(
    bus_identifier: str,
    data: BusUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    bus = BusService.update_bus(db=db, bus_identifier=bus_identifier, data=data)
    occupancy = len([s for s in bus.seats if s.status == "Assigned"])
    pct = round((occupancy / bus.capacity) * 100, 1) if bus.capacity > 0 else 0.0
    resp = BusResponse.model_validate(bus)
    resp.occupancy_count = occupancy
    resp.occupancy_percentage = pct
    return resp


@router.delete(
    "/{bus_identifier}",
    status_code=status.HTTP_200_OK,
    summary="Decommission Bus",
    description="Removes a bus from the active fleet (Admin only)."
)
async def delete_bus(
    bus_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    BusService.delete_bus(db=db, bus_identifier=bus_identifier)
    return {"success": True, "message": f"Bus '{bus_identifier}' removed successfully."}
