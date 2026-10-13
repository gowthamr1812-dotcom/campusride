from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.models.transport import Bus, Route, RouteStop, BusSeat, Trip
from app.models.people import Student
from app.schemas.transport import (
    BusCreate, BusUpdate, BusSummaryResponse,
    RouteCreate, RouteUpdate, RouteStopCreate, RouteStopUpdate,
    TripCreate, TripUpdate
)
from app.core.exceptions import EntityNotFoundException, CampusRideException


# ==================== BUS SERVICE ====================
class BusService:
    @staticmethod
    def list_buses(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None,
        route_id: Optional[int] = None
    ) -> List[Bus]:
        query = db.query(Bus)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    Bus.bus_number.ilike(pattern),
                    Bus.registration_number.ilike(pattern),
                    Bus.gps_device_id.ilike(pattern)
                )
            )

        if status:
            query = query.filter(Bus.status == status)

        if route_id:
            query = query.filter(Bus.assigned_route_id == route_id)

        return query.order_by(Bus.bus_number.asc()).all()

    @staticmethod
    def get_bus(db: Session, bus_identifier: str | int) -> Bus:
        if isinstance(bus_identifier, int) or str(bus_identifier).isdigit():
            bus = db.query(Bus).filter(
                or_(Bus.id == int(bus_identifier), Bus.bus_number == str(bus_identifier))
            ).first()
        else:
            bus = db.query(Bus).filter(Bus.bus_number == bus_identifier).first()

        if not bus:
            raise EntityNotFoundException("Bus", bus_identifier)
        return bus

    @staticmethod
    def get_bus_summary(db: Session) -> BusSummaryResponse:
        total = db.query(Bus).count()
        running = db.query(Bus).filter(Bus.status == "Running").count()
        delayed = db.query(Bus).filter(Bus.status == "Delayed").count()
        stopped = db.query(Bus).filter(Bus.status == "Stopped").count()
        offline = db.query(Bus).filter(Bus.status == "Offline").count()
        maintenance = db.query(Bus).filter(Bus.status == "Maintenance").count()

        return BusSummaryResponse(
            total_buses=total,
            running=running,
            delayed=delayed,
            stopped=stopped,
            offline=offline,
            maintenance=maintenance
        )

    @staticmethod
    def create_bus(db: Session, data: BusCreate) -> Bus:
        existing = db.query(Bus).filter(
            or_(Bus.bus_number == data.bus_number, Bus.registration_number == data.registration_number)
        ).first()
        if existing:
            raise CampusRideException("Bus with this Number or Registration already exists.", code="BUS_DUPLICATE", status_code=400)

        bus = Bus(**data.model_dump())
        db.add(bus)
        db.commit()
        db.refresh(bus)

        # Automatically initialize seats based on capacity
        seats = []
        for i in range(1, bus.capacity + 1):
            row = (i + 1) // 2
            col = 'A' if i % 2 == 1 else 'B'
            seat_num = f"{row:02d}{col}"
            is_window = (col in ['A', 'D'])
            seats.append(BusSeat(
                bus_id=bus.id,
                seat_number=seat_num,
                status="Available",
                is_window=is_window
            ))
        db.bulk_save_objects(seats)
        db.commit()

        return bus

    @staticmethod
    def update_bus(db: Session, bus_identifier: str | int, data: BusUpdate) -> Bus:
        bus = BusService.get_bus(db, bus_identifier)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(bus, field, value)
        db.commit()
        db.refresh(bus)
        return bus

    @staticmethod
    def delete_bus(db: Session, bus_identifier: str | int) -> bool:
        bus = BusService.get_bus(db, bus_identifier)
        db.delete(bus)
        db.commit()
        return True


# ==================== ROUTE SERVICE ====================
class RouteService:
    @staticmethod
    def list_routes(
        db: Session,
        search: Optional[str] = None,
        status: Optional[str] = None
    ) -> List[Route]:
        query = db.query(Route)

        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(Route.name.ilike(pattern), Route.route_code.ilike(pattern), Route.start_location.ilike(pattern))
            )

        if status:
            query = query.filter(Route.status == status)

        return query.order_by(Route.route_code.asc()).all()

    @staticmethod
    def get_route(db: Session, route_identifier: str | int) -> Route:
        if isinstance(route_identifier, int) or str(route_identifier).isdigit():
            route = db.query(Route).filter(
                or_(Route.id == int(route_identifier), Route.route_code == str(route_identifier))
            ).first()
        else:
            route = db.query(Route).filter(Route.route_code == route_identifier).first()

        if not route:
            raise EntityNotFoundException("Route", route_identifier)
        return route

    @staticmethod
    def create_route(db: Session, data: RouteCreate) -> Route:
        existing = db.query(Route).filter(
            or_(Route.route_code == data.route_code, Route.name == data.name)
        ).first()
        if existing:
            raise CampusRideException("Route with this Code or Name already exists.", code="ROUTE_DUPLICATE", status_code=400)

        route = Route(**data.model_dump())
        db.add(route)
        db.commit()
        db.refresh(route)
        return route

    @staticmethod
    def update_route(db: Session, route_identifier: str | int, data: RouteUpdate) -> Route:
        route = RouteService.get_route(db, route_identifier)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(route, field, value)
        db.commit()
        db.refresh(route)
        return route

    @staticmethod
    def list_all_stops(db: Session, route_id: Optional[int] = None) -> List[RouteStop]:
        query = db.query(RouteStop)
        if route_id:
            query = query.filter(RouteStop.route_id == route_id)
        return query.order_by(RouteStop.route_id.asc(), RouteStop.sequence.asc()).all()

    @staticmethod
    def add_stop(db: Session, route_id: int, data: RouteStopCreate) -> RouteStop:
        route = db.query(Route).filter(Route.id == route_id).first()
        if not route:
            raise EntityNotFoundException("Route", route_id)

        stop = RouteStop(**data.model_dump())
        db.add(stop)
        db.commit()
        db.refresh(stop)
        return stop

    @staticmethod
    def update_stop(db: Session, stop_id: int, data: RouteStopUpdate) -> RouteStop:
        stop = db.query(RouteStop).filter(RouteStop.id == stop_id).first()
        if not stop:
            raise EntityNotFoundException("RouteStop", stop_id)
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(stop, field, value)
        db.commit()
        db.refresh(stop)
        return stop

    @staticmethod
    def delete_stop(db: Session, stop_id: int) -> bool:
        stop = db.query(RouteStop).filter(RouteStop.id == stop_id).first()
        if not stop:
            raise EntityNotFoundException("RouteStop", stop_id)
        db.delete(stop)
        db.commit()
        return True


