from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime,
    ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class EmergencyIncident(BaseModel):
    __tablename__ = "emergency_incidents"

    incident_code = Column(String(50), unique=True, index=True, nullable=False)
    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), nullable=True, index=True)
    reported_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    incident_type = Column(String(100), nullable=False)  # Breakdown / Mechanical, Medical Emergency, Road Accident, Severe Traffic Gridlock, Route Deviation, Safety Concern
    severity = Column(String(50), default="High", nullable=False)  # Critical, High, Medium, Low
    status = Column(String(50), default="Triggered / Active", nullable=False)  # Triggered / Active, Dispatched, Resolved, False Alarm

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    location_name = Column(String(255), nullable=True)
    description = Column(Text, nullable=False)

    rescue_bus_id = Column(Integer, ForeignKey("buses.id", ondelete="SET NULL"), nullable=True)
    reported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    resolved_at = Column(DateTime, nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Relationships
    bus = relationship("Bus", foreign_keys=[bus_id])
    trip = relationship("Trip", foreign_keys=[trip_id])
    reported_by = relationship("User", foreign_keys=[reported_by_id])
    rescue_bus = relationship("Bus", foreign_keys=[rescue_bus_id])

    def __repr__(self):
        return f"<EmergencyIncident {self.incident_code} - {self.incident_type} ({self.status})>"


class Notification(BaseModel):
    __tablename__ = "notifications"

    notification_code = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    category = Column(String(50), default="GENERAL_ANNOUNCEMENT", nullable=False)  # EMERGENCY_SOS, TRIP_DELAY, ROUTE_CHANGE, WEATHER_ALERT, FEE_REMINDER, GENERAL_ANNOUNCEMENT
    priority = Column(String(50), default="NORMAL", nullable=False)  # URGENT, HIGH, NORMAL, LOW
    target_audience = Column(String(50), default="ALL", nullable=False)  # ALL, STUDENTS, DRIVERS, INCHARGES, MANAGERS, BUS_SPECIFIC

    target_bus_id = Column(Integer, ForeignKey("buses.id", ondelete="SET NULL"), nullable=True, index=True)
    target_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    is_broadcast = Column(Boolean, default=True, nullable=False)
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    expires_at = Column(DateTime, nullable=True)

    # Relationships
    target_bus = relationship("Bus", foreign_keys=[target_bus_id])
    target_user = relationship("User", foreign_keys=[target_user_id])
    created_by = relationship("User", foreign_keys=[created_by_id])
    read_statuses = relationship("NotificationReadStatus", back_populates="notification", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Notification {self.notification_code} - {self.title}>"


class NotificationReadStatus(BaseModel):
    __tablename__ = "notification_read_statuses"

    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    read_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("notification_id", "user_id", name="uq_notification_user_read"),
    )

    notification = relationship("Notification", back_populates="read_statuses")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<NotificationReadStatus Notif:{self.notification_id} User:{self.user_id}>"


class SafetyInstruction(BaseModel):
    __tablename__ = "safety_instructions"

    title = Column(String(255), nullable=False)
    category = Column(String(100), default="In-Transit Safety", nullable=False)  # Boarding & De-boarding, In-Transit Safety, Emergency Evacuation, Severe Weather Protocol, Code of Conduct
    target_role = Column(String(50), default="ALL", nullable=False)  # ALL, STUDENT, DRIVER, BUS_INCHARGE
    content = Column(Text, nullable=False)
    do_points = Column(Text, nullable=True)  # Semicolon-separated DO's
    dont_points = Column(Text, nullable=True)  # Semicolon-separated DON'Ts
    is_mandatory = Column(Boolean, default=True, nullable=False)
    version = Column(String(20), default="v1.0", nullable=False)
    published_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    acknowledgments = relationship("InstructionAcknowledgment", back_populates="instruction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SafetyInstruction {self.title} ({self.target_role})>"


class InstructionAcknowledgment(BaseModel):
    __tablename__ = "instruction_acknowledgments"

    instruction_id = Column(Integer, ForeignKey("safety_instructions.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    acknowledged_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("instruction_id", "user_id", name="uq_instruction_user_ack"),
    )

    instruction = relationship("SafetyInstruction", back_populates="acknowledgments")
    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<InstructionAcknowledgment Inst:{self.instruction_id} User:{self.user_id}>"
