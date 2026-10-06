from datetime import date, datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Date, DateTime,
    ForeignKey, Text, UniqueConstraint, Boolean
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class FeeStructure(BaseModel):
    __tablename__ = "fee_structures"

    academic_year = Column(String(50), default="2025-2026", index=True, nullable=False)
    slab_name = Column(String(100), unique=True, index=True, nullable=False)
    min_distance_km = Column(Float, default=0.0, nullable=False)
    max_distance_km = Column(Float, default=15.0, nullable=False)
    amount = Column(Float, nullable=False)
    billing_frequency = Column(String(50), default="Annual", nullable=False)  # Annual, Semester, Quarterly
    due_date = Column(Date, nullable=True)
    description = Column(String(255), nullable=True)
    status = Column(String(50), default="Active", nullable=False)  # Active, Inactive

    # Relationships
    student_fees = relationship("StudentFee", back_populates="fee_structure")

    def __repr__(self):
        return f"<FeeStructure {self.slab_name}: ₹{self.amount}>"


class StudentFee(BaseModel):
    __tablename__ = "student_fees"

    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    fee_structure_id = Column(Integer, ForeignKey("fee_structures.id", ondelete="SET NULL"), index=True, nullable=True)
    academic_year = Column(String(50), default="2025-2026", index=True, nullable=False)
    
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0, nullable=False)
    pending_amount = Column(Float, nullable=False)
    status = Column(String(50), default="Pending", index=True, nullable=False)  # Paid, Partial, Pending, Overdue
    due_date = Column(Date, nullable=True)

    __table_args__ = (
        UniqueConstraint("student_id", "academic_year", name="uq_student_academic_fee"),
    )

    # Relationships
    student = relationship("Student", foreign_keys=[student_id])
    fee_structure = relationship("FeeStructure", back_populates="student_fees")
    payments = relationship("Payment", back_populates="student_fee", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<StudentFee Student:{self.student_id} Total:{self.total_amount} Paid:{self.paid_amount}>"


class Payment(BaseModel):
    __tablename__ = "payments"

    transaction_id = Column(String(100), unique=True, index=True, nullable=False)
    student_fee_id = Column(Integer, ForeignKey("student_fees.id", ondelete="SET NULL"), index=True, nullable=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), default="Online", nullable=False)  # Online, UPI, NetBanking, Credit Card, Cash, Cheque
    payment_gateway_ref = Column(String(100), nullable=True)
    payment_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    status = Column(String(50), default="Success", index=True, nullable=False)  # Success, Pending, Failed, Refunded
    notes = Column(String(255), nullable=True)
    recorded_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    student_fee = relationship("StudentFee", back_populates="payments")
    student = relationship("Student", foreign_keys=[student_id])
    receipt = relationship("Receipt", back_populates="payment", uselist=False, cascade="all, delete-orphan")
    recorded_by = relationship("User", foreign_keys=[recorded_by_user_id])

    def __repr__(self):
        return f"<Payment {self.transaction_id} - ₹{self.amount} ({self.status})>"


class Receipt(BaseModel):
    __tablename__ = "receipts"

    receipt_number = Column(String(100), unique=True, index=True, nullable=False)
    payment_id = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True, nullable=False)
    
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    amount_paid = Column(Float, nullable=False)
    balance_due = Column(Float, default=0.0, nullable=False)
    academic_year = Column(String(50), default="2025-2026", nullable=False)
    payment_mode = Column(String(50), default="Online", nullable=False)
    download_url = Column(String(255), nullable=True)

    # Relationships
    payment = relationship("Payment", back_populates="receipt")
    student = relationship("Student", foreign_keys=[student_id])

    def __repr__(self):
        return f"<Receipt {self.receipt_number} - ₹{self.amount_paid}>"
