from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.people import DriverResponse, BusInchargeResponse, StudentResponse


# ==================== ROUTE STOPS ====================
class RouteStopBase(BaseModel):
    stop_name: str = Field(..., examples=["Chromepet"])
    latitude: float = Field(..., examples=[12.9516])
    longitude: float = Field(..., examples=[80.1412])
    sequence: int = Field(..., examples=[2])
    expected_arrival_time: str = Field(..., examples=["07:25 AM"])
    landmark: Optional[str] = None


class RouteStopCreate(RouteStopBase):
    route_id: int


class RouteStopResponse(RouteStopBase):
    id: int
    route_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==================== ROUTES ====================
class RouteBase(BaseModel):
    name: str = Field(..., examples=["Tambaram Route"])
    start_location: str = Field(..., examples=["Tambaram Sanatorium"])
    end_location: str = Field("College Campus", examples=["College Campus"])
    total_distance_km: float = Field(35.0, examples=[34.5])
    estimated_duration_minutes: int = Field(60, examples=[55])
    status: str = Field("Active", examples=["Active", "Inactive"])


class RouteCreate(RouteBase):
    route_code: str = Field(..., examples=["R-01"])


class RouteUpdate(BaseModel):
    name: Optional[str] = None
    start_location: Optional[str] = None
    end_location: Optional[str] = None
    total_distance_km: Optional[float] = None
    estimated_duration_minutes: Optional[int] = None
    status: Optional[str] = None


class RouteResponse(RouteBase):
    id: int
    route_code: str
    stops: List[RouteStopResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RouteListResponse(BaseModel):
    total: int
    items: List[RouteResponse]


# ==================== SEATS ====================
class BusSeatBase(BaseModel):
    seat_number: str = Field(..., examples=["01A"])
    status: str = Field("Available", examples=["Available", "Assigned", "Reserved", "Blocked", "Maintenance"])
    is_window: bool = False
    assigned_student_id: Optional[int] = None


class BusSeatResponse(BusSeatBase):
    id: int
    bus_id: int
    student: Optional[StudentResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SeatAssignmentRequest(BaseModel):
    student_id: int
    seat_number: str


# ==================== BUSES ====================
class BusBase(BaseModel):
    registration_number: str = Field(..., examples=["TN 01 AB 1001"])
    capacity: int = Field(50, examples=[50])
    assigned_driver_id: Optional[int] = None
    assigned_incharge_id: Optional[int] = None
    assigned_route_id: Optional[int] = None
    gps_device_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: float = 0.0
    heading: float = 0.0
    odometer: float = 70000.0
    fuel_level_percent: float = 85.0
    status: str = Field("Running", examples=["Running", "Delayed", "Stopped", "Offline", "Maintenance"])


class BusCreate(BusBase):
    bus_number: str = Field(..., examples=["BUS-01"])


class BusUpdate(BaseModel):
    registration_number: Optional[str] = None
    capacity: Optional[int] = None
    assigned_driver_id: Optional[int] = None
    assigned_incharge_id: Optional[int] = None
    assigned_route_id: Optional[int] = None
    gps_device_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    speed: Optional[float] = None
    heading: Optional[float] = None
    odometer: Optional[float] = None
    fuel_level_percent: Optional[float] = None
    status: Optional[str] = None


class BusResponse(BusBase):
    id: int
    bus_number: str
    driver: Optional[DriverResponse] = None
    incharge: Optional[BusInchargeResponse] = None
    route: Optional[RouteResponse] = None
    occupancy_count: int = 0
    occupancy_percentage: float = 0.0
    last_gps_update: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BusListResponse(BaseModel):
    total: int
    items: List[BusResponse]


class BusSummaryResponse(BaseModel):
    total_buses: int
    running: int
    delayed: int
    stopped: int
    offline: int
    maintenance: int


# ==================== TRIPS ====================
class TripBase(BaseModel):
    bus_id: int
    route_id: int
    driver_id: int
    incharge_id: Optional[int] = None
    trip_type: str = Field("Morning Pickup", examples=["Morning Pickup", "Evening Drop"])
    scheduled_start_time: datetime
    status: str = Field("Scheduled", examples=["Scheduled", "Ready", "Started", "In Progress", "Delayed", "Completed", "Cancelled"])
    vehicle_check_completed: bool = False
    current_stop_id: Optional[int] = None
    boarding_count: int = 0
    total_expected_passengers: int = 0
    notes: Optional[str] = None


class TripCreate(TripBase):
    trip_id: str = Field(..., examples=["TRIP-20261006-001"])


class TripUpdate(BaseModel):
    status: Optional[str] = None
    vehicle_check_completed: Optional[bool] = None
    current_stop_id: Optional[int] = None
    boarding_count: Optional[int] = None
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    notes: Optional[str] = None


class TripResponse(TripBase):
    id: int
    trip_id: str
    actual_start_time: Optional[datetime] = None
    actual_end_time: Optional[datetime] = None
    bus: Optional[BusResponse] = None
    driver: Optional[DriverResponse] = None
    incharge: Optional[BusInchargeResponse] = None
    route: Optional[RouteResponse] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TripListResponse(BaseModel):
    total: int
    items: List[TripResponse]
