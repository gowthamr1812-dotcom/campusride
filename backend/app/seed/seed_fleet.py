from datetime import date, datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal

from app.models.fleet import MaintenanceLog, FuelLog, VehicleDocument
from app.models.transport import Bus
from app.models.people import Driver
from app.models.user import User


SERVICE_TYPES = [
    ("Routine Inspection", "Quarterly 40-point safety and mechanical inspection.", 3500.0),
    ("Oil & Filter Change", "Engine lubricant drained and synthetic oil replaced with OEM filter.", 8200.0),
    ("Brake Service", "Front and rear brake shoe replacement, liner skimming and fluid bleed.", 14500.0),
    ("Tire Replacement", "Twin radial rear tires replaced with Michelin commercial grade.", 36000.0),
    ("Electrical & Lighting", "Headlamp relay, alternator wiring harness, and cabin LED repair.", 4800.0),
    ("AC Compressor Servicing", "Compressor gas recharge (R134a) and cabin blower filter cleaning.", 11200.0),
    ("Suspension Overhaul", "Leaf spring bush replacement and shock absorber replacement.", 22000.0)
]


def seed_fleet(db: Optional[Session] = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        # Check if already seeded
        if db.query(MaintenanceLog).count() > 0:
            return

        buses = db.query(Bus).all()
        drivers = db.query(Driver).all()
        admin_user = db.query(User).filter(User.username == "admin").first()
        admin_id = admin_user.id if admin_user else None

        today = date.today()

        # 1. Seed Maintenance Logs (25 logs)
        for idx, bus in enumerate(buses):
            driver = drivers[idx % len(drivers)]
            srv = SERVICE_TYPES[idx % len(SERVICE_TYPES)]

            # Bus 20 has Critical Maintenance
            if bus.bus_number == "BUS-20":
                status = "Critical"
                priority = "Critical"
                cost = 45000.0
                desc = "Engine coolant leakage and head gasket replacement required urgently."
                vendor = "Ashok Leyland Authorized Central Depot"
                comp_date = None
                bus.status = "Maintenance"
            elif idx in [5, 11]:
                status = "In Progress"
                priority = "High"
                cost = srv[2]
                desc = srv[1]
                vendor = "Sri Venkateswara Heavy Commercial Works"
                comp_date = None
            elif idx in [4, 9]:
                status = "Scheduled"
                priority = "Medium"
                cost = srv[2]
                desc = srv[1]
                vendor = "TVS Commercial Fleet Center"
                comp_date = None
            else:
                status = "Completed"
                priority = "Low"
                cost = srv[2]
                desc = srv[1]
                vendor = "Ashok Leyland Service Center"
                comp_date = today - timedelta(days=(idx * 2))

            m_log = MaintenanceLog(
                bus_id=bus.id,
                driver_id=driver.id,
                reported_by_user_id=admin_id,
                service_type=srv[0],
                description=desc,
                service_date=today - timedelta(days=(idx * 4)),
                completion_date=comp_date,
                odometer_reading=bus.odometer - (idx * 150),
                cost=cost,
                vendor_name=vendor,
                invoice_number=f"INV-2026-SRV-{100 + idx}",
                status=status,
                priority=priority
            )
            db.add(m_log)

        # Extra 5 completed routine checks
        for extra in range(5):
            bus = buses[extra]
            db.add(MaintenanceLog(
                bus_id=bus.id,
                driver_id=drivers[extra].id,
                reported_by_user_id=admin_id,
                service_type="Routine Inspection",
                description="General fitness verification prior to semester run.",
                service_date=today - timedelta(days=60 + extra * 5),
                completion_date=today - timedelta(days=59 + extra * 5),
                odometer_reading=bus.odometer - 2000,
                cost=2500.0,
                vendor_name="Campus Auto Garage",
                invoice_number=f"INV-2025-SRV-{200 + extra}",
                status="Completed",
                priority="Low"
            ))

        # 2. Seed Fuel Logs (40 logs, 2 fills per bus)
        for idx, bus in enumerate(buses):
            driver = drivers[idx % len(drivers)]

            # First fill: 2 weeks ago
            liters_1 = 65.0
            rate_1 = 94.50
            cost_1 = round(liters_1 * rate_1, 2)
            db.add(FuelLog(
                bus_id=bus.id,
                driver_id=driver.id,
                recorded_by_user_id=admin_id,
                log_date=today - timedelta(days=14),
                liters_filled=liters_1,
                rate_per_liter=rate_1,
                total_cost=cost_1,
                odometer_reading=bus.odometer - 450,
                fuel_station="Indian Oil Campus Depot",
                fuel_level_after_fill=100.0,
                payment_mode="Fleet Card",
                invoice_slip_number=f"IOCL-SLIP-{1000 + idx}",
                notes="Bi-weekly scheduled top-up"
            ))

            # Second fill: 2 days ago
            liters_2 = 55.0
            rate_2 = 94.50
            cost_2 = round(liters_2 * rate_2, 2)
            db.add(FuelLog(
                bus_id=bus.id,
                driver_id=driver.id,
                recorded_by_user_id=admin_id,
                log_date=today - timedelta(days=2),
                liters_filled=liters_2,
                rate_per_liter=rate_2,
                total_cost=cost_2,
                odometer_reading=bus.odometer,
                fuel_station="Bharat Petroleum Highway Outlet",
                fuel_level_after_fill=bus.fuel_level_percent or 85.0,
                payment_mode="Fleet Card",
                invoice_slip_number=f"BPCL-SLIP-{2000 + idx}",
                notes="Regular route refuel"
            ))

        # 3. Seed Vehicle Compliance Documents (4 documents per bus = 80 total)
        for idx, bus in enumerate(buses):
            # RC Book (Valid 10 years)
            db.add(VehicleDocument(
                bus_id=bus.id,
                document_type="RC Book",
                document_number=f"RC-{bus.registration_number.replace(' ', '')}",
                issuing_authority="Regional Transport Office (RTO) Chennai Central",
                issue_date=date(2021, 5, 10),
                expiry_date=date(2036, 5, 9),
                status="Valid",
                notes="Permanent commercial passenger permit registration."
            ))

            # Insurance Policy (Annual)
            # Make buses 3 and 7 expiring soon (within 20 days)
            if idx == 3:
                ins_exp = today + timedelta(days=14)
                ins_stat = "Expiring Soon"
            elif idx == 7:
                ins_exp = today + timedelta(days=22)
                ins_stat = "Expiring Soon"
            else:
                ins_exp = today + timedelta(days=200 + idx * 5)
                ins_stat = "Valid"

            db.add(VehicleDocument(
                bus_id=bus.id,
                document_type="Commercial Insurance",
                document_number=f"POL-ICICI-COMM-{8000 + idx}",
                issuing_authority="ICICI Lombard General Insurance Co.",
                issue_date=today - timedelta(days=165),
                expiry_date=ins_exp,
                status=ins_stat,
                notes="Comprehensive commercial fleet cover with third-party liability."
            ))

            # Fitness Certificate (FC)
            # Make bus 12 expiring in 8 days
            if idx == 12:
                fc_exp = today + timedelta(days=8)
                fc_stat = "Expiring Soon"
            else:
                fc_exp = today + timedelta(days=120 + idx * 7)
                fc_stat = "Valid"

            db.add(VehicleDocument(
                bus_id=bus.id,
                document_type="Fitness Certificate (FC)",
                document_number=f"FC-TN01-{2025 + idx}",
                issuing_authority="RTO Vehicle Inspection Wing",
                issue_date=today - timedelta(days=245),
                expiry_date=fc_exp,
                status=fc_stat,
                notes="Annual structural, brake, and emission roadworthiness certification."
            ))

            # Pollution Under Control (PUC)
            db.add(VehicleDocument(
                bus_id=bus.id,
                document_type="Pollution Certificate (PUC)",
                document_number=f"PUC-CHEN-{5000 + idx}",
                issuing_authority="Tamil Nadu Pollution Control Board Approved Center",
                issue_date=today - timedelta(days=40),
                expiry_date=today + timedelta(days=140),
                status="Valid",
                notes="BS-VI emission compliance verified."
            ))

        db.commit()
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_fleet()
