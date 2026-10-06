from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Route(BaseModel):
    __tablename__ = "routes"

    route_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), unique=True, index=True, nullable=False)
    start_location = Column(String(255), nullable=False)
    end_location = Column(String(255), default="College Campus", nullable=False)
    total_distance_km = Column(Float, default=35.0, nullable=False)
    estimated_duration_minutes = Column(Integer, default=60, nullable=False)
    status = Column(String(50), default="Active", nullable=False)

    # Relationships
    stops = relationship("RouteStop", back_populates="route", order_by="RouteStop.sequence", cascade="all, delete-orphan")
    buses = relationship("Bus", back_populates="route")
    trips = relationship("Trip", back_populates="route")

    def __repr__(self):
        return f"<Route {self.route_code} - {self.name}>"


class RouteStop(BaseModel):
    __tablename__ = "route_stops"

    route_id = Column(Integer, ForeignKey("routes.id", ondelete="CASCADE"), index=True, nullable=False)
    stop_name = Column(String(255), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sequence = Column(Integer, nullable=False)
    expected_arrival_time = Column(String(50), nullable=False)
    landmark = Column(String(255), nullable=True)

    route = relationship("Route", back_populates="stops")

    def __repr__(self):
        return f"<RouteStop {self.stop_name} (seq {self.sequence})>"


class Bus(BaseModel):
    __tablename__ = "buses"

    bus_number = Column(String(50), unique=True, index=True, nullable=False)
    registration_number = Column(String(50), unique=True, index=True, nullable=False)
    capacity = Column(Integer, nullable=False, default=50)

    # Assignments
    assigned_driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_incharge_id = Column(Integer, ForeignKey("bus_incharges.id", ondelete="SET NULL"), nullable=True, index=True)
    assigned_route_id = Column(Integer, ForeignKey("routes.id", ondelete="SET NULL"), nullable=True, index=True)

    # Telematics & Status
    gps_device_id = Column(String(100), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    speed = Column(Float, default=0.0, nullable=False)
    heading = Column(Float, default=0.0, nullable=False)
    odometer = Column(Float, default=70000.0, nullable=False)
    fuel_level_percent = Column(Float, default=85.0, nullable=False)
    status = Column(String(50), default="Running", nullable=False)  # Running, Delayed, Stopped, Offline, Maintenance
    last_gps_update = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    driver = relationship("Driver", foreign_keys=[assigned_driver_id])
    incharge = relationship("BusIncharge", foreign_keys=[assigned_incharge_id])
    route = relationship("Route", back_populates="buses")
    seats = relationship("BusSeat", back_populates="bus", cascade="all, delete-orphan")
    trips = relationship("Trip", back_populates="bus")

    def __repr__(self):
        return f"<Bus {self.bus_number} - {self.registration_number}>"


class BusSeat(BaseModel):
    __tablename__ = "bus_seats"

    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    seat_number = Column(String(20), nullable=False)
    status = Column(String(50), default="Available", nullable=False)  # Available, Assigned, Reserved, Blocked, Maintenance
    assigned_student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), nullable=True, index=True)
    is_window = Column(Boolean, default=False, nullable=False)

    # Strict Database Constraint to prevent duplicate seat assignments per bus
    __table_args__ = (
        UniqueConstraint("bus_id", "seat_number", name="uq_bus_seat_number"),
    )

    bus = relationship("Bus", back_populates="seats")
    student = relationship("Student", foreign_keys=[assigned_student_id])

    def __repr__(self):
        return f"<BusSeat Bus:{self.bus_id} Seat:{self.seat_number} - {self.status}>"


class Trip(BaseModel):
    __tablename__ = "trips"

    trip_id = Column(String(100), unique=True, index=True, nullable=False)
    bus_id = Column(Integer, ForeignKey("buses.id"), index=True, nullable=False)
    route_id = Column(Integer, ForeignKey("routes.id"), index=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id"), index=True, nullable=False)
    incharge_id = Column(Integer, ForeignKey("bus_incharges.id"), index=True, nullable=True)

    trip_type = Column(String(50), default="Morning Pickup", nullable=False)  # Morning Pickup, Evening Drop
    scheduled_start_time = Column(DateTime, nullable=False)
    actual_start_time = Column(DateTime, nullable=True)
    actual_end_time = Column(DateTime, nullable=True)
    
    status = Column(String(50), default="Scheduled", nullable=False)  # Scheduled, Ready, Started, In Progress, Delayed, Completed, Cancelled
    vehicle_check_completed = Column(Boolean, default=False, nullable=False)
    current_stop_id = Column(Integer, ForeignKey("route_stops.id"), nullable=True)
    boarding_count = Column(Integer, default=0, nullable=False)
    total_expected_passengers = Column(Integer, default=0, nullable=False)
    notes = Column(Text, nullable=True)

    bus = relationship("Bus", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    driver = relationship("Driver", foreign_keys=[driver_id])
    incharge = relationship("BusIncharge", foreign_keys=[incharge_id])
    current_stop = relationship("RouteStop", foreign_keys=[current_stop_id])

    def __repr__(self):
        return f"<Trip {self.trip_id} - {self.status}>"
