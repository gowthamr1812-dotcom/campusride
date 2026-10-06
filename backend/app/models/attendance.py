from datetime import date, datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Date, DateTime,
    ForeignKey, Text, UniqueConstraint, Boolean
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class StudentAttendance(BaseModel):
    __tablename__ = "student_attendance"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    trip_id = Column(Integer, ForeignKey("trips.id", ondelete="SET NULL"), index=True, nullable=True)
    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="CASCADE"), index=True, nullable=False)
    stop_id = Column(Integer, ForeignKey("route_stops.id", ondelete="SET NULL"), nullable=True)
    
    date = Column(Date, default=date.today, index=True, nullable=False)
    trip_type = Column(String(50), default="Morning Pickup", nullable=False)  # Morning Pickup, Evening Drop
    status = Column(String(50), default="Boarded", nullable=False)  # Boarded, Absent, Excused, Dropped
    boarding_time = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=True)
    method = Column(String(50), default="Manual", nullable=False)  # Manual, RFID, QR_Scan, Geofence
    
    marked_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(String(255), nullable=True)

    # Unique constraint per student, date, and trip_type to prevent double marking the same run
    __table_args__ = (
        UniqueConstraint("student_id", "date", "trip_type", name="uq_student_daily_run_attendance"),
    )

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    trip = relationship("Trip", foreign_keys=[trip_id])
    bus = relationship("Bus", foreign_keys=[bus_id])
    stop = relationship("RouteStop", foreign_keys=[stop_id])
    marked_by = relationship("User", foreign_keys=[marked_by_user_id])

    def __repr__(self):
        return f"<StudentAttendance Student:{self.student_id} Date:{self.date} - {self.status}>"


class StaffAttendance(BaseModel):
    __tablename__ = "staff_attendance"

    staff_type = Column(String(50), nullable=False, index=True)  # DRIVER, BUS_INCHARGE
    driver_id = Column(Integer, ForeignKey("drivers.id", ondelete="CASCADE"), nullable=True, index=True)
    incharge_id = Column(Integer, ForeignKey("bus_incharges.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    bus_id = Column(Integer, ForeignKey("buses.id", ondelete="SET NULL"), nullable=True, index=True)
    
    date = Column(Date, default=date.today, index=True, nullable=False)
    status = Column(String(50), default="Present", nullable=False)  # Present, Absent, On Leave, Late
    check_in_time = Column(DateTime, nullable=True)
    check_out_time = Column(DateTime, nullable=True)
    shift = Column(String(50), default="Regular Shift", nullable=False)
    
    marked_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = Column(String(255), nullable=True)

    # Relationships
    driver = relationship("Driver", foreign_keys=[driver_id])
    incharge = relationship("BusIncharge", foreign_keys=[incharge_id])
    user = relationship("User", foreign_keys=[user_id])
    bus = relationship("Bus", foreign_keys=[bus_id])
    marked_by = relationship("User", foreign_keys=[marked_by_user_id])

    def __repr__(self):
        return f"<StaffAttendance {self.staff_type} Date:{self.date} - {self.status}>"
