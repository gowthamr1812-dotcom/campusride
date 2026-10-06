from typing import List, Optional, Tuple
from datetime import date, datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.attendance import StudentAttendance, StaffAttendance
from app.models.people import Student, Driver, BusIncharge
from app.models.transport import Bus, Trip, RouteStop
from app.models.user import User
from app.core.exceptions import NotFoundException, BadRequestException
from app.schemas.attendance import (
    StudentAttendanceCreate,
    StudentAttendanceBatchCreate,
    StudentAttendanceResponse,
    StaffAttendanceCreate,
    StaffAttendanceUpdate,
    StaffAttendanceResponse,
    StudentAttendanceSummaryResponse,
    StaffAttendanceSummaryResponse
)


class StudentAttendanceService:

    @staticmethod
    def _enrich_student_attendance(att: StudentAttendance) -> StudentAttendanceResponse:
        resp = StudentAttendanceResponse.model_validate(att)
        if att.student:
            resp.student_name = att.student.name
            resp.student_roll = att.student.student_id
            resp.student_department = att.student.department
            resp.seat_number = att.student.seat
        if att.bus:
            resp.bus_number = att.bus.bus_number
        if att.stop:
            resp.stop_name = att.stop.stop_name
        return resp

    @staticmethod
    def mark_student_attendance(
        db: Session,
        data: StudentAttendanceCreate,
        marked_by_user_id: Optional[int] = None
    ) -> StudentAttendanceResponse:
        student = db.query(Student).filter(Student.id == data.student_id).first()
        if not student:
            raise NotFoundException(f"Student with ID {data.student_id} not found.")

        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise NotFoundException(f"Bus with ID {data.bus_id} not found.")

        target_date = data.date or date.today()
        trip_type = data.trip_type or "Morning Pickup"

        # Check existing attendance
        att = db.query(StudentAttendance).filter(
            StudentAttendance.student_id == data.student_id,
            StudentAttendance.date == target_date,
            StudentAttendance.trip_type == trip_type
        ).first()

        now_utc = datetime.now(timezone.utc)

        if att:
            att.status = data.status
            att.bus_id = data.bus_id
            if data.trip_id:
                att.trip_id = data.trip_id
            if data.stop_id:
                att.stop_id = data.stop_id
            if data.status == "Boarded" and not att.boarding_time:
                att.boarding_time = now_utc
            att.method = data.method or att.method
            if marked_by_user_id:
                att.marked_by_user_id = marked_by_user_id
            if data.remarks:
                att.remarks = data.remarks
        else:
            att = StudentAttendance(
                student_id=data.student_id,
                bus_id=data.bus_id,
                trip_id=data.trip_id,
                stop_id=data.stop_id,
                date=target_date,
                trip_type=trip_type,
                status=data.status,
                boarding_time=now_utc if data.status == "Boarded" else None,
                method=data.method or "Manual",
                marked_by_user_id=marked_by_user_id,
                remarks=data.remarks
            )
            db.add(att)

        db.flush()

        # Update Trip boarding count if trip_id is present
        target_trip_id = data.trip_id or att.trip_id
        if target_trip_id:
            trip = db.query(Trip).filter(Trip.id == target_trip_id).first()
            if trip:
                cnt = db.query(StudentAttendance).filter(
                    StudentAttendance.trip_id == target_trip_id,
                    StudentAttendance.status == "Boarded"
                ).count()
                trip.boarding_count = cnt

        db.commit()
        db.refresh(att)
        return StudentAttendanceService._enrich_student_attendance(att)

    @staticmethod
    def batch_mark_attendance(
        db: Session,
        data: StudentAttendanceBatchCreate,
        marked_by_user_id: Optional[int] = None
    ) -> List[StudentAttendanceResponse]:
        bus = db.query(Bus).filter(Bus.id == data.bus_id).first()
        if not bus:
            raise NotFoundException(f"Bus with ID {data.bus_id} not found.")

        target_date = data.date or date.today()
        trip_type = data.trip_type or "Morning Pickup"
        results = []
        now_utc = datetime.now(timezone.utc)

        for item in data.items:
            att = db.query(StudentAttendance).filter(
                StudentAttendance.student_id == item.student_id,
                StudentAttendance.date == target_date,
                StudentAttendance.trip_type == trip_type
            ).first()

            if att:
                att.status = item.status
                att.bus_id = data.bus_id
                if data.trip_id:
                    att.trip_id = data.trip_id
                if item.stop_id:
                    att.stop_id = item.stop_id
                if item.status == "Boarded" and not att.boarding_time:
                    att.boarding_time = now_utc
                att.method = data.method or "Manual"
                if marked_by_user_id:
                    att.marked_by_user_id = marked_by_user_id
                if item.remarks:
                    att.remarks = item.remarks
            else:
                att = StudentAttendance(
                    student_id=item.student_id,
                    bus_id=data.bus_id,
                    trip_id=data.trip_id,
                    stop_id=item.stop_id,
                    date=target_date,
                    trip_type=trip_type,
                    status=item.status,
                    boarding_time=now_utc if item.status == "Boarded" else None,
                    method=data.method or "Manual",
                    marked_by_user_id=marked_by_user_id,
                    remarks=item.remarks
                )
                db.add(att)

            results.append(att)

        db.flush()

        # Update Trip boarding count if trip_id is given
        if data.trip_id:
            trip = db.query(Trip).filter(Trip.id == data.trip_id).first()
            if trip:
                cnt = db.query(StudentAttendance).filter(
                    StudentAttendance.trip_id == data.trip_id,
                    StudentAttendance.status == "Boarded"
                ).count()
                trip.boarding_count = cnt

        db.commit()
        for r in results:
            db.refresh(r)

        return [StudentAttendanceService._enrich_student_attendance(r) for r in results]

    @staticmethod
    def list_student_attendance(
        db: Session,
        student_id: Optional[int] = None,
        bus_id: Optional[int] = None,
        trip_id: Optional[int] = None,
        target_date: Optional[date] = None,
        status: Optional[str] = None,
        trip_type: Optional[str] = None
    ) -> List[StudentAttendanceResponse]:
        query = db.query(StudentAttendance)
        if student_id:
            query = query.filter(StudentAttendance.student_id == student_id)
        if bus_id:
            query = query.filter(StudentAttendance.bus_id == bus_id)
        if trip_id:
            query = query.filter(StudentAttendance.trip_id == trip_id)
        if target_date:
            query = query.filter(StudentAttendance.date == target_date)
        if status:
            query = query.filter(StudentAttendance.status == status)
        if trip_type:
            query = query.filter(StudentAttendance.trip_type == trip_type)

        records = query.order_by(StudentAttendance.boarding_time.desc(), StudentAttendance.id.desc()).all()
        return [StudentAttendanceService._enrich_student_attendance(r) for r in records]

    @staticmethod
    def get_summary(db: Session, target_date: Optional[date] = None, bus_id: Optional[int] = None) -> StudentAttendanceSummaryResponse:
        d = target_date or date.today()
        query = db.query(StudentAttendance).filter(StudentAttendance.date == d)
        if bus_id:
            query = query.filter(StudentAttendance.bus_id == bus_id)

        all_records = query.all()
        total_boarded = sum(1 for r in all_records if r.status == "Boarded")
        total_absent = sum(1 for r in all_records if r.status == "Absent")
        total_excused = sum(1 for r in all_records if r.status == "Excused")
        
        # Expected count based on active students
        if bus_id:
            bus = db.query(Bus).filter(Bus.id == bus_id).first()
            bus_num = bus.bus_number if bus else None
            total_expected = db.query(Student).filter(Student.bus == bus_num, Student.transport_status == "Active").count()
        else:
            total_expected = db.query(Student).filter(Student.transport_status == "Active").count()

        if total_expected == 0:
            total_expected = len(all_records) or 1

        rate = round((total_boarded / total_expected) * 100, 1) if total_expected > 0 else 0.0

        return StudentAttendanceSummaryResponse(
            date=d,
            total_expected=total_expected,
            total_boarded=total_boarded,
            total_absent=total_absent,
            total_excused=total_excused,
            boarding_rate_pct=rate
        )


