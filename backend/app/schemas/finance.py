from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


# --- Fee Structure Schemas ---

class FeeStructureCreate(BaseModel):
    academic_year: str = "2025-2026"
    slab_name: str
    min_distance_km: float = 0.0
    max_distance_km: float = 15.0
    amount: float
    billing_frequency: str = "Annual"
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: str = "Active"


class FeeStructureUpdate(BaseModel):
    slab_name: Optional[str] = None
    min_distance_km: Optional[float] = None
    max_distance_km: Optional[float] = None
    amount: Optional[float] = None
    billing_frequency: Optional[str] = None
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: Optional[str] = None


class FeeStructureResponse(BaseModel):
    id: int
    academic_year: str
    slab_name: str
    min_distance_km: float
    max_distance_km: float
    amount: float
    billing_frequency: str
    due_date: Optional[date] = None
    description: Optional[str] = None
    status: str
    student_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class FeeStructureListResponse(BaseModel):
    total: int
    items: List[FeeStructureResponse]


# --- Student Fee Schemas ---

class StudentFeeResponse(BaseModel):
    id: int
    student_id: int
    fee_structure_id: Optional[int] = None
    academic_year: str
    total_amount: float
    paid_amount: float
    pending_amount: float
    status: str
    due_date: Optional[date] = None

    # Enriched fields
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_department: Optional[str] = None
    slab_name: Optional[str] = None
    bus_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StudentFeeListResponse(BaseModel):
    total: int
    items: List[StudentFeeResponse]


# --- Payment Schemas ---

class PaymentCreate(BaseModel):
    student_id: int
    student_fee_id: Optional[int] = None
    amount: float
    payment_method: str = "Online"  # Online, UPI, NetBanking, Credit Card, Cash, Cheque
    payment_gateway_ref: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    transaction_id: str
    student_fee_id: Optional[int] = None
    student_id: int
    amount: float
    payment_method: str
    payment_gateway_ref: Optional[str] = None
    payment_date: datetime
    status: str
    notes: Optional[str] = None

    # Enriched fields
    receipt_number: Optional[str] = None
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    bus_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentListResponse(BaseModel):
    total: int
    items: List[PaymentResponse]


# --- Receipt Schemas ---

class ReceiptResponse(BaseModel):
    id: int
    receipt_number: str
    payment_id: int
    student_id: int
    issued_at: datetime
    amount_paid: float
    balance_due: float
    academic_year: str
    payment_mode: str
    download_url: Optional[str] = None

    # Enriched student & corridor details
    student_name: Optional[str] = None
    student_roll: Optional[str] = None
    student_department: Optional[str] = None
    student_year: Optional[int] = None
    bus_number: Optional[str] = None
    route_name: Optional[str] = None
    stop_name: Optional[str] = None
    transaction_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReceiptListResponse(BaseModel):
    total: int
    items: List[ReceiptResponse]


# --- Financial Summary ---

class FinanceSummaryResponse(BaseModel):
    academic_year: str
    total_assessed: float
    total_collected: float
    total_pending: float
    collection_rate_pct: float
    fully_paid_students: int
    partial_paid_students: int
    pending_students: int
