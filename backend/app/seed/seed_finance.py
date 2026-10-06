import uuid
from typing import Optional
from datetime import datetime, date, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal

from app.models.finance import FeeStructure, StudentFee, Payment, Receipt
from app.models.people import Student
from app.models.transport import Bus, Route
from app.models.user import User


FEE_SLABS = [
    {
        "academic_year": "2025-2026",
        "slab_name": "Tier 1: Up to 15 km",
        "min_distance_km": 0.0,
        "max_distance_km": 15.0,
        "amount": 18000.0,
        "billing_frequency": "Annual",
        "due_date": date(2025, 9, 30),
        "description": "Standard suburban campus transit for distances under 15 km.",
        "status": "Active"
    },
    {
        "academic_year": "2025-2026",
        "slab_name": "Tier 2: 15 to 30 km",
        "min_distance_km": 15.0,
        "max_distance_km": 30.0,
        "amount": 24000.0,
        "billing_frequency": "Annual",
        "due_date": date(2025, 9, 30),
        "description": "Mid-distance metropolitan transit covering suburban arterial junctions.",
        "status": "Active"
    },
    {
        "academic_year": "2025-2026",
        "slab_name": "Tier 3: 30 to 45 km",
        "min_distance_km": 30.0,
        "max_distance_km": 45.0,
        "amount": 30000.0,
        "billing_frequency": "Annual",
        "due_date": date(2025, 9, 30),
        "description": "Extended arterial routes covering central city terminals.",
        "status": "Active"
    },
    {
        "academic_year": "2025-2026",
        "slab_name": "Tier 4: Long Distance Corridor (>45 km)",
        "min_distance_km": 45.0,
        "max_distance_km": 80.0,
        "amount": 36000.0,
        "billing_frequency": "Annual",
        "due_date": date(2025, 9, 30),
        "description": "Long-range highway commuter coach pass with express stop privileges.",
        "status": "Active"
    }
]


def seed_finance(db: Optional[Session] = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Check if fee structures exist
        existing_fs = db.query(FeeStructure).count()
        if existing_fs == 0:
            for s in FEE_SLABS:
                fs = FeeStructure(**s)
                db.add(fs)
            db.commit()

        # Check if student fees already generated
        existing_sf = db.query(StudentFee).count()
        if existing_sf > 0:
            return

        slabs = db.query(FeeStructure).order_by(FeeStructure.min_distance_km.asc()).all()
        students = db.query(Student).all()
        admin_user = db.query(User).filter(User.username == "admin").first()
        admin_id = admin_user.id if admin_user else None

        now_utc = datetime.now(timezone.utc)

        for idx, stu in enumerate(students):
            # Select slab based on index or route distance
            slab = slabs[idx % len(slabs)]
            total = slab.amount

            # 80% Paid, 14% Partial, 6% Pending
            if idx % 16 == 0:
                # Pending
                status = "Pending"
                paid = 0.0
                pending = total
            elif idx % 7 == 0:
                # Partial
                status = "Partial"
                paid = total / 2.0
                pending = total / 2.0
            else:
                # Paid
                status = "Paid"
                paid = total
                pending = 0.0

            sf = StudentFee(
                student_id=stu.id,
                fee_structure_id=slab.id,
                academic_year="2025-2026",
                total_amount=total,
                paid_amount=paid,
                pending_amount=pending,
                status=status,
                due_date=slab.due_date
            )
            db.add(sf)
            db.flush()

            stu.payment_status = status

            # If paid or partial, record Payment and Receipt
            if paid > 0:
                payment_method = "UPI" if idx % 3 == 0 else "Online" if idx % 3 == 1 else "NetBanking"
                txn_code = f"PAY-2026-{idx+1:04d}-{uuid.uuid4().hex[:4].upper()}"
                
                payment = Payment(
                    transaction_id=txn_code,
                    student_fee_id=sf.id,
                    student_id=stu.id,
                    amount=paid,
                    payment_method=payment_method,
                    payment_gateway_ref=f"RZP_ORD_{idx+1:05d}",
                    payment_date=now_utc - timedelta(days=(idx % 60)),
                    status="Success",
                    notes="Annual Transport Pass installment" if status == "Partial" else "Full Annual Transport Pass fee",
                    recorded_by_user_id=admin_id
                )
                db.add(payment)
                db.flush()

                # Receipt
                rec_num = f"REC-2026-{idx+1:04d}"
                receipt = Receipt(
                    receipt_number=rec_num,
                    payment_id=payment.id,
                    student_id=stu.id,
                    issued_at=payment.payment_date,
                    amount_paid=paid,
                    balance_due=pending,
                    academic_year="2025-2026",
                    payment_mode=payment_method
                )
                db.add(receipt)

        db.commit()
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_finance()
