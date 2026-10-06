from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.models.people import Driver, BusIncharge, Student
from app.models.user import User, UserRole
from app.schemas.people import (
    DriverCreate, DriverUpdate,
    BusInchargeCreate, BusInchargeUpdate,
    StudentCreate, StudentUpdate
)
from app.core.exceptions import EntityNotFoundException, ForbiddenException, CampusRideException


# ==================== DRIVER SERVICE ====================
class DriverService:
    @staticmethod
    def list_drivers(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        bus: Optional[str] = None
    ) -> List[Driver]:
        query = db.query(Driver)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Driver.name.ilike(pattern),
                    Driver.driver_id.ilike(pattern),
                    Driver.license_number.ilike(pattern),
                    Driver.phone.ilike(pattern)
                )
            )

        if status:
            query = query.filter(Driver.status == status)

        if bus:
            query = query.filter(Driver.assigned_bus == bus)

        return query.order_by(Driver.driver_id.asc()).all()

    @staticmethod
    def get_driver(db: Session, driver_identifier: str | int) -> Driver:
        if isinstance(driver_identifier, int) or str(driver_identifier).isdigit():
            driver = db.query(Driver).filter(
                or_(Driver.id == int(driver_identifier), Driver.driver_id == str(driver_identifier))
            ).first()
        else:
            driver = db.query(Driver).filter(Driver.driver_id == driver_identifier).first()

        if not driver:
            raise EntityNotFoundException("Driver", driver_identifier)
        return driver

    @staticmethod
    def create_driver(db: Session, data: DriverCreate) -> Driver:
        existing = db.query(Driver).filter(
            or_(Driver.driver_id == data.driver_id, Driver.license_number == data.license_number)
        ).first()
        if existing:
            raise CampusRideException(
                "Driver with this ID or License Number already exists.",
                code="DRIVER_DUPLICATE",
                status_code=400
            )

        driver = Driver(**data.model_dump())
        db.add(driver)
        db.commit()
        db.refresh(driver)
        return driver

    @staticmethod
    def update_driver(db: Session, driver_identifier: str | int, data: DriverUpdate) -> Driver:
        driver = DriverService.get_driver(db, driver_identifier)
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(driver, field, value)

        db.commit()
        db.refresh(driver)
        return driver

    @staticmethod
    def delete_driver(db: Session, driver_identifier: str | int) -> bool:
        driver = DriverService.get_driver(db, driver_identifier)
        db.delete(driver)
        db.commit()
        return True


# ==================== BUS INCHARGE SERVICE ====================
class BusInchargeService:
    @staticmethod
    def list_incharges(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        bus: Optional[str] = None
    ) -> List[BusIncharge]:
        query = db.query(BusIncharge)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    BusIncharge.name.ilike(pattern),
                    BusIncharge.incharge_id.ilike(pattern),
                    BusIncharge.employee_id.ilike(pattern),
                    BusIncharge.phone.ilike(pattern)
                )
            )

        if status:
            query = query.filter(BusIncharge.status == status)

        if bus:
            query = query.filter(BusIncharge.assigned_bus == bus)

        return query.order_by(BusIncharge.incharge_id.asc()).all()

    @staticmethod
    def get_incharge(db: Session, incharge_identifier: str | int) -> BusIncharge:
        if isinstance(incharge_identifier, int) or str(incharge_identifier).isdigit():
            incharge = db.query(BusIncharge).filter(
                or_(BusIncharge.id == int(incharge_identifier), BusIncharge.incharge_id == str(incharge_identifier))
            ).first()
        else:
            incharge = db.query(BusIncharge).filter(BusIncharge.incharge_id == incharge_identifier).first()

        if not incharge:
            raise EntityNotFoundException("Bus Incharge", incharge_identifier)
        return incharge

    @staticmethod
    def create_incharge(db: Session, data: BusInchargeCreate) -> BusIncharge:
        existing = db.query(BusIncharge).filter(
            or_(BusIncharge.incharge_id == data.incharge_id, BusIncharge.employee_id == data.employee_id)
        ).first()
        if existing:
            raise CampusRideException(
                "Bus Incharge with this ID or Employee ID already exists.",
                code="INCHARGE_DUPLICATE",
                status_code=400
            )

        incharge = BusIncharge(**data.model_dump())
        db.add(incharge)
        db.commit()
        db.refresh(incharge)
        return incharge

    @staticmethod
    def update_incharge(db: Session, incharge_identifier: str | int, data: BusInchargeUpdate) -> BusIncharge:
        incharge = BusInchargeService.get_incharge(db, incharge_identifier)
        update_data = data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            setattr(incharge, field, value)

        db.commit()
        db.refresh(incharge)
        return incharge

    @staticmethod
    def delete_incharge(db: Session, incharge_identifier: str | int) -> bool:
        incharge = BusInchargeService.get_incharge(db, incharge_identifier)
        db.delete(incharge)
        db.commit()
        return True


