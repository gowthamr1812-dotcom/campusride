import uuid
from typing import List, Optional
from datetime import datetime, date, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.finance import FeeStructure, StudentFee, Payment, Receipt
from app.models.people import Student
from app.models.transport import Bus, Route, RouteStop
from app.core.exceptions import NotFoundException, BadRequestException
from app.schemas.finance import (
    FeeStructureCreate,
    FeeStructureUpdate,
    FeeStructureResponse,
    StudentFeeResponse,
    PaymentCreate,
    PaymentResponse,
    ReceiptResponse,
    FinanceSummaryResponse
)


class FeeService:

    @staticmethod
    def create_fee_structure(db: Session, data: FeeStructureCreate) -> FeeStructureResponse:
        existing = db.query(FeeStructure).filter(FeeStructure.slab_name == data.slab_name).first()
        if existing:
            raise BadRequestException(f"Fee slab '{data.slab_name}' already exists.")

        fs = FeeStructure(**data.model_dump())
        db.add(fs)
        db.commit()
        db.refresh(fs)
        resp = FeeStructureResponse.model_validate(fs)
        resp.student_count = 0
        return resp

    @staticmethod
    def update_fee_structure(db: Session, structure_id: int, data: FeeStructureUpdate) -> FeeStructureResponse:
        fs = db.query(FeeStructure).filter(FeeStructure.id == structure_id).first()
        if not fs:
            raise NotFoundException(f"Fee structure with ID {structure_id} not found.")

        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(fs, key, value)

        db.commit()
        db.refresh(fs)
        resp = FeeStructureResponse.model_validate(fs)
        resp.student_count = db.query(StudentFee).filter(StudentFee.fee_structure_id == fs.id).count()
        return resp

    @staticmethod
    def list_fee_structures(
        db: Session,
        academic_year: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[FeeStructureResponse]:
        query = db.query(FeeStructure)
        if academic_year:
            query = query.filter(FeeStructure.academic_year == academic_year)
        if status:
            query = query.filter(FeeStructure.status == status)

        structures = query.order_by(FeeStructure.min_distance_km.asc()).all()
        results = []
        for fs in structures:
            resp = FeeStructureResponse.model_validate(fs)
            resp.student_count = db.query(StudentFee).filter(StudentFee.fee_structure_id == fs.id).count()
            results.append(resp)
        return results

    @staticmethod
    def list_student_fees(
        db: Session,
        student_id: Optional[int] = None,
        status: Optional[str] = None,
        academic_year: Optional[str] = None
    ) -> List[StudentFeeResponse]:
        query = db.query(StudentFee)
        if student_id:
            query = query.filter(StudentFee.student_id == student_id)
        if status:
            query = query.filter(StudentFee.status == status)
        if academic_year:
            query = query.filter(StudentFee.academic_year == academic_year)

        fees = query.order_by(StudentFee.id.desc()).all()
        results = []
        for sf in fees:
            resp = StudentFeeResponse.model_validate(sf)
            if sf.student:
                resp.student_name = sf.student.name
                resp.student_roll = sf.student.student_id
                resp.student_department = sf.student.department
                resp.bus_number = sf.student.bus
            if sf.fee_structure:
                resp.slab_name = sf.fee_structure.slab_name
            results.append(resp)
        return results

    @staticmethod
    def get_finance_summary(db: Session, academic_year: str = "2025-2026") -> FinanceSummaryResponse:
        fees = db.query(StudentFee).filter(StudentFee.academic_year == academic_year).all()

        total_assessed = sum(f.total_amount for f in fees)
        total_collected = sum(f.paid_amount for f in fees)
        total_pending = sum(f.pending_amount for f in fees)
        rate = round((total_collected / total_assessed) * 100, 1) if total_assessed > 0 else 0.0

        fully_paid = sum(1 for f in fees if f.status == "Paid")
        partial_paid = sum(1 for f in fees if f.status == "Partial")
        pending = sum(1 for f in fees if f.status in ("Pending", "Overdue"))

        return FinanceSummaryResponse(
            academic_year=academic_year,
            total_assessed=total_assessed,
            total_collected=total_collected,
            total_pending=total_pending,
            collection_rate_pct=rate,
            fully_paid_students=fully_paid,
            partial_paid_students=partial_paid,
            pending_students=pending
        )


class PaymentService:

    @staticmethod
    def _enrich_payment(payment: Payment) -> PaymentResponse:
        resp = PaymentResponse.model_validate(payment)
        if payment.student:
            resp.student_name = payment.student.name
            resp.student_roll = payment.student.student_id
            resp.bus_number = payment.student.bus
        if payment.receipt:
            resp.receipt_number = payment.receipt.receipt_number
        return resp

    @staticmethod
    def process_payment(
        db: Session,
        data: PaymentCreate,
        recorded_by_user_id: Optional[int] = None
    ) -> PaymentResponse:
        student = db.query(Student).filter(Student.id == data.student_id).first()
        if not student:
            raise NotFoundException(f"Student with ID {data.student_id} not found.")

        # Find or create StudentFee
        student_fee = None
        if data.student_fee_id:
            student_fee = db.query(StudentFee).filter(StudentFee.id == data.student_fee_id).first()
        if not student_fee:
            student_fee = db.query(StudentFee).filter(
                StudentFee.student_id == student.id,
                StudentFee.academic_year == "2025-2026"
            ).first()

        # If still no fee liability, create a default base transport fee
        if not student_fee:
            student_fee = StudentFee(
                student_id=student.id,
                academic_year="2025-2026",
                total_amount=data.amount,
                paid_amount=0.0,
                pending_amount=data.amount,
                status="Pending"
            )
            db.add(student_fee)
            db.flush()

        # Generate unique transaction ID
        txn_id = f"PAY-{datetime.now().strftime('%Y%m')}-{uuid.uuid4().hex[:6].upper()}"

        payment = Payment(
            transaction_id=txn_id,
            student_fee_id=student_fee.id,
            student_id=student.id,
            amount=data.amount,
            payment_method=data.payment_method,
            payment_gateway_ref=data.payment_gateway_ref,
            payment_date=datetime.now(timezone.utc),
            status="Success",
            notes=data.notes,
            recorded_by_user_id=recorded_by_user_id
        )
        db.add(payment)
        db.flush()

        # Update fee liability
        student_fee.paid_amount += data.amount
        student_fee.pending_amount = max(0.0, student_fee.total_amount - student_fee.paid_amount)
        if student_fee.pending_amount <= 0:
            student_fee.status = "Paid"
        else:
            student_fee.status = "Partial"

        # Sync student profile payment status
        student.payment_status = student_fee.status

        # Auto-generate Official Receipt
        receipt_num = f"REC-2026-{uuid.uuid4().hex[:6].upper()}"
        receipt = Receipt(
            receipt_number=receipt_num,
            payment_id=payment.id,
            student_id=student.id,
            issued_at=datetime.now(timezone.utc),
            amount_paid=data.amount,
            balance_due=student_fee.pending_amount,
            academic_year="2025-2026",
            payment_mode=data.payment_method
        )
        db.add(receipt)

        db.commit()
        db.refresh(payment)
        return PaymentService._enrich_payment(payment)

    @staticmethod
    def list_payments(
        db: Session,
        student_id: Optional[int] = None,
        status: Optional[str] = None,
        payment_method: Optional[str] = None
    ) -> List[PaymentResponse]:
        query = db.query(Payment)
        if student_id:
            query = query.filter(Payment.student_id == student_id)
        if status:
            query = query.filter(Payment.status == status)
        if payment_method:
            query = query.filter(Payment.payment_method == payment_method)

        payments = query.order_by(Payment.payment_date.desc()).all()
        return [PaymentService._enrich_payment(p) for p in payments]


class ReceiptService:

    @staticmethod
    def _enrich_receipt(receipt: Receipt, db: Session) -> ReceiptResponse:
        resp = ReceiptResponse.model_validate(receipt)
        if receipt.student:
            resp.student_name = receipt.student.name
            resp.student_roll = receipt.student.student_id
            resp.student_department = receipt.student.department
            resp.student_year = receipt.student.year
            resp.bus_number = receipt.student.bus
            resp.stop_name = receipt.student.stop
            resp.route_name = receipt.student.route
        if receipt.payment:
            resp.transaction_id = receipt.payment.transaction_id
        return resp

    @staticmethod
    def get_receipt(db: Session, identifier: str) -> ReceiptResponse:
        # Check by ID or receipt_number
        query = db.query(Receipt)
        if identifier.isdigit():
            query = query.filter((Receipt.id == int(identifier)) | (Receipt.receipt_number == identifier))
        else:
            query = query.filter(Receipt.receipt_number == identifier)

        receipt = query.first()
        if not receipt:
            raise NotFoundException(f"Receipt '{identifier}' not found.")

        return ReceiptService._enrich_receipt(receipt, db=db)

    @staticmethod
    def list_receipts(
        db: Session,
        student_id: Optional[int] = None,
        academic_year: Optional[str] = None
    ) -> List[ReceiptResponse]:
        query = db.query(Receipt)
        if student_id:
            query = query.filter(Receipt.student_id == student_id)
        if academic_year:
            query = query.filter(Receipt.academic_year == academic_year)

        receipts = query.order_by(Receipt.issued_at.desc()).all()
        return [ReceiptService._enrich_receipt(r, db=db) for r in receipts]
