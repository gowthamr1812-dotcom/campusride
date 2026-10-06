from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.people import (
    BusInchargeCreate, BusInchargeUpdate, BusInchargeResponse, BusInchargeListResponse
)
from app.services.people import BusInchargeService

router = APIRouter(prefix="/incharges", tags=["Bus Incharges"])


@router.get(
    "",
    response_model=BusInchargeListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Bus Incharges",
    description="Retrieve all college Bus Incharges with optional search, status, and bus filters."
)
async def list_incharges(
    search: Optional[str] = Query(None, description="Search by name, incharge ID, employee ID, or phone"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Active, On Leave, Inactive)"),
    bus: Optional[str] = Query(None, description="Filter by assigned bus"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = BusInchargeService.list_incharges(db=db, search=search, status=status_filter, bus=bus)
    return BusInchargeListResponse(total=len(items), items=items)


@router.get(
    "/{incharge_identifier}",
    response_model=BusInchargeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Bus Incharge Details",
    description="Retrieve a single Bus Incharge by primary key ID or Incharge ID (e.g., INC-001)."
)
async def get_incharge(
    incharge_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return BusInchargeService.get_incharge(db=db, incharge_identifier=incharge_identifier)


@router.post(
    "",
    response_model=BusInchargeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Bus Incharge",
    description="Registers a new Bus Incharge into the transportation platform (Admin / Transport Manager only)."
)
async def create_incharge(
    data: BusInchargeCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return BusInchargeService.create_incharge(db=db, data=data)


@router.put(
    "/{incharge_identifier}",
    response_model=BusInchargeResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Bus Incharge",
    description="Modifies Bus Incharge details or bus assignment (Admin / Transport Manager only)."
)
async def update_incharge(
    incharge_identifier: str,
    data: BusInchargeUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return BusInchargeService.update_incharge(db=db, incharge_identifier=incharge_identifier, data=data)


@router.delete(
    "/{incharge_identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete Bus Incharge",
    description="Deletes a Bus Incharge record from the platform (Admin only)."
)
async def delete_incharge(
    incharge_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    BusInchargeService.delete_incharge(db=db, incharge_identifier=incharge_identifier)
    return {"success": True, "message": f"Bus Incharge '{incharge_identifier}' deleted successfully."}