# ==================== STUDENT SERVICE ====================
class StudentService:
    @staticmethod
    def list_students(
        db: Session,
        current_user: User,
        search: Optional[str] = None,
        department: Optional[str] = None,
        year: Optional[int] = None,
        bus: Optional[str] = None,
        route: Optional[str] = None,
        transport_status: Optional[str] = None,
        payment_status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[int, int, List[Student]]:
        query = db.query(Student)

        # RBAC Privacy Enforcement (Section 11, Section 9, Section 10)
        if current_user.role == UserRole.STUDENT:
            # Student can only access their own profile
            query = query.filter(
                or_(
                    Student.user_id == current_user.id,
                    Student.student_id == current_user.username,
                    Student.phone == current_user.phone
                )
            )
        elif current_user.role == UserRole.BUS_INCHARGE:
            # Bus Incharge can only see students on their assigned bus
            incharge_record = db.query(BusIncharge).filter(
                or_(BusIncharge.user_id == current_user.id, BusIncharge.email == current_user.email)
            ).first()
            assigned_bus = incharge_record.assigned_bus if incharge_record else "BUS-07"
            query = query.filter(Student.bus == assigned_bus)
        elif current_user.role == UserRole.DRIVER:
            # Driver cannot view private student directory
            raise ForbiddenException("Drivers are not authorized to view the student directory.")

        # Standard filters for authorized roles (Admin, Transport Manager, Bus Incharge)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Student.name.ilike(pattern),
                    Student.student_id.ilike(pattern),
                    Student.phone.ilike(pattern),
                    Student.stop.ilike(pattern)
                )
            )

        if department:
            query = query.filter(Student.department == department)

        if year:
            query = query.filter(Student.year == year)

        if bus:
            query = query.filter(Student.bus == bus)

        if route:
            query = query.filter(Student.route.ilike(f"%{route}%"))

        if transport_status:
            query = query.filter(Student.transport_status == transport_status)

        if payment_status:
            query = query.filter(Student.payment_status == payment_status)

        total = query.count()
        total_pages = max(1, (total + page_size - 1) // page_size)

        offset = (page - 1) * page_size
        items = query.order_by(Student.student_id.asc()).offset(offset).limit(page_size).all()

        return total, total_pages, items

    @staticmethod
    def get_student(db: Session, current_user: User, student_identifier: str | int) -> Student:
        if isinstance(student_identifier, int) or str(student_identifier).isdigit():
            student = db.query(Student).filter(
                or_(Student.id == int(student_identifier), Student.student_id == str(student_identifier))
            ).first()
        else:
            student = db.query(Student).filter(Student.student_id == student_identifier).first()

        if not student:
            raise EntityNotFoundException("Student", student_identifier)

        # RBAC Privacy Enforcement
        if current_user.role == UserRole.STUDENT:
            if student.user_id != current_user.id and student.student_id != current_user.username:
                raise ForbiddenException("You are not authorized to view other students' records.")
        elif current_user.role == UserRole.BUS_INCHARGE:
            incharge_record = db.query(BusIncharge).filter(BusIncharge.user_id == current_user.id).first()
            assigned_bus = incharge_record.assigned_bus if incharge_record else "BUS-07"
            if student.bus != assigned_bus:
                raise ForbiddenException("You can only view students assigned to your specific bus.")
        elif current_user.role == UserRole.DRIVER:
            raise ForbiddenException("Drivers are not authorized to inspect student personal profiles.")

        return student

    @staticmethod
    def create_student(db: Session, data: StudentCreate) -> Student:
        existing = db.query(Student).filter(Student.student_id == data.student_id).first()
        if existing:
            raise CampusRideException(
                "Student with this ID already exists.",
                code="STUDENT_DUPLICATE",
                status_code=400
            )

        student = Student(**data.model_dump())
        db.add(student)
        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def update_student(db: Session, student_identifier: str | int, data: StudentUpdate) -> Student:
        student = db.query(Student).filter(
            or_(Student.id == int(student_identifier) if str(student_identifier).isdigit() else False,
                Student.student_id == str(student_identifier))
        ).first()
        if not student:
            raise EntityNotFoundException("Student", student_identifier)

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)

        db.commit()
        db.refresh(student)
        return student

    @staticmethod
    def delete_student(db: Session, student_identifier: str | int) -> bool:
        student = db.query(Student).filter(
            or_(Student.id == int(student_identifier) if str(student_identifier).isdigit() else False,
                Student.student_id == str(student_identifier))
        ).first()
        if not student:
            raise EntityNotFoundException("Student", student_identifier)

        db.delete(student)
        db.commit()
        return True
