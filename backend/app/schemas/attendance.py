from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


# --- Student Attendance Schemas ---

class StudentBrief(BaseModel):
    id: int
    student_id: str
    name: str
    department: str
    year: int
    seat: Optional[str] = None
    stop: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceCreate(BaseModel):
    student_id: int
    bus_id: int
    trip_id: Optional[int] = None
    stop_id: Optional[int] = None
    date: Optional[date] = None
    trip_type: Optional[str] = "Morning Pickup"
    status: str = "Boarded"
    method: Optional[str] = "Manual"
    remarks: Optional[str] = None


class StudentAttendanceBatchItem(BaseModel):
    student_id: int
    status: str = "Boarded"
    stop_id: Optional[int] = None
    remarks: Optional[str] = None


class StudentAttendanceBatchCreate(BaseModel):
    bus_id: int
    trip_id: Optional[int] = None
    date: Optional[date] = None
    trip_type: str = "Morning Pickup"
    method: Optional[str] = "Manual"
    items: List[StudentAttendanceBatchItem]


class StudentAttendanceResponse(BaseModel):
    id: int
    student_id: int
    trip_id: Optional[int] = None
    bus_id: int
    stop_id: Optional[int] = None
    date: date
    trip_type: str
    status: str
    boarding_time: Optional[datetime] = None
    method: str
    remarks: Optional[str] = None
    
    # Enriched fields
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_department: Optional[str] = None
    bus_number: Optional[str] = None
    stop_name: Optional[str] = None
    seat_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentAttendanceListResponse(BaseModel):
    total: int
    items: List[StudentAttendanceResponse]


class StudentAttendanceSummaryResponse(BaseModel):
    date: date
    total_expected: int
    total_boarded: int
    total_absent: int
    total_excused: int
    boarding_rate_pct: float


# --- Staff Attendance Schemas ---

class StaffAttendanceCreate(BaseModel):
    staff_type: str  # DRIVER, BUS_INCHARGE
    driver_id: Optional[int] = None
    incharge_id: Optional[int] = None
    bus_id: Optional[int] = None
    date: Optional[date] = None
    status: str = "Present"  # Present, Absent, On Leave, Late
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    shift: Optional[str] = "Regular Shift"
    remarks: Optional[str] = None


class StaffAttendanceUpdate(BaseModel):
    status: Optional[str] = None
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    remarks: Optional[str] = None


class StaffAttendanceResponse(BaseModel):
    id: int
    staff_type: str
    driver_id: Optional[int] = None
    incharge_id: Optional[int] = None
    user_id: Optional[int] = None
    bus_id: Optional[int] = None
    date: date
    status: str
    check_in_time: Optional[datetime] = None
    check_out_time: Optional[datetime] = None
    shift: str
    remarks: Optional[str] = None

    # Enriched fields
    staff_name: Optional[str] = None
    staff_code: Optional[str] = None
    bus_number: Optional[str] = None
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StaffAttendanceListResponse(BaseModel):
    total: int
    items: List[StaffAttendanceResponse]


class StaffAttendanceSummaryResponse(BaseModel):
    date: date
    total_staff: int
    drivers_present: int
    drivers_absent: int
    incharges_present: int
    incharges_absent: int
    attendance_rate_pct: float
