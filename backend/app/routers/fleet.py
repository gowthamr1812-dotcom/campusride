from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.user import User, UserRole
from app.models.people import Driver
from app.schemas.fleet import (
    MaintenanceLogCreate,
    MaintenanceLogUpdate,
    MaintenanceLogResponse,
    MaintenanceLogListResponse,
    FuelLogCreate,
    FuelLogResponse,
    FuelLogListResponse,
    VehicleDocumentCreate,
    VehicleDocumentUpdate,
    VehicleDocumentResponse,
    VehicleDocumentListResponse,
    FleetSummaryResponse
)
from app.services.fleet import (
    MaintenanceService,
    FuelService,
    DocumentService,
    FleetSummaryService
)

router = APIRouter(tags=["Fleet"])


# --- Fleet Summary Endpoints ---

@router.get(
    "/fleet/summary",
    response_model=FleetSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Fleet Operational Health & Compliance Summary",
    description="Aggregate metrics on maintenance expenditure, fuel consumption, and compliance documents."
)
async def get_fleet_summary(
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return FleetSummaryService.get_summary(db=db)


# --- Maintenance / Services Endpoints ---

@router.get(
    "/services",
    response_model=MaintenanceLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Maintenance Logs & Work Orders",
    description="Retrieves vehicle repair logs, scheduled servicing, and issue tickets."
)
async def list_maintenance_logs(
    bus_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    priority_filter: Optional[str] = Query(None, alias="priority"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    items = MaintenanceService.list_maintenance_logs(
        db=db,
        bus_id=bus_id,
        status=status_filter,
        priority=priority_filter
    )
    return MaintenanceLogListResponse(total=len(items), items=items)


@router.post(
    "/services",
    response_model=MaintenanceLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Work Order or Report Vehicle Issue",
    description="Logs a maintenance event (Admins, Managers, or Drivers reporting vehicle checks)."
)
async def create_maintenance_log(
    data: MaintenanceLogCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    # If Driver, attach their driver_id automatically
    if current_user.role == UserRole.DRIVER and not data.driver_id:
        drv = db.query(Driver).filter(
            (Driver.user_id == current_user.id) | (Driver.driver_id == current_user.username)
        ).first()
        if drv:
            data.driver_id = drv.id

    return MaintenanceService.create_maintenance_log(
        db=db,
        data=data,
        reported_by_user_id=current_user.id
    )


@router.put(
    "/services/{log_id}",
    response_model=MaintenanceLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Maintenance Log",
    description="Modifies repair status, cost, vendor, or marks work order completed."
)
async def update_maintenance_log(
    log_id: int,
    data: MaintenanceLogUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return MaintenanceService.update_maintenance_log(db=db, log_id=log_id, data=data)


# --- Fuel / Diesel Logging Endpoints ---

@router.get(
    "/fuel",
    response_model=FuelLogListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Fuel / Diesel Logs",
    description="Retrieves diesel filling transactions, fuel telemetry, and odometer readings."
)
async def list_fuel_logs(
    bus_id: Optional[int] = Query(None),
    driver_id: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    items = FuelService.list_fuel_logs(
        db=db,
        bus_id=bus_id,
        driver_id=driver_id,
        start_date=start_date,
        end_date=end_date
    )
    return FuelLogListResponse(total=len(items), items=items)


@router.post(
    "/fuel",
    response_model=FuelLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record Diesel Fill",
    description="Logs fuel filling, updates fuel tank gauge percentage and vehicle odometer."
)
async def record_fuel_log(
    data: FuelLogCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER])),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.DRIVER and not data.driver_id:
        drv = db.query(Driver).filter(
            (Driver.user_id == current_user.id) | (Driver.driver_id == current_user.username)
        ).first()
        if drv:
            data.driver_id = drv.id

    return FuelService.record_fuel_log(
        db=db,
        data=data,
        recorded_by_user_id=current_user.id
    )


# --- Vehicle Compliance Documents Endpoints ---

@router.get(
    "/documents",
    response_model=VehicleDocumentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Vehicle Compliance Documents",
    description="Retrieves RC, Insurance, Fitness Certificate (FC), and PUC permits with expiry tracking."
)
async def list_documents(
    bus_id: Optional[int] = Query(None),
    document_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    items = DocumentService.list_documents(
        db=db,
        bus_id=bus_id,
        document_type=document_type,
        status=status_filter
    )
    return VehicleDocumentListResponse(total=len(items), items=items)


@router.post(
    "/documents",
    response_model=VehicleDocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Compliance Document",
    description="Adds a new government certificate or insurance policy to a bus."
)
async def create_document(
    data: VehicleDocumentCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return DocumentService.create_document(db=db, data=data)


@router.put(
    "/documents/{doc_id}",
    response_model=VehicleDocumentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Compliance Document",
    description="Updates certificate number or renews validity expiry date."
)
async def update_document(
    doc_id: int,
    data: VehicleDocumentUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return DocumentService.update_document(db=db, doc_id=doc_id, data=data)
