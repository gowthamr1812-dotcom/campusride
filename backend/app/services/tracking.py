import math
import asyncio
from typing import Optional, List, Dict, Set, Any
from datetime import datetime, timezone
from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.models.transport import Bus, Route, RouteStop
from app.models.people import Driver, BusIncharge, Student
from app.models.user import User, UserRole
from app.schemas.tracking import (
    GPSLocationPayload,
    LiveBusTelemetry,
    LiveTrackingListResponse,
    SimulationStepResponse,
    StopEtaInfo
)

CAMPUS_LAT = 12.8230
CAMPUS_LON = 80.0440


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates the great-circle distance between two GPS coordinates in kilometers."""
    r = 6371.0  # Earth's radius in kilometers
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(r * c, 2)


def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates compass heading/bearing in degrees (0 - 360) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_lambda = math.radians(lon2 - lon1)

    y = math.sin(delta_lambda) * math.cos(phi2)
    x = (math.cos(phi1) * math.sin(phi2) -
         math.sin(phi1) * math.cos(phi2) * math.cos(delta_lambda))
    theta = math.atan2(y, x)
    bearing = (math.degrees(theta) + 360.0) % 360.0
    return round(bearing, 1)


class TrackingConnectionManager:
    """Manages active WebSocket connections for real-time live telematics broadcasting."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)

    async def broadcast_json(self, data: Dict[str, Any]):
        """Broadcasts a JSON message to all currently connected clients."""
        disconnected = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(data)
            except Exception:
                disconnected.add(connection)
        for dead in disconnected:
            self.active_connections.discard(dead)


# Global WebSocket broadcast manager instance
tracking_hub = TrackingConnectionManager()


