from typing import Optional, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.user import User, UserRole
from app.models.people import Student
from app.schemas.finance import (
    FeeStructureCreate,
    FeeStructureUpdate,
    FeeStructureResponse,
    FeeStructureListResponse,
    StudentFeeResponse,
    StudentFeeListResponse,
    PaymentCreate,
    PaymentResponse,
    PaymentListResponse,
    ReceiptResponse,
    ReceiptListResponse,
    FinanceSummaryResponse
)
from app.services.finance import FeeService, PaymentService, ReceiptService

router = APIRouter(tags=["Finance"])


# --- Fee Structure Endpoints ---

@router.get(
    "/fees/summary",
    response_model=FinanceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Transport Financial KPI Summary",
    description="Aggregate collection metrics across all fee liabilities (Admin & Transport Manager)."
)
async def get_finance_summary(
    academic_year: str = Query("2025-2026"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return FeeService.get_finance_summary(db=db, academic_year=academic_year)


@router.get(
    "/fees",
    response_model=FeeStructureListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Fee Slab Structures",
    description="Retrieves institutional distance/zone-based fee slabs."
)
async def list_fee_structures(
    academic_year: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    items = FeeService.list_fee_structures(db=db, academic_year=academic_year, status=status_filter)
    return FeeStructureListResponse(total=len(items), items=items)


@router.post(
    "/fees",
    response_model=FeeStructureResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Fee Structure",
    description="Defines a new distance-based fee tier (Admin only)."
)
async def create_fee_structure(
    data: FeeStructureCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return FeeService.create_fee_structure(db=db, data=data)


@router.put(
    "/fees/{structure_id}",
    response_model=FeeStructureResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Fee Structure",
    description="Updates an existing fee slab (Admin only)."
)
async def update_fee_structure(
    structure_id: int,
    data: FeeStructureUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return FeeService.update_fee_structure(db=db, structure_id=structure_id, data=data)


@router.get(
    "/fees/students",
    response_model=StudentFeeListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Student Fee Liabilities",
    description="Query fee assessments by student, status, or academic year."
)
async def list_student_fees(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    academic_year: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rule: If student, lock to own student ID
    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student:
            return StudentFeeListResponse(total=0, items=[])
        student_id = my_student.id

    items = FeeService.list_student_fees(
        db=db,
        student_id=student_id,
        status=status_filter,
        academic_year=academic_year
    )
    return StudentFeeListResponse(total=len(items), items=items)


# --- Payment Endpoints ---

@router.get(
    "/payments",
    response_model=PaymentListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Transport Fee Payments",
    description="Retrieve payment transactions with strict student privacy isolation."
)
async def list_payments(
    student_id: Optional[int] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    payment_method: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Driver & Incharge restricted
    if current_user.role in [UserRole.DRIVER, UserRole.BUS_INCHARGE]:
        raise ForbiddenException("Crew roles are not authorized to view financial transaction registers.")

    # Student isolation
    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student:
            return PaymentListResponse(total=0, items=[])
        student_id = my_student.id

    items = PaymentService.list_payments(
        db=db,
        student_id=student_id,
        status=status_filter,
        payment_method=payment_method
    )
    return PaymentListResponse(total=len(items), items=items)


@router.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record or Process Payment",
    description="Processes fee payment and automatically generates an official receipt."
)
async def process_payment(
    data: PaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Driver & Incharge restricted
    if current_user.role in [UserRole.DRIVER, UserRole.BUS_INCHARGE]:
        raise ForbiddenException("Crew roles cannot record fee payments.")

    # Student paying online for themselves
    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student:
            raise NotFoundException("Student profile not found.")
        data.student_id = my_student.id

    return PaymentService.process_payment(
        db=db,
        data=data,
        recorded_by_user_id=current_user.id
    )


# --- Receipt Endpoints ---

@router.get(
    "/receipts",
    response_model=ReceiptListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Transport Receipts",
    description="Retrieve all issued receipts with strict student privacy isolation."
)
async def list_receipts(
    student_id: Optional[int] = Query(None),
    academic_year: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role in [UserRole.DRIVER, UserRole.BUS_INCHARGE]:
        raise ForbiddenException("Crew roles cannot view receipts.")

    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student:
            return ReceiptListResponse(total=0, items=[])
        student_id = my_student.id

    items = ReceiptService.list_receipts(db=db, student_id=student_id, academic_year=academic_year)
    return ReceiptListResponse(total=len(items), items=items)


@router.get(
    "/receipts/{receipt_identifier}",
    response_model=ReceiptResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Printable Receipt Details",
    description="Fetches full printable receipt metadata by ID or Receipt Number."
)
async def get_receipt(
    receipt_identifier: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    receipt = ReceiptService.get_receipt(db=db, identifier=receipt_identifier)

    # Privacy check for students
    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student or receipt.student_id != my_student.id:
            raise ForbiddenException("Students may only view their own receipts.")

    return receipt
