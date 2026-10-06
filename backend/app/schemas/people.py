from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict, EmailStr


# ==================== DRIVERS ====================
class DriverBase(BaseModel):
    name: str = Field(..., examples=["Ramesh Kumar"])
    phone: str = Field(..., examples=["+91 98401 22001"])
    email: Optional[EmailStr] = None
    license_number: str = Field(..., examples=["TN-01-2015-0001001"])
    license_expiry: date
    assigned_bus: Optional[str] = Field(None, examples=["BUS-01"])
    assigned_route: Optional[str] = Field(None, examples=["Tambaram Route"])
    emergency_contact: Optional[str] = None
    status: str = Field("Active", examples=["Active", "On Leave", "Inactive"])
    profile_photo: Optional[str] = None


class DriverCreate(DriverBase):
    driver_id: str = Field(..., examples=["DRV-001"])


class DriverUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    assigned_bus: Optional[str] = None
    assigned_route: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = None
    profile_photo: Optional[str] = None


class DriverResponse(DriverBase):
    id: int
    driver_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DriverListResponse(BaseModel):
    total: int
    items: List[DriverResponse]


# ==================== BUS INCHARGES ====================
class BusInchargeBase(BaseModel):
    employee_id: str = Field(..., examples=["EMP-1001"])
    name: str = Field(..., examples=["Meena Priya"])
    phone: str = Field(..., examples=["+91 98401 33001"])
    email: Optional[EmailStr] = None
    assigned_bus: Optional[str] = Field(None, examples=["BUS-07"])
    assigned_route: Optional[str] = Field(None, examples=["Perungalathur Route"])
    emergency_contact: Optional[str] = None
    status: str = Field("Active", examples=["Active", "On Leave", "Inactive"])
    profile_photo: Optional[str] = None


class BusInchargeCreate(BusInchargeBase):
    incharge_id: str = Field(..., examples=["INC-001"])


class BusInchargeUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    assigned_bus: Optional[str] = None
    assigned_route: Optional[str] = None
    emergency_contact: Optional[str] = None
    status: Optional[str] = None
    profile_photo: Optional[str] = None


class BusInchargeResponse(BusInchargeBase):
    id: int
    incharge_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusInchargeListResponse(BaseModel):
    total: int
    items: List[BusInchargeResponse]


# ==================== STUDENTS ====================
class StudentBase(BaseModel):
    name: str = Field(..., examples=["Kavitha Sundaram"])
    department: str = Field(..., examples=["CSE"])
    year: int = Field(..., ge=1, le=4, examples=[3])
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    bus: Optional[str] = Field(None, examples=["BUS-07"])
    route: Optional[str] = Field(None, examples=["Perungalathur Route"])
    stop: Optional[str] = Field(None, examples=["Vandalur"])
    seat: Optional[str] = Field(None, examples=["14A"])
    transport_status: str = Field("Active", examples=["Active", "Suspended", "Inactive"])
    payment_status: str = Field("Paid", examples=["Paid", "Partial", "Pending", "Overdue"])


class StudentCreate(StudentBase):
    student_id: str = Field(..., examples=["STU-0001"])


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[int] = None
    phone: Optional[str] = None
    parent_phone: Optional[str] = None
    bus: Optional[str] = None
    route: Optional[str] = None
    stop: Optional[str] = None
    seat: Optional[str] = None
    transport_status: Optional[str] = None
    payment_status: Optional[str] = None


class StudentResponse(StudentBase):
    id: int
    student_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StudentListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    total_pages: int
    items: List[StudentResponse]
