from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.transport import (
    RouteCreate, RouteUpdate, RouteResponse, RouteListResponse,
    RouteStopCreate, RouteStopResponse
)
from app.services.transport import RouteService

router = APIRouter(prefix="/routes", tags=["Routes"])


@router.get(
    "",
    response_model=RouteListResponse,
    status_code=status.HTTP_200_OK,
    summary="List College Routes",
    description="Retrieve all college transport routes with ordered stops, sequence, and timetables."
)
async def list_routes(
    search: Optional[str] = Query(None, description="Search route code (R-01) or name"),
    status_filter: Optional[str] = Query(None, alias="status", description="Active, Inactive"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = RouteService.list_routes(db=db, search=search, status=status_filter)
    return RouteListResponse(total=len(items), items=items)


@router.get(
    "/{route_identifier}",
    response_model=RouteResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Route Details",
    description="Retrieve route geometry and full stop sequence by ID or Code (e.g. R-01)."
)
async def get_route(
    route_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return RouteService.get_route(db=db, route_identifier=route_identifier)


@router.post(
    "",
    response_model=RouteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Route",
    description="Defines a new transport route (Admin / Transport Manager only)."
)
async def create_route(
    data: RouteCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return RouteService.create_route(db=db, data=data)


@router.put(
    "/{route_identifier}",
    response_model=RouteResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Route",
    description="Modifies route details (Admin / Transport Manager only)."
)
async def update_route(
    route_identifier: str,
    data: RouteUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return RouteService.update_route(db=db, route_identifier=route_identifier, data=data)


@router.post(
    "/{route_id}/stops",
    response_model=RouteStopResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Stop to Route",
    description="Appends a new stop with sequence and expected arrival time."
)
async def add_stop(
    route_id: int,
    data: RouteStopCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    data.route_id = route_id
    return RouteService.add_stop(db=db, route_id=route_id, data=data)


@router.delete(
    "/stops/{stop_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete Route Stop",
    description="Removes a stop from a route."
)
async def delete_stop(
    stop_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    RouteService.delete_stop(db=db, stop_id=stop_id)
    return {"success": True, "message": f"Stop {stop_id} deleted successfully."}
