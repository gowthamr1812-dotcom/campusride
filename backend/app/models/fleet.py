from datetime import date, datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime,
    ForeignKey, Text, Boolean
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class MaintenanceLog(BaseModel):
    __tablename__ = "maintenance_logs"

    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    reported_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    service_type = Column(String(100), nullable=False)  # Routine Inspection, Oil & Filter Change, Brake Service, Tire Replacement, Engine Diagnostic, Electrical, AC Repair
    description = Column(Text, nullable=False)
    service_date = Column(Date, default=date.today, nullable=False, index=True)
    completion_date = Column(Date, nullable=True)
    odometer_reading = Column(Float, default=0.0, nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    vendor_name = Column(String(255), nullable=True)
    invoice_number = Column(String(100), nullable=True)
    status = Column(String(50), default="Scheduled", index=True, nullable=False)  # Scheduled, In Progress, Completed, Critical
    priority = Column(String(50), default="Medium", nullable=False)  # Low, Medium, High, Critical

    # Relationships
    bus = relationship("Bus", foreign_keys=[bus_id])
    driver = relationship("Driver", foreign_keys=[driver_id])
    reported_by = relationship("User", foreign_keys=[reported_by_user_id])

    def __repr__(self):
        return f"<MaintenanceLog Bus:{self.bus_id} {self.service_type} - {self.status}>"


class FuelLog(BaseModel):
    __tablename__ = "fuel_logs"

    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="SET NULL"), nullable=True, index=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    log_date = Column(Date, default=date.today, nullable=False, index=True)
    liters_filled = Column(Float, nullable=False)
    rate_per_liter = Column(Float, default=94.50, nullable=False)
    total_cost = Column(Float, nullable=False)
    odometer_reading = Column(Float, nullable=False)
    fuel_station = Column(String(255), default="Indian Oil Campus Depot", nullable=False)
    fuel_level_after_fill = Column(Float, default=100.0, nullable=False)
    payment_mode = Column(String(50), default="Fleet Card", nullable=False)  # Fleet Card, Corporate Account, Cash
    invoice_slip_number = Column(String(100), nullable=True)
    notes = Column(String(255), nullable=True)

    # Relationships
    bus = relationship("Bus", foreign_keys=[bus_id])
    driver = relationship("Driver", foreign_keys=[driver_id])
    recorded_by = relationship("User", foreign_keys=[recorded_by_user_id])

    def __repr__(self):
        return f"<FuelLog Bus:{self.bus_id} {self.liters_filled}L (₹{self.total_cost})>"


class VehicleDocument(BaseModel):
    __tablename__ = "vehicle_documents"

    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    document_type = Column(String(100), nullable=False, index=True)  # RC Book, Insurance Policy, Fitness Certificate (FC), Pollution Under Control (PUC), Permit, Road Tax
    document_number = Column(String(100), nullable=False, index=True)
    issuing_authority = Column(String(255), default="RTO Chennai", nullable=False)
    issue_date = Column(Date, nullable=False)
    expiry_date = Column(Date, nullable=False, index=True)
    status = Column(String(50), default="Valid", index=True, nullable=False)  # Valid, Expiring Soon, Expired
    file_url = Column(String(512), nullable=True)
    notes = Column(String(255), nullable=True)

    # Relationships
    bus = relationship("Bus", foreign_keys=[bus_id])

    def __repr__(self):
        return f"<VehicleDocument Bus:{self.bus_id} {self.document_type} - {self.status}>"
