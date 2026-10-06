from datetime import date, datetime, time, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.core.database import SessionLocal

from app.models.attendance import StudentAttendance, StaffAttendance
from app.models.people import Student, Driver, BusIncharge
from app.models.transport import Bus, Trip, RouteStop
from app.models.user import User


def seed_attendance(db: Optional[Session] = None):
    close_db = False
    if db is None:
        db = SessionLocal()
        close_db = True

    try:
        today = date.today()
        
        # Check if student attendance is already seeded for today
        existing_att_count = db.query(StudentAttendance).filter(StudentAttendance.date == today).count()
        if existing_att_count > 0:
            return

        students = db.query(Student).filter(Student.transport_status == "Active").all()
        buses = db.query(Bus).all()
        bus_map = {b.bus_number: b for b in buses}
        trips = db.query(Trip).all()
        trip_map = {t.bus_id: t for t in trips}

        # Find an admin or incharge user for the marked_by_user_id
        admin_user = db.query(User).filter(User.username == "admin").first()
        marked_by_id = admin_user.id if admin_user else None

        # 1. Seed Student Attendance
        for idx, student in enumerate(students):
            bus_obj = bus_map.get(student.bus)
            if not bus_obj:
                continue

            trip_obj = trip_map.get(bus_obj.id)
            trip_id = trip_obj.id if trip_obj else None

            # Resolve stop ID if available
            stop_id = None
            if bus_obj.assigned_route_id and student.stop:
                stop_match = db.query(RouteStop).filter(
                    RouteStop.route_id == bus_obj.assigned_route_id,
                    RouteStop.stop_name.ilike(f"%{student.stop}%")
                ).first()
                if stop_match:
                    stop_id = stop_match.id

            # 90% boarded, 8% absent, 2% excused
            if idx % 12 == 0:
                status = "Absent"
                boarding_dt = None
                method = "Manual"
                remarks = "Not at boarding point"
            elif idx % 25 == 0:
                status = "Excused"
                boarding_dt = None
                method = "Manual"
                remarks = "Medical leave submitted"
            else:
                status = "Boarded"
                minute_offset = (idx * 3) % 45
                boarding_dt = datetime.combine(
                    today,
                    time(hour=7, minute=15 + minute_offset),
                    tzinfo=timezone.utc
                )
                method = "RFID" if idx % 2 == 0 else "Manual"
                remarks = None

            att = StudentAttendance(
                student_id=student.id,
                bus_id=bus_obj.id,
                trip_id=trip_id,
                stop_id=stop_id,
                date=today,
                trip_type="Morning Pickup",
                status=status,
                boarding_time=boarding_dt,
                method=method,
                marked_by_user_id=marked_by_id,
                remarks=remarks
            )
            db.add(att)

        db.flush()

        # Update boarding_count on all trips
        for trip in trips:
            cnt = db.query(StudentAttendance).filter(
                StudentAttendance.trip_id == trip.id,
                StudentAttendance.status == "Boarded"
            ).count()
            trip.boarding_count = cnt

        # 2. Seed Staff Attendance (Drivers and Bus Incharges)
        drivers = db.query(Driver).all()
        for idx, drv in enumerate(drivers):
            bus_obj = bus_map.get(drv.assigned_bus)
            bus_id = bus_obj.id if bus_obj else None

            if idx == 19:
                status = "On Leave"
                check_in = None
                remarks = "Approved medical leave"
            elif idx == 18:
                status = "Late"
                check_in = datetime.combine(today, time(hour=7, minute=20), tzinfo=timezone.utc)
                remarks = "Traffic delay"
            else:
                status = "Present"
                check_in = datetime.combine(today, time(hour=6, minute=45), tzinfo=timezone.utc)
                remarks = "Pre-trip vehicle check signed"

            staff_att = StaffAttendance(
                staff_type="DRIVER",
                driver_id=drv.id,
                user_id=drv.user_id,
                bus_id=bus_id,
                date=today,
                status=status,
                check_in_time=check_in,
                shift="Morning Shift",
                marked_by_user_id=marked_by_id,
                remarks=remarks
            )
            db.add(staff_att)

        incharges = db.query(BusIncharge).all()
        for idx, inc in enumerate(incharges):
            bus_obj = bus_map.get(inc.assigned_bus)
            bus_id = bus_obj.id if bus_obj else None

            if idx == 19:
                status = "Absent"
                check_in = None
                remarks = "Substitute incharge assigned"
            else:
                status = "Present"
                check_in = datetime.combine(today, time(hour=6, minute=55), tzinfo=timezone.utc)
                remarks = "Manifest & emergency kit verified"

            inc_att = StaffAttendance(
                staff_type="BUS_INCHARGE",
                incharge_id=inc.id,
                user_id=inc.user_id,
                bus_id=bus_id,
                date=today,
                status=status,
                check_in_time=check_in,
                shift="Morning Shift",
                marked_by_user_id=marked_by_id,
                remarks=remarks
            )
            db.add(inc_att)

        db.commit()
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_attendance()
