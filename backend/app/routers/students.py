from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.people import (
    StudentCreate, StudentUpdate, StudentResponse, StudentListResponse
)
from app.services.people import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


@router.get(
    "",
    response_model=StudentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Students (Privacy-Enforced)",
    description=(
        "Retrieves student records with pagination and filters. "
        "Strictly privacy-gated: Students receive only their own record; "
        "Bus Incharges receive only students assigned to their designated bus; "
        "Drivers cannot view private rosters; Admins and Transport Managers can query globally."
    )
)
async def list_students(
    search: Optional[str] = Query(None, description="Search by name, student ID, stop, or phone"),
    department: Optional[str] = Query(None, description="Filter by department (CSE, ECE, MECH, etc.)"),
    year: Optional[int] = Query(None, description="Filter by academic year (1, 2, 3, 4)"),
    bus: Optional[str] = Query(None, description="Filter by assigned bus (e.g. BUS-07)"),
    route: Optional[str] = Query(None, description="Filter by route name"),
    transport_status: Optional[str] = Query(None, description="Active, Suspended, Inactive"),
    payment_status: Optional[str] = Query(None, description="Paid, Partial, Pending, Overdue"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total, total_pages, items = StudentService.list_students(
        db=db,
        current_user=current_user,
        search=search,
        department=department,
        year=year,
        bus=bus,
        route=route,
        transport_status=transport_status,
        payment_status=payment_status,
        page=page,
        page_size=page_size
    )
    return StudentListResponse(
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        items=items
    )


@router.get(
    "/{student_identifier}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Student Details (Privacy-Enforced)",
    description="Retrieve a single student record with strict RBAC privacy verification."
)
async def get_student(
    student_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return StudentService.get_student(
        db=db,
        current_user=current_user,
        student_identifier=student_identifier
    )


@router.post(
    "",
    response_model=StudentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Student",
    description="Registers a new student into the transport roster (Admin / Transport Manager only)."
)
async def create_student(
    data: StudentCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return StudentService.create_student(db=db, data=data)


@router.put(
    "/{student_identifier}",
    response_model=StudentResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Student",
    description="Updates student transport attributes or stop/seat assignment (Admin / Transport Manager only)."
)
async def update_student(
    student_identifier: str,
    data: StudentUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return StudentService.update_student(db=db, student_identifier=student_identifier, data=data)


@router.delete(
    "/{student_identifier}",
    status_code=status.HTTP_200_OK,
    summary="Delete Student",
    description="Deletes a student record (Admin only)."
)
async def delete_student(
    student_identifier: str,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    StudentService.delete_student(db=db, student_identifier=student_identifier)
    return {"success": True, "message": f"Student '{student_identifier}' deleted successfully."}
