from datetime import date
from sqlalchemy import Column, String, Integer, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class Driver(BaseModel):
    __tablename__ = "drivers"

    driver_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    license_number = Column(String(100), unique=True, index=True, nullable=False)
    license_expiry = Column(Date, nullable=False)
    assigned_bus = Column(String(50), nullable=True, index=True)
    assigned_route = Column(String(255), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    status = Column(String(50), default="Active", nullable=False)
    profile_photo = Column(String(512), nullable=True)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Driver {self.driver_id} - {self.name}>"


class BusIncharge(BaseModel):
    __tablename__ = "bus_incharges"

    incharge_id = Column(String(50), unique=True, index=True, nullable=False)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    email = Column(String(255), nullable=True)
    assigned_bus = Column(String(50), nullable=True, index=True)
    assigned_route = Column(String(255), nullable=True)
    emergency_contact = Column(String(100), nullable=True)
    status = Column(String(50), default="Active", nullable=False)
    profile_photo = Column(String(512), nullable=True)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<BusIncharge {self.incharge_id} - {self.name}>"


class Student(BaseModel):
    __tablename__ = "students"

    student_id = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    department = Column(String(50), nullable=False, index=True)
    year = Column(Integer, nullable=False)
    phone = Column(String(50), nullable=True)
    parent_phone = Column(String(50), nullable=True)
    bus = Column(String(50), nullable=True, index=True)
    route = Column(String(255), nullable=True, index=True)
    stop = Column(String(255), nullable=True)
    seat = Column(String(50), nullable=True)
    transport_status = Column(String(50), default="Active", nullable=False)
    payment_status = Column(String(50), default="Paid", nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<Student {self.student_id} - {self.name}>"