class TrackingService:

    @staticmethod
    def _compute_bus_telemetry(
        bus: Bus,
        student: Optional[Student] = None
    ) -> LiveBusTelemetry:
        """Enriches a Bus entity with calculated real-time telemetry, stop ETAs, and personnel details."""
        lat = bus.latitude if bus.latitude is not None else CAMPUS_LAT
        lon = bus.longitude if bus.longitude is not None else CAMPUS_LON

        dist_campus = haversine_distance_km(lat, lon, CAMPUS_LAT, CAMPUS_LON)

        route = bus.route
        stops_polyline = []
        next_stop_id = None
        next_stop_name = None
        next_stop_eta_minutes = None

        if route and route.stops:
            stops_sorted = sorted(route.stops, key=lambda s: s.sequence)
            stops_polyline = [[s.latitude, s.longitude] for s in stops_sorted]

            # Find next upcoming stop along the sequence
            # Heuristic: the nearest stop ahead of current coordinates
            min_dist = float('inf')
            nearest_stop = None
            for s in stops_sorted:
                d = haversine_distance_km(lat, lon, s.latitude, s.longitude)
                if d < min_dist:
                    min_dist = d
                    nearest_stop = s

            if nearest_stop:
                next_stop_id = nearest_stop.id
                next_stop_name = nearest_stop.stop_name
                # Average urban campus transit speed assumed at 30 km/h (0.5 km/min)
                transit_speed = max(20.0, bus.speed if bus.speed > 5.0 else 30.0)
                next_stop_eta_minutes = max(1, int((min_dist / transit_speed) * 60))

        # Student specific stop context
        student_stop_name = None
        student_stop_eta_minutes = None
        distance_to_student_stop_km = None

        if student and (
            student.bus == bus.bus_number or 
            getattr(student, "assigned_bus_id", None) == bus.id
        ):
            # Student assigned to this bus
            stop_name = student.stop or (student.assigned_stop.stop_name if getattr(student, "assigned_stop", None) else "Main Gate")
            student_stop_name = stop_name
            stop_lat, stop_lon = lat, lon
            if route and route.stops:
                matched_stop = next((s for s in route.stops if s.stop_name.lower() in stop_name.lower() or stop_name.lower() in s.stop_name.lower()), None)
                if not matched_stop:
                    matched_stop = route.stops[0]
                stop_lat, stop_lon = matched_stop.latitude, matched_stop.longitude

            d_stop = haversine_distance_km(lat, lon, stop_lat, stop_lon)
            distance_to_student_stop_km = d_stop
            transit_speed = max(20.0, bus.speed if bus.speed > 5.0 else 30.0)
            student_stop_eta_minutes = max(1, int((d_stop / transit_speed) * 60))

        driver = bus.driver
        incharge = bus.incharge

        return LiveBusTelemetry(
            bus_id=bus.id,
            bus_number=bus.bus_number,
            registration_number=bus.registration_number,
            status=bus.status or "Running",
            latitude=lat,
            longitude=lon,
            speed=round(bus.speed or 0.0, 1),
            heading=round(bus.heading or 0.0, 1),
            fuel_level_percent=round(bus.fuel_level_percent or 85.0, 1),
            odometer=round(bus.odometer or 70000.0, 1),
            last_gps_update=bus.last_gps_update or datetime.now(timezone.utc),
            route_id=route.id if route else None,
            route_code=route.route_code if route else None,
            route_name=route.name if route else None,
            next_stop_id=next_stop_id,
            next_stop_name=next_stop_name,
            next_stop_eta_minutes=next_stop_eta_minutes,
            distance_to_campus_km=dist_campus,
            stops_polyline=stops_polyline,
            driver_id=driver.id if driver else None,
            driver_name=driver.name if driver else None,
            driver_phone=driver.phone if driver else None,
            incharge_id=incharge.id if incharge else None,
            incharge_name=incharge.name if incharge else None,
            incharge_phone=incharge.phone if incharge else None,
            student_stop_name=student_stop_name,
            student_stop_eta_minutes=student_stop_eta_minutes,
            distance_to_student_stop_km=distance_to_student_stop_km
        )

    @staticmethod
    def get_live_tracking_for_user(
        db: Session,
        current_user: User
    ) -> LiveTrackingListResponse:
        """Returns live vehicle telematics tailored to the caller's role and security scope."""
        buses_query = db.query(Bus).order_by(Bus.id.asc()).all()

        student_record: Optional[Student] = None
        if current_user.role == UserRole.STUDENT:
            student_record = db.query(Student).filter(
                (Student.user_id == current_user.id) |
                (Student.phone == current_user.phone) |
                (Student.student_id == current_user.username)
            ).first()
            if not student_record:
                student_record = db.query(Student).first()

        telemetry_items = []
        running_cnt = 0
        delayed_cnt = 0
        stopped_cnt = 0
        offline_cnt = 0

        for bus in buses_query:
            telemetry = TrackingService._compute_bus_telemetry(bus, student=student_record)
            telemetry_items.append(telemetry)

            st = (bus.status or "Running").capitalize()
            if st == "Running":
                running_cnt += 1
            elif st == "Delayed":
                delayed_cnt += 1
            elif st == "Stopped":
                stopped_cnt += 1
            else:
                offline_cnt += 1

        return LiveTrackingListResponse(
            total_tracked=len(telemetry_items),
            running_count=running_cnt,
            delayed_count=delayed_cnt,
            stopped_count=stopped_cnt,
            offline_count=offline_cnt,
            timestamp=datetime.now(timezone.utc),
            buses=telemetry_items
        )

    @staticmethod
    def get_bus_telemetry(
        db: Session,
        bus_identifier: str,
        current_user: Optional[User] = None
    ) -> LiveBusTelemetry:
        """Retrieves real-time telematics for a specific bus by ID or bus number."""
        query = db.query(Bus)
        if bus_identifier.isdigit():
            bus = query.filter(Bus.id == int(bus_identifier)).first()
        else:
            bus = query.filter(Bus.bus_number == bus_identifier).first()

        if not bus:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Bus '{bus_identifier}' not found")

        student = None
        if current_user and current_user.role == UserRole.STUDENT:
            student = db.query(Student).filter(
                (Student.user_id == current_user.id) | (Student.student_id == current_user.username)
            ).first()

        return TrackingService._compute_bus_telemetry(bus, student=student)

    @staticmethod
    def get_route_stop_etas(
        db: Session,
        bus_id: int
    ) -> List[StopEtaInfo]:
        """Calculates detailed Haversine ETAs for all stops along a bus's assigned route."""
        bus = db.query(Bus).filter(Bus.id == bus_id).first()
        if not bus or not bus.route:
            return []

        lat = bus.latitude if bus.latitude is not None else CAMPUS_LAT
        lon = bus.longitude if bus.longitude is not None else CAMPUS_LON
        speed = max(25.0, bus.speed if bus.speed > 5.0 else 32.0)

        stops = sorted(bus.route.stops, key=lambda s: s.sequence)
        result = []
        for stop in stops:
            dist = haversine_distance_km(lat, lon, stop.latitude, stop.longitude)
            eta_mins = max(1, int((dist / speed) * 60))
            is_passed = False  # If bus is very close or past sequence
            result.append(StopEtaInfo(
                stop_id=stop.id,
                stop_name=stop.stop_name,
                sequence=stop.sequence,
                latitude=stop.latitude,
                longitude=stop.longitude,
                expected_arrival_time=stop.expected_arrival_time,
                distance_km=dist,
                eta_minutes=eta_mins,
                is_passed=is_passed
            ))
        return result

    @staticmethod
    def ingest_location(
        db: Session,
        payload: GPSLocationPayload,
        reported_by_user_id: Optional[int] = None
    ) -> LiveBusTelemetry:
        """Ingests a telemetry ping from GPS tracker or driver cabin and updates bus state."""
        bus = db.query(Bus).filter(Bus.id == payload.bus_id).first()
        if not bus:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail=f"Bus with ID {payload.bus_id} not found")

        bus.latitude = payload.latitude
        bus.longitude = payload.longitude
        bus.speed = payload.speed
        bus.heading = payload.heading
        bus.last_gps_update = payload.timestamp or datetime.now(timezone.utc)

        if payload.odometer is not None and payload.odometer > (bus.odometer or 0):
            bus.odometer = payload.odometer

        if payload.fuel_level_percent is not None:
            bus.fuel_level_percent = payload.fuel_level_percent

        if payload.status:
            bus.status = payload.status

        db.commit()
        db.refresh(bus)

        telemetry = TrackingService._compute_bus_telemetry(bus)

        # Broadcast update asynchronously
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(tracking_hub.broadcast_json({
                "type": "BUS_LOCATION_UPDATE",
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "latitude": bus.latitude,
                "longitude": bus.longitude,
                "speed": bus.speed,
                "heading": bus.heading,
                "status": bus.status,
                "next_stop_name": telemetry.next_stop_name,
                "next_stop_eta_minutes": telemetry.next_stop_eta_minutes,
                "timestamp": bus.last_gps_update.isoformat()
            }))
        except RuntimeError:
            pass

        return telemetry

    @staticmethod
    def simulate_movement_step(db: Session) -> SimulationStepResponse:
        """
        Advances all active running and delayed fleet buses along their route stops.
        Calculates waypoint interpolation, realistic bearing angles, and speeds.
        """
        buses = db.query(Bus).filter(
            Bus.status.in_(["Running", "Delayed"]),
            Bus.assigned_route_id.isnot(None)
        ).all()

        moved_count = 0
        updates_for_ws = []

        for bus in buses:
            route = bus.route
            if not route or not route.stops or len(route.stops) < 2:
                continue

            stops = sorted(route.stops, key=lambda s: s.sequence)
            cur_lat = bus.latitude or stops[0].latitude
            cur_lon = bus.longitude or stops[0].longitude

            # Find closest stop
            min_dist = float('inf')
            closest_idx = 0
            for idx, stop in enumerate(stops):
                d = haversine_distance_km(cur_lat, cur_lon, stop.latitude, stop.longitude)
                if d < min_dist:
                    min_dist = d
                    closest_idx = idx

            # Determine target stop: next stop in sequence, or loop back if at campus
            if closest_idx < len(stops) - 1:
                target_stop = stops[closest_idx + 1]
            else:
                # Arrived at end of route; reset to start
                target_stop = stops[0]

            # Step towards target stop by a realistic fraction (~0.12 of segment)
            step_fraction = 0.15
            new_lat = cur_lat + (target_stop.latitude - cur_lat) * step_fraction
            new_lon = cur_lon + (target_stop.longitude - cur_lon) * step_fraction

            bearing = calculate_bearing(cur_lat, cur_lon, target_stop.latitude, target_stop.longitude)

            # Assign realistic travel speed (32 - 48 km/h for running, 18 - 28 km/h for delayed)
            sim_speed = 42.0 if bus.status == "Running" else 22.0

            bus.latitude = round(new_lat, 6)
            bus.longitude = round(new_lon, 6)
            bus.heading = bearing
            bus.speed = sim_speed
            bus.last_gps_update = datetime.now(timezone.utc)
            bus.odometer = round((bus.odometer or 70000.0) + 0.35, 1)

            moved_count += 1
            updates_for_ws.append({
                "bus_id": bus.id,
                "bus_number": bus.bus_number,
                "latitude": bus.latitude,
                "longitude": bus.longitude,
                "speed": bus.speed,
                "heading": bus.heading,
                "status": bus.status,
                "next_stop_name": target_stop.stop_name
            })

        db.commit()

        # Broadcast simulation updates via WebSocket
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(tracking_hub.broadcast_json({
                "type": "FLEET_SIMULATION_TICK",
                "buses_moved": moved_count,
                "updates": updates_for_ws,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }))
        except RuntimeError:
            pass

        return SimulationStepResponse(
            message=f"Simulation advanced {moved_count} fleet buses along their active route sequences",
            buses_moved=moved_count,
            timestamp=datetime.now(timezone.utc)
        )
