from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.transport import Route, RouteStop, Bus, BusSeat, Trip
from app.models.people import Driver, BusIncharge, Student

SAMPLE_ROUTES_DATA = [
    {
        "code": "R-01", "name": "Tambaram Route", "start": "Tambaram Sanatorium",
        "distance": 32.5, "duration": 55,
        "stops": [
            ("Tambaram Sanatorium", 12.9360, 80.1280, "07:15 AM"),
            ("Chromepet", 12.9516, 80.1412, "07:25 AM"),
            ("Pallavaram", 12.9680, 80.1500, "07:35 AM"),
            ("Perungalathur", 12.9050, 80.0890, "07:48 AM"),
            ("Vandalur", 12.8900, 80.0810, "07:58 AM"),
            ("Urapakkam", 12.8680, 80.0680, "08:08 AM"),
            ("Guduvanchery", 12.8450, 80.0600, "08:18 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-02", "name": "Avadi Route", "start": "Avadi Bus Terminus",
        "distance": 45.0, "duration": 75,
        "stops": [
            ("Avadi", 13.1147, 80.1098, "07:05 AM"),
            ("Ambattur OT", 13.1140, 80.1540, "07:20 AM"),
            ("Mogappair West", 13.0840, 80.1680, "07:35 AM"),
            ("Nolambur", 13.0780, 80.1620, "07:45 AM"),
            ("Anna Nagar West", 13.0850, 80.1980, "08:00 AM"),
            ("Koyambedu", 13.0694, 80.1948, "08:10 AM"),
            ("College Campus", 12.8230, 80.0440, "08:35 AM")
        ]
    },
    {
        "code": "R-03", "name": "Velachery Route", "start": "Velachery Checkpost",
        "distance": 38.0, "duration": 65,
        "stops": [
            ("Velachery", 12.9800, 80.2200, "07:15 AM"),
            ("Taramani", 12.9860, 80.2420, "07:25 AM"),
            ("Perungudi", 12.9650, 80.2460, "07:38 AM"),
            ("Thoraipakkam", 12.9420, 80.2370, "07:50 AM"),
            ("Sholinganallur", 12.9010, 80.2280, "08:05 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-04", "name": "T. Nagar Route", "start": "Panagal Park",
        "distance": 40.0, "duration": 70,
        "stops": [
            ("T. Nagar", 13.0418, 80.2341, "07:10 AM"),
            ("Saidapet", 13.0210, 80.2230, "07:22 AM"),
            ("Guindy", 13.0067, 80.2025, "07:35 AM"),
            ("Meenambakkam", 12.9850, 80.1800, "07:50 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-05", "name": "Porur Route", "start": "Porur Junction",
        "distance": 35.0, "duration": 60,
        "stops": [
            ("Porur", 13.0382, 80.1565, "07:20 AM"),
            ("Mugalivakkam", 13.0250, 80.1650, "07:30 AM"),
            ("Ramapuram", 13.0310, 80.1820, "07:42 AM"),
            ("Butt Road", 13.0070, 80.1940, "07:55 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-06", "name": "Ambattur Route", "start": "Ambattur Estate",
        "distance": 42.0, "duration": 70,
        "stops": [
            ("Ambattur Estate", 13.0980, 80.1620, "07:10 AM"),
            ("Maduravoyal", 13.0680, 80.1650, "07:25 AM"),
            ("Vanagaram", 13.0550, 80.1450, "07:40 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-07", "name": "Perungalathur Route", "start": "Old Perungalathur",
        "distance": 22.0, "duration": 40,
        "stops": [
            ("Old Perungalathur", 12.9120, 80.0820, "07:45 AM"),
            ("Perungalathur Junction", 12.9050, 80.0890, "07:55 AM"),
            ("Vandalur Crescent", 12.8790, 80.0760, "08:08 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-08", "name": "Medavakkam Route", "start": "Medavakkam Koot Road",
        "distance": 28.0, "duration": 50,
        "stops": [
            ("Medavakkam", 12.9200, 80.1900, "07:30 AM"),
            ("Sithalapakkam", 12.8980, 80.1950, "07:45 AM"),
            ("Mambakkam", 12.8550, 80.1550, "08:05 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-09", "name": "Adyar Route", "start": "Adyar Depot",
        "distance": 42.0, "duration": 70,
        "stops": [
            ("Adyar", 13.0012, 80.2565, "07:10 AM"),
            ("Besant Nagar", 12.9980, 80.2680, "07:20 AM"),
            ("Thiruvanmiyur", 12.9830, 80.2590, "07:35 AM"),
            ("Palavakkam", 12.9600, 80.2580, "07:48 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-10", "name": "Anna Nagar Route", "start": "Anna Nagar Roundtana",
        "distance": 44.0, "duration": 75,
        "stops": [
            ("Anna Nagar", 13.0850, 80.2100, "07:05 AM"),
            ("Shenoy Nagar", 13.0780, 80.2250, "07:18 AM"),
            ("Aminjikarai", 13.0720, 80.2150, "07:30 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-11", "name": "Sholinganallur Route", "start": "Sholinganallur Junction",
        "distance": 26.0, "duration": 45,
        "stops": [
            ("Sholinganallur", 12.9010, 80.2280, "07:40 AM"),
            ("Semmancheri", 12.8680, 80.2220, "07:52 AM"),
            ("Navalur", 12.8450, 80.2260, "08:05 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-12", "name": "Guduvanchery Route", "start": "Guduvanchery Bus Stand",
        "distance": 18.0, "duration": 35,
        "stops": [
            ("Guduvanchery", 12.8450, 80.0600, "07:50 AM"),
            ("Potheri", 12.8250, 80.0450, "08:05 AM"),
            ("Kattankulathur", 12.8200, 80.0410, "08:15 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-13", "name": "Chromepet Route", "start": "Chromepet MIT Gate",
        "distance": 26.0, "duration": 45,
        "stops": [
            ("Chromepet", 12.9516, 80.1412, "07:35 AM"),
            ("Hastinapuram", 12.9480, 80.1520, "07:48 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-14", "name": "Pallavaram Route", "start": "Pallavaram Cantonment",
        "distance": 29.0, "duration": 50,
        "stops": [
            ("Pallavaram", 12.9680, 80.1500, "07:30 AM"),
            ("Pammal", 12.9720, 80.1380, "07:42 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-15", "name": "Madipakkam Route", "start": "Madipakkam Koot Road",
        "distance": 33.0, "duration": 55,
        "stops": [
            ("Madipakkam", 12.9620, 80.1980, "07:25 AM"),
            ("Puzhuthivakkam", 12.9750, 80.1950, "07:38 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-16", "name": "Nanganallur Route", "start": "Nanganallur Anjaneyar Temple",
        "distance": 32.0, "duration": 55,
        "stops": [
            ("Nanganallur", 12.9850, 80.1900, "07:25 AM"),
            ("Palavanthangal", 12.9890, 80.1850, "07:40 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-17", "name": "Thiruvanmiyur Route", "start": "Thiruvanmiyur RTO",
        "distance": 39.0, "duration": 65,
        "stops": [
            ("Thiruvanmiyur", 12.9830, 80.2590, "07:15 AM"),
            ("Kottivakkam", 12.9690, 80.2580, "07:30 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-18", "name": "Mogappair Route", "start": "Mogappair East",
        "distance": 46.0, "duration": 75,
        "stops": [
            ("Mogappair East", 13.0880, 80.1750, "07:05 AM"),
            ("Collector Nagar", 13.0820, 80.1820, "07:20 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-19", "name": "Poonamallee Route", "start": "Poonamallee Bus Terminus",
        "distance": 38.0, "duration": 60,
        "stops": [
            ("Poonamallee", 13.0489, 80.0894, "07:15 AM"),
            ("Kumananchavadi", 13.0450, 80.1100, "07:30 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    },
    {
        "code": "R-20", "name": "Kelambakkam Route", "start": "Kelambakkam Bus Stand",
        "distance": 24.0, "duration": 40,
        "stops": [
            ("Kelambakkam", 12.7880, 80.2190, "07:45 AM"),
            ("Thiruporur", 12.7250, 80.1890, "08:00 AM"),
            ("College Campus", 12.8230, 80.0440, "08:30 AM")
        ]
    }
]

BUS_STATUSES = [
    "Running", "Running", "Running", "Running", "Running",
    "Running", "Running", "Running", "Running", "Running",
    "Running", "Running", "Running", "Delayed", "Running",
    "Running", "Delayed", "Stopped", "Running", "Offline"
]


def seed_transport(db: Session = None):
    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        # Seed 20 Routes & Stops
        if db.query(Route).count() == 0:
            for r_data in SAMPLE_ROUTES_DATA:
                route = Route(
                    route_code=r_data["code"],
                    name=r_data["name"],
                    start_location=r_data["start"],
                    end_location="College Campus",
                    total_distance_km=r_data["distance"],
                    estimated_duration_minutes=r_data["duration"],
                    status="Active"
                )
                db.add(route)
                db.flush()

                for seq, (s_name, lat, lon, eta) in enumerate(r_data["stops"], 1):
                    stop = RouteStop(
                        route_id=route.id,
                        stop_name=s_name,
                        latitude=lat,
                        longitude=lon,
                        sequence=seq,
                        expected_arrival_time=eta
                    )
                    db.add(stop)
            db.commit()
            print("Seeded 20 Routes and their respective stops.")

        # Seed 20 Buses (BUS-01 through BUS-20)
        if db.query(Bus).count() == 0:
            routes = db.query(Route).order_by(Route.id.asc()).all()
            drivers = db.query(Driver).order_by(Driver.id.asc()).all()
            incharges = db.query(BusIncharge).order_by(BusIncharge.id.asc()).all()

            buses = []
            capacities = [48, 50, 52]

            for i in range(20):
                bus_num = f"BUS-{i+1:02d}"
                reg_num = f"TN 01 AB {1001 + i}"
                capacity = capacities[i % len(capacities)]
                status = BUS_STATUSES[i]

                route = routes[i] if i < len(routes) else None
                driver = drivers[i] if i < len(drivers) else None
                incharge = incharges[i] if i < len(incharges) else None

                # Realistic coordinates along route or college
                lat = 12.8230 + (i * 0.005)
                lon = 80.0440 + (i * 0.005)
                speed = 38.5 if status == "Running" else 0.0

                bus = Bus(
                    bus_number=bus_num,
                    registration_number=reg_num,
                    capacity=capacity,
                    assigned_driver_id=driver.id if driver else None,
                    assigned_incharge_id=incharge.id if incharge else None,
                    assigned_route_id=route.id if route else None,
                    gps_device_id=f"GPS-DEV-{i+1:03d}",
                    latitude=lat,
                    longitude=lon,
                    speed=speed,
                    heading=90.0,
                    odometer=70000.0 + (i * 350.0),
                    fuel_level_percent=85.0 - (i % 15),
                    status=status
                )
                db.add(bus)
                db.flush()

                # Generate seats for the bus
                seats = []
                for s_idx in range(1, capacity + 1):
                    row = (s_idx + 1) // 2
                    col = 'A' if s_idx % 2 == 1 else 'B'
                    seat_num = f"{row:02d}{col}"
                    is_win = (col in ['A', 'D'])
                    seats.append(BusSeat(
                        bus_id=bus.id,
                        seat_number=seat_num,
                        status="Available",
                        is_window=is_win
                    ))
                db.bulk_save_objects(seats)
                buses.append(bus)

            db.commit()
            print("Seeded 20 Buses and generated complete seat layouts.")

            # Map student assignments to seats
            students = db.query(Student).all()
            for stu in students:
                target_bus = db.query(Bus).filter(Bus.bus_number == stu.bus).first()
                if target_bus and stu.seat:
                    seat_record = db.query(BusSeat).filter(
                        BusSeat.bus_id == target_bus.id,
                        BusSeat.seat_number == stu.seat
                    ).first()
                    if seat_record:
                        seat_record.assigned_student_id = stu.id
                        seat_record.status = "Assigned"
            db.commit()
            print("Linked student transport roster with bus seat assignments.")

        # Seed Daily Trips for active buses
        if db.query(Trip).count() == 0:
            buses = db.query(Bus).all()
            now = datetime.now(timezone.utc)
            today_start = now.replace(hour=7, minute=0, second=0, microsecond=0)

            trips = []
            for b in buses:
                trip_status = "Started" if b.status == "Running" else "Completed" if b.status == "Stopped" else "Scheduled"
                trips.append(Trip(
                    trip_id=f"TRIP-{now.strftime('%Y%m%d')}-{b.bus_number}",
                    bus_id=b.id,
                    route_id=b.assigned_route_id or 1,
                    driver_id=b.assigned_driver_id or 1,
                    incharge_id=b.assigned_incharge_id,
                    trip_type="Morning Pickup",
                    scheduled_start_time=today_start,
                    actual_start_time=today_start + timedelta(minutes=10) if trip_status in ["Started", "Completed"] else None,
                    actual_end_time=today_start + timedelta(minutes=70) if trip_status == "Completed" else None,
                    status=trip_status,
                    vehicle_check_completed=True,
                    boarding_count=16,
                    total_expected_passengers=16,
                    notes="Daily institutional commute."
                ))
            db.bulk_save_objects(trips)
            db.commit()
            print("Seeded daily trips for 20 buses.")
    finally:
        if close_db:
            db.close()


if __name__ == "__main__":
    seed_transport()
