from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


# ==================== EMERGENCY INCIDENTS ====================

class EmergencyTriggerRequest(BaseModel):
    bus_id: int = Field(..., description="Target bus database ID")
    trip_id: Optional[int] = Field(None, description="Optional active trip ID")
    incident_type: str = Field(..., description="Breakdown / Mechanical, Medical Emergency, Road Accident, Severe Traffic Gridlock, Route Deviation, Student Safety Concern")
    severity: str = Field("High", description="Critical, High, Medium, Low")
    latitude: Optional[float] = Field(None, description="GPS Latitude coordinate of incident")
    longitude: Optional[float] = Field(None, description="GPS Longitude coordinate of incident")
    location_name: Optional[str] = Field(None, description="Landmark or road location description")
    description: str = Field(..., description="Detailed description of the emergency or defect")


class EmergencyIncidentUpdate(BaseModel):
    status: Optional[str] = Field(None, description="Triggered / Active, Dispatched, Resolved, False Alarm")
    resolution_notes: Optional[str] = Field(None, description="Action taken and resolution comments")
    rescue_bus_id: Optional[int] = Field(None, description="Database ID of dispatched backup bus")


class EmergencyIncidentResponse(BaseModel):
    id: int
    incident_code: str
    bus_id: int
    bus_number: Optional[str] = None
    registration_number: Optional[str] = None
    route_name: Optional[str] = None
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    trip_id: Optional[int] = None
    incident_type: str
    severity: str
    status: str
    latitude: float
    longitude: float
    location_name: Optional[str] = None
    description: str
    rescue_bus_id: Optional[int] = None
    rescue_bus_number: Optional[str] = None
    reported_at: datetime
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    reported_by_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EmergencyIncidentListResponse(BaseModel):
    total: int
    items: List[EmergencyIncidentResponse]


class EmergencySummaryResponse(BaseModel):
    active_sos_count: int
    dispatched_count: int
    resolved_count: int
    total_incidents: int


# ==================== NOTIFICATIONS ====================

class NotificationCreate(BaseModel):
    title: str = Field(..., description="Alert headline")
    message: str = Field(..., description="Detailed announcement or warning message")
    category: str = Field("GENERAL_ANNOUNCEMENT", description="EMERGENCY_SOS, TRIP_DELAY, ROUTE_CHANGE, WEATHER_ALERT, FEE_REMINDER, GENERAL_ANNOUNCEMENT")
    priority: str = Field("NORMAL", description="URGENT, HIGH, NORMAL, LOW")
    target_audience: str = Field("ALL", description="ALL, STUDENTS, DRIVERS, INCHARGES, MANAGERS, BUS_SPECIFIC")
    target_bus_id: Optional[int] = Field(None, description="Target specific bus riders/crew")
    target_user_id: Optional[int] = Field(None, description="Target specific individual user")


class NotificationResponse(BaseModel):
    id: int
    notification_code: str
    title: str
    message: str
    category: str
    priority: str
    target_audience: str
    target_bus_id: Optional[int] = None
    target_bus_number: Optional[str] = None
    is_broadcast: bool = True
    created_at: datetime
    is_read: bool = False
    read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    total: int
    unread_count: int
    items: List[NotificationResponse]


# ==================== SAFETY INSTRUCTIONS ====================

class SafetyInstructionCreate(BaseModel):
    title: str
    category: str = "In-Transit Safety"
    target_role: str = "ALL"
    content: str
    do_points: Optional[str] = None
    dont_points: Optional[str] = None
    is_mandatory: bool = True
    version: str = "v1.0"


class SafetyInstructionResponse(BaseModel):
    id: int
    title: str
    category: str
    target_role: str
    content: str
    do_points: Optional[str] = None
    dont_points: Optional[str] = None
    is_mandatory: bool = True
    version: str
    published_date: datetime
    is_acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SafetyInstructionListResponse(BaseModel):
    total: int
    items: List[SafetyInstructionResponse]


class AcknowledgmentResponse(BaseModel):
    instruction_id: int
    user_id: int
    acknowledged_at: datetime
    status: str = "Acknowledged"
