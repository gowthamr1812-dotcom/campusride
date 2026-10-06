from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.people import (
    DriverCreate, DriverUpdate, DriverResponse, DriverListResponse
)
from app.services.people import DriverService

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get(
    "",
    response_model=DriverListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Drivers",
    description="Retrieve all college transport drivers with optional search, status, and bus filters."
)
async def list_drivers(
    search: Optional[str] = Query(None, description="Search by name, driver ID, license, or phone"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Active, On Leave, Inactive)"),
    bus: Optional[str] = Query(None, description="Filter by assigned bus"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = DriverService.list_drivers(db=db, search=search, status=status_filter, bus=bus)
    return DriverListResponse(total=len(items), items=items)


@router.get(
    "/{driver_identifier}",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Driver Details",
    description="Retrieve a single driver by primary key ID or Driver ID (e.g., DRV-001)."
)
async def get_driver(
    driver_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return DriverService.get_driver(db=db, driver_identifier=driver_identifier)


@router.post(
    "",
    response_model=DriverResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Driver",
    description="Registers a new driver into the transportation platform (Admin / Transport Manager only)."
)
async def create_driver(
    data: DriverCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return DriverService.create_driver(db=db, data=data)


@router.put(
    "/{driver_identifier}",
    response_model=DriverResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Driver",
    description="Modifies driver details or operational assignment (Admin / Transport Manager only)."
)
async def update_driver(
    driver_identifier: str,
    data: DriverUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return DriverService.update_driver(db=db, driver_identifier=driver_identifier, data=data)


@router.delete(
    "/{driver_identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete Driver",
    description="Deletes a driver record from the platform (Admin only)."
)
async def delete_driver(
    driver_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    DriverService.delete_driver(db=db, driver_identifier=driver_identifier)
    return {"success": True, "message": f"Driver '{driver_identifier}' deleted successfully."}