# ==================== SEAT SERVICE ====================
class SeatService:
    @staticmethod
    def list_seats(db: Session, bus_id: int) -> List[BusSeat]:
        return db.query(BusSeat).filter(BusSeat.bus_id == bus_id).order_by(BusSeat.seat_number.asc()).all()

    @staticmethod
    def assign_seat(db: Session, bus_id: int, seat_number: str, student_id: int) -> BusSeat:
        seat = db.query(BusSeat).filter(
            BusSeat.bus_id == bus_id,
            BusSeat.seat_number == seat_number
        ).first()

        if not seat:
            raise EntityNotFoundException(f"Seat '{seat_number}' on Bus", bus_id)

        if seat.assigned_student_id is not None and seat.assigned_student_id != student_id:
            raise CampusRideException(
                f"Seat '{seat_number}' is already assigned to another student.",
                code="SEAT_ALREADY_ASSIGNED",
                status_code=400
            )

        # Ensure student does not have another seat on the same bus
        existing_seat = db.query(BusSeat).filter(
            BusSeat.bus_id == bus_id,
            BusSeat.assigned_student_id == student_id,
            BusSeat.id != seat.id
        ).first()

        if existing_seat:
            existing_seat.assigned_student_id = None
            existing_seat.status = "Available"

        seat.assigned_student_id = student_id
        seat.status = "Assigned"
        db.commit()
        db.refresh(seat)
        return seat

    @staticmethod
    def update_seat_status(db: Session, bus_id: int, seat_number: str, status: str) -> BusSeat:
        seat = db.query(BusSeat).filter(
            BusSeat.bus_id == bus_id,
            BusSeat.seat_number == seat_number
        ).first()

        if not seat:
            raise EntityNotFoundException(f"Seat '{seat_number}' on Bus", bus_id)

        seat.status = status
        if status in ["Available", "Blocked", "Maintenance"]:
            seat.assigned_student_id = None
        db.commit()
        db.refresh(seat)
        return seat


# ==================== TRIP SERVICE ====================
class TripService:
    @staticmethod
    def list_trips(
        db: Session,
        bus_id: Optional[int] = None,
        driver_id: Optional[int] = None,
        status: Optional[str] = None
    ) -> List[Trip]:
        query = db.query(Trip)

        if bus_id:
            query = query.filter(Trip.bus_id == bus_id)

        if driver_id:
            query = query.filter(Trip.driver_id == driver_id)

        if status:
            query = query.filter(Trip.status == status)

        return query.order_by(Trip.scheduled_start_time.desc()).all()

    @staticmethod
    def get_trip(db: Session, trip_identifier: str | int) -> Trip:
        if isinstance(trip_identifier, int) or str(trip_identifier).isdigit():
            trip = db.query(Trip).filter(
                or_(Trip.id == int(trip_identifier), Trip.trip_id == str(trip_identifier))
            ).first()
        else:
            trip = db.query(Trip).filter(Trip.trip_id == trip_identifier).first()

        if not trip:
            raise EntityNotFoundException("Trip", trip_identifier)
        return trip

    @staticmethod
    def create_trip(db: Session, data: TripCreate) -> Trip:
        existing = db.query(Trip).filter(Trip.trip_id == data.trip_id).first()
        if existing:
            raise CampusRideException("Trip with this ID already exists.", code="TRIP_DUPLICATE", status_code=400)

        trip = Trip(**data.model_dump())
        db.add(trip)
        db.commit()
        db.refresh(trip)
        return trip

    @staticmethod
    def complete_vehicle_check(db: Session, trip_id: str | int) -> Trip:
        trip = TripService.get_trip(db, trip_id)
        trip.vehicle_check_completed = True
        trip.status = "Ready"
        db.commit()
        db.refresh(trip)
        return trip

    @staticmethod
    def start_trip(db: Session, trip_id: str | int) -> Trip:
        trip = TripService.get_trip(db, trip_id)
        now = datetime.now(timezone.utc)
        trip.actual_start_time = now
        trip.status = "Started"

        # Update associated bus status to Running
        bus = db.query(Bus).filter(Bus.id == trip.bus_id).first()
        if bus:
            bus.status = "Running"

        db.commit()
        db.refresh(trip)
        return trip

    @staticmethod
    def end_trip(db: Session, trip_id: str | int) -> Trip:
        trip = TripService.get_trip(db, trip_id)
        now = datetime.now(timezone.utc)
        trip.actual_end_time = now
        trip.status = "Completed"

        # Update associated bus status to Stopped
        bus = db.query(Bus).filter(Bus.id == trip.bus_id).first()
        if bus:
            bus.status = "Stopped"

        db.commit()
        db.refresh(trip)
        return trip
