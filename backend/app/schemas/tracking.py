from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class GPSLocationPayload(BaseModel):
    bus_id: int = Field(..., description="Target bus database ID")
    latitude: float = Field(..., description="GPS Latitude in decimal degrees")
    longitude: float = Field(..., description="GPS Longitude in decimal degrees")
    speed: float = Field(0.0, description="Instantaneous speed in km/h")
    heading: float = Field(0.0, description="Bearing angle in degrees (0-360)")
    odometer: Optional[float] = Field(None, description="Current vehicle odometer in km")
    fuel_level_percent: Optional[float] = Field(None, description="Fuel level percentage (0-100)")
    status: Optional[str] = Field(None, description="Running, Delayed, Stopped, Offline, Maintenance")
    timestamp: Optional[datetime] = Field(None, description="Telemetry sample timestamp")


class StopEtaInfo(BaseModel):
    stop_id: int
    stop_name: str
    sequence: int
    latitude: float
    longitude: float
    expected_arrival_time: str
    distance_km: float
    eta_minutes: int
    is_passed: bool = False


class LiveBusTelemetry(BaseModel):
    bus_id: int
    bus_number: str
    registration_number: str
    status: str
    latitude: float
    longitude: float
    speed: float
    heading: float
    fuel_level_percent: float
    odometer: float
    last_gps_update: datetime

    # Route & Stop Context
    route_id: Optional[int] = None
    route_code: Optional[str] = None
    route_name: Optional[str] = None
    next_stop_id: Optional[int] = None
    next_stop_name: Optional[str] = None
    next_stop_eta_minutes: Optional[int] = None
    distance_to_campus_km: Optional[float] = None
    stops_polyline: Optional[List[List[float]]] = None

    # Personnel Info
    driver_id: Optional[int] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    incharge_id: Optional[int] = None
    incharge_name: Optional[str] = None
    incharge_phone: Optional[str] = None

    # Student specific context (populated when student queries)
    student_stop_name: Optional[str] = None
    student_stop_eta_minutes: Optional[int] = None
    distance_to_student_stop_km: Optional[float] = None

    model_config = ConfigDict(from_attributes=True)


class LiveTrackingListResponse(BaseModel):
    total_tracked: int
    running_count: int
    delayed_count: int
    stopped_count: int
    offline_count: int
    timestamp: datetime
    buses: List[LiveBusTelemetry]


class SimulationStepResponse(BaseModel):
    message: str
    buses_moved: int
    timestamp: datetime