class StaffAttendanceService:

    @staticmethod
    def _enrich_staff_attendance(att: StaffAttendance) -> StaffAttendanceResponse:
        resp = StaffAttendanceResponse.model_validate(att)
        if att.staff_type == "DRIVER" and att.driver:
            resp.staff_name = att.driver.name
            resp.staff_code = att.driver.driver_id
            resp.phone = att.driver.phone
        elif att.staff_type == "BUS_INCHARGE" and att.incharge:
            resp.staff_name = att.incharge.name
            resp.staff_code = att.incharge.incharge_id
            resp.phone = att.incharge.phone
        if att.bus:
            resp.bus_number = att.bus.bus_number
        return resp

    @staticmethod
    def record_staff_attendance(
        db: Session,
        data: StaffAttendanceCreate,
        marked_by_user_id: Optional[int] = None
    ) -> StaffAttendanceResponse:
        target_date = data.date or date.today()
        now_utc = datetime.now(timezone.utc)

        # Look for existing record
        query = db.query(StaffAttendance).filter(
            StaffAttendance.staff_type == data.staff_type,
            StaffAttendance.date == target_date
        )
        if data.staff_type == "DRIVER":
            if not data.driver_id:
                raise BadRequestException("driver_id is required for DRIVER staff attendance.")
            query = query.filter(StaffAttendance.driver_id == data.driver_id)
        else:
            if not data.incharge_id:
                raise BadRequestException("incharge_id is required for BUS_INCHARGE staff attendance.")
            query = query.filter(StaffAttendance.incharge_id == data.incharge_id)

        att = query.first()

        if att:
            att.status = data.status
            if data.bus_id:
                att.bus_id = data.bus_id
            if data.check_in_time:
                att.check_in_time = data.check_in_time
            elif data.status == "Present" and not att.check_in_time:
                att.check_in_time = now_utc
            if data.check_out_time:
                att.check_out_time = data.check_out_time
            if data.shift:
                att.shift = data.shift
            if data.remarks:
                att.remarks = data.remarks
            if marked_by_user_id:
                att.marked_by_user_id = marked_by_user_id
        else:
            att = StaffAttendance(
                staff_type=data.staff_type,
                driver_id=data.driver_id,
                incharge_id=data.incharge_id,
                bus_id=data.bus_id,
                date=target_date,
                status=data.status,
                check_in_time=data.check_in_time or (now_utc if data.status == "Present" else None),
                check_out_time=data.check_out_time,
                shift=data.shift or "Regular Shift",
                marked_by_user_id=marked_by_user_id,
                remarks=data.remarks
            )
            db.add(att)

        db.commit()
        db.refresh(att)
        return StaffAttendanceService._enrich_staff_attendance(att)

    @staticmethod
    def list_staff_attendance(
        db: Session,
        staff_type: Optional[str] = None,
        target_date: Optional[date] = None,
        status: Optional[str] = None
    ) -> List[StaffAttendanceResponse]:
        query = db.query(StaffAttendance)
        if staff_type:
            query = query.filter(StaffAttendance.staff_type == staff_type)
        if target_date:
            query = query.filter(StaffAttendance.date == target_date)
        if status:
            query = query.filter(StaffAttendance.status == status)

        records = query.order_by(StaffAttendance.date.desc(), StaffAttendance.id.desc()).all()
        return [StaffAttendanceService._enrich_staff_attendance(r) for r in records]

    @staticmethod
    def get_staff_summary(db: Session, target_date: Optional[date] = None) -> StaffAttendanceSummaryResponse:
        d = target_date or date.today()
        records = db.query(StaffAttendance).filter(StaffAttendance.date == d).all()

        drivers_present = sum(1 for r in records if r.staff_type == "DRIVER" and r.status == "Present")
        drivers_absent = sum(1 for r in records if r.staff_type == "DRIVER" and r.status in ("Absent", "On Leave"))
        incharges_present = sum(1 for r in records if r.staff_type == "BUS_INCHARGE" and r.status == "Present")
        incharges_absent = sum(1 for r in records if r.staff_type == "BUS_INCHARGE" and r.status in ("Absent", "On Leave"))

        total_staff = len(records) or (drivers_present + drivers_absent + incharges_present + incharges_absent)
        total_present = drivers_present + incharges_present
        rate = round((total_present / total_staff) * 100, 1) if total_staff > 0 else 0.0

        return StaffAttendanceSummaryResponse(
            date=d,
            total_staff=total_staff,
            drivers_present=drivers_present,
            drivers_absent=drivers_absent,
            incharges_present=incharges_present,
            incharges_absent=incharges_absent,
            attendance_rate_pct=rate
        )
