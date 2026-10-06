from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict


# --- Maintenance Log Schemas ---

class MaintenanceLogCreate(BaseModel):
    bus_id: int
    driver_id: Optional[int] = None
    service_type: str
    description: str
    service_date: Optional[date] = None
    odometer_reading: float = 0.0
    cost: float = 0.0
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    status: str = "Scheduled"
    priority: str = "Medium"


class MaintenanceLogUpdate(BaseModel):
    status: Optional[str] = None
    completion_date: Optional[date] = None
    cost: Optional[float] = None
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    priority: Optional[str] = None
    description: Optional[str] = None


class MaintenanceLogResponse(BaseModel):
    id: int
    bus_id: int
    driver_id: Optional[int] = None
    service_type: str
    description: str
    service_date: date
    completion_date: Optional[date] = None
    odometer_reading: float
    cost: float
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    status: str
    priority: str

    # Enriched fields
    bus_number: Optional[str] = None
    registration_number: Optional[str] = None
    driver_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MaintenanceLogListResponse(BaseModel):
    total: int
    items: List[MaintenanceLogResponse]


# --- Fuel Log Schemas ---

class FuelLogCreate(BaseModel):
    bus_id: int
    driver_id: Optional[int] = None
    log_date: Optional[date] = None
    liters_filled: float
    rate_per_liter: float = 94.50
    odometer_reading: float
    fuel_station: Optional[str] = "Indian Oil Campus Depot"
    fuel_level_after_fill: Optional[float] = 100.0
    payment_mode: Optional[str] = "Fleet Card"
    invoice_slip_number: Optional[str] = None
    notes: Optional[str] = None


class FuelLogResponse(BaseModel):
    id: int
    bus_id: int
    driver_id: Optional[int] = None
    log_date: date
    liters_filled: float
    rate_per_liter: float
    total_cost: float
    odometer_reading: float
    fuel_station: str
    fuel_level_after_fill: float
    payment_mode: str
    invoice_slip_number: Optional[str] = None
    notes: Optional[str] = None

    # Enriched fields
    bus_number: Optional[str] = None
    registration_number: Optional[str] = None
    driver_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FuelLogListResponse(BaseModel):
    total: int
    items: List[FuelLogResponse]


# --- Vehicle Document Schemas ---

class VehicleDocumentCreate(BaseModel):
    bus_id: int
    document_type: str
    document_number: str
    issuing_authority: Optional[str] = "RTO Chennai"
    issue_date: date
    expiry_date: date
    file_url: Optional[str] = None
    notes: Optional[str] = None


class VehicleDocumentUpdate(BaseModel):
    document_number: Optional[str] = None
    expiry_date: Optional[date] = None
    issuing_authority: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class VehicleDocumentResponse(BaseModel):
    id: int
    bus_id: int
    document_type: str
    document_number: str
    issuing_authority: str
    issue_date: date
    expiry_date: date
    status: str
    file_url: Optional[str] = None
    notes: Optional[str] = None

    # Enriched fields
    bus_number: Optional[str] = None
    days_until_expiry: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


class VehicleDocumentListResponse(BaseModel):
    total: int
    items: List[VehicleDocumentResponse]


# --- Fleet Summary Schemas ---

class FleetSummaryResponse(BaseModel):
    total_buses: int
    buses_in_maintenance: int
    active_service_orders: int
    total_maintenance_expenditure: float
    monthly_fuel_liters: float
    monthly_fuel_cost: float
    valid_documents_count: int
    expiring_documents_count: int
    expired_documents_count: int
