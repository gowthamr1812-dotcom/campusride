from typing import Optional, List
from datetime import date
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.user import User, UserRole
from app.models.people import Student, BusIncharge, Driver
from app.models.transport import Bus
from app.schemas.attendance import (
    StudentAttendanceCreate,
    StudentAttendanceBatchCreate,
    StudentAttendanceResponse,
    StudentAttendanceListResponse,
    StudentAttendanceSummaryResponse,
    StaffAttendanceCreate,
    StaffAttendanceResponse,
    StaffAttendanceListResponse,
    StaffAttendanceSummaryResponse
)
from app.services.attendance import StudentAttendanceService, StaffAttendanceService

router = APIRouter(prefix="/attendance", tags=["Attendance"])


# --- Student Boarding Attendance Endpoints ---

@router.get(
    "/students/summary",
    response_model=StudentAttendanceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Student Boarding Summary",
    description="Returns aggregate counts of expected, boarded, absent, and excused students."
)
async def get_student_attendance_summary(
    target_date: Optional[date] = Query(None, alias="date"),
    bus_id: Optional[int] = Query(None),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    # If Bus Incharge, lock bus_id to their assigned bus
    if current_user.role == UserRole.BUS_INCHARGE:
        incharge = db.query(BusIncharge).filter(
            (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
        ).first()
        if incharge and incharge.assigned_bus:
            bus = db.query(Bus).filter(Bus.bus_number == incharge.assigned_bus).first()
            if bus:
                bus_id = bus.id

    return StudentAttendanceService.get_summary(db=db, target_date=target_date, bus_id=bus_id)


@router.get(
    "/students",
    response_model=StudentAttendanceListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Student Boarding Attendance",
    description="Query boarding records by student, bus, trip, or date with strict RBAC privacy enforcement."
)
async def list_student_attendance(
    student_id: Optional[int] = Query(None),
    bus_id: Optional[int] = Query(None),
    trip_id: Optional[int] = Query(None),
    target_date: Optional[date] = Query(None, alias="date"),
    status_filter: Optional[str] = Query(None, alias="status"),
    trip_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Rule 1: Driver cannot access student attendance
    if current_user.role == UserRole.DRIVER:
        raise ForbiddenException("Drivers are not authorized to access student attendance registers.")

    # Rule 2: Student can ONLY view their own attendance
    if current_user.role == UserRole.STUDENT:
        my_student = db.query(Student).filter(
            (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
        ).first()
        if not my_student:
            return StudentAttendanceListResponse(total=0, items=[])
        student_id = my_student.id
        bus_id = None  # Prevent bypassing filter

    # Rule 3: Bus Incharge can only view attendance for their assigned bus
    if current_user.role == UserRole.BUS_INCHARGE:
        incharge = db.query(BusIncharge).filter(
            (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
        ).first()
        if incharge and incharge.assigned_bus:
            bus = db.query(Bus).filter(Bus.bus_number == incharge.assigned_bus).first()
            if bus:
                bus_id = bus.id

    items = StudentAttendanceService.list_student_attendance(
        db=db,
        student_id=student_id,
        bus_id=bus_id,
        trip_id=trip_id,
        target_date=target_date,
        status=status_filter,
        trip_type=trip_type
    )
    return StudentAttendanceListResponse(total=len(items), items=items)


@router.post(
    "/students",
    response_model=StudentAttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Student Boarding Attendance",
    description="Records boarding status for an individual student passenger."
)
async def mark_student_attendance(
    data: StudentAttendanceCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    # If Bus Incharge, verify the student belongs to their bus
    if current_user.role == UserRole.BUS_INCHARGE:
        incharge = db.query(BusIncharge).filter(
            (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
        ).first()
        if incharge and incharge.assigned_bus:
            target_student = db.query(Student).filter(Student.id == data.student_id).first()
            if target_student and target_student.bus != incharge.assigned_bus:
                raise ForbiddenException("Bus Incharge may only record attendance for students on their assigned bus.")

    return StudentAttendanceService.mark_student_attendance(
        db=db,
        data=data,
        marked_by_user_id=current_user.id
    )


@router.post(
    "/students/batch",
    response_model=List[StudentAttendanceResponse],
    status_code=status.HTTP_200_OK,
    summary="Batch Mark Student Boarding",
    description="Efficient bulk recording of boarding attendance for a bus route run."
)
async def batch_mark_student_attendance(
    data: StudentAttendanceBatchCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.BUS_INCHARGE:
        incharge = db.query(BusIncharge).filter(
            (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
        ).first()
        if incharge and incharge.assigned_bus:
            bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
            if bus and bus.bus_number != incharge.assigned_bus:
                raise ForbiddenException("Bus Incharge may only batch mark attendance for their assigned vehicle.")

    return StudentAttendanceService.batch_mark_attendance(
        db=db,
        data=data,
        marked_by_user_id=current_user.id
    )


# --- Staff Attendance Endpoints ---

@router.get(
    "/staff/summary",
    response_model=StaffAttendanceSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Staff Attendance Summary",
    description="Returns aggregate counts of drivers and incharges present vs absent."
)
async def get_staff_attendance_summary(
    target_date: Optional[date] = Query(None, alias="date"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER])),
    db: Session = Depends(get_db)
):
    return StaffAttendanceService.get_staff_summary(db=db, target_date=target_date)


@router.get(
    "/staff",
    response_model=StaffAttendanceListResponse,
    status_code=status.HTTP_200_OK,
    summary="List Staff Daily Attendance",
    description="Returns driver and incharge attendance records."
)
async def list_staff_attendance(
    staff_type: Optional[str] = Query(None),
    target_date: Optional[date] = Query(None, alias="date"),
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.TRANSPORT_MANAGER, UserRole.DRIVER, UserRole.BUS_INCHARGE])),
    db: Session = Depends(get_db)
):
    items = StaffAttendanceService.list_staff_attendance(
        db=db,
        staff_type=staff_type,
        target_date=target_date,
        status=status_filter
    )
    return StaffAttendanceListResponse(total=len(items), items=items)


@router.post(
    "/staff",
    response_model=StaffAttendanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Record Staff Attendance / Check-In",
    description="Marks driver or incharge daily presence (Admin, Transport Manager, or self check-in)."
)
async def record_staff_attendance(
    data: StaffAttendanceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Drivers and Incharges can check themselves in; Managers/Admins can record for anyone
    if current_user.role not in [UserRole.ADMIN, UserRole.TRANSPORT_MANAGER]:
        if current_user.role == UserRole.DRIVER:
            drv = db.query(Driver).filter(
                (Driver.user_id == current_user.id) | (Driver.driver_id == current_user.username)
            ).first()
            if not drv or data.driver_id != drv.id:
                raise ForbiddenException("Drivers can only log their own check-in.")
        elif current_user.role == UserRole.BUS_INCHARGE:
            inc = db.query(BusIncharge).filter(
                (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
            ).first()
            if not inc or data.incharge_id != inc.id:
                raise ForbiddenException("Bus Incharges can only log their own check-in.")
        else:
            raise ForbiddenException("Unauthorized to record staff attendance.")

    return StaffAttendanceService.record_staff_attendance(
        db=db,
        data=data,
        marked_by_user_id=current_user.id
    )
