import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.models.transport import Bus, Route, BusSeat, Trip


@pytest.fixture(autouse=True)
def setup_transport_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)
    seed_transport(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_list_buses_and_summary(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    
    # Check summary
    sum_res = client.get("/api/v1/buses/summary", headers={"Authorization": f"Bearer {token}"})
    assert sum_res.status_code == 200
    sum_data = sum_res.json()
    assert sum_data["total_buses"] == 20
    assert sum_data["running"] >= 14

    # List all buses
    res = client.get("/api/v1/buses", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    buses = res.json()
    assert buses["total"] == 20
    assert len(buses["items"]) == 20
    assert any(b["bus_number"] == "BUS-01" for b in buses["items"])


def test_bus_details_and_occupancy(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/buses/BUS-01", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    bus = res.json()
    assert bus["bus_number"] == "BUS-01"
    assert bus["registration_number"] == "TN 01 AB 1001"
    assert bus["driver"] is not None
    assert bus["route"] is not None
    assert "occupancy_count" in bus
    assert "occupancy_percentage" in bus


def test_routes_and_stops_sequence(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/routes", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    routes = res.json()
    assert routes["total"] == 20
    
    # Check stops on R-01
    r1 = next(r for r in routes["items"] if r["route_code"] == "R-01")
    assert len(r1["stops"]) >= 5
    # Verify sequence order
    sequences = [s["sequence"] for s in r1["stops"]]
    assert sequences == sorted(sequences)


def test_seats_assignment_and_duplicate_prevention(client: TestClient, db_session):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    
    # Get seats for BUS-01
    bus1 = db_session.query(Bus).filter(Bus.bus_number == "BUS-01").first()
    res = client.get(f"/api/v1/buses/BUS-01/seats", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    seats = res.json()
    assert len(seats) == bus1.capacity

    # Find an available seat
    avail_seat = next((s for s in seats if s["status"] == "Available"), None)
    if not avail_seat:
        # Mark one available for testing
        s_rec = db_session.query(BusSeat).filter(BusSeat.bus_id == bus1.id).first()
        s_rec.assigned_student_id = None
        s_rec.status = "Available"
        db_session.commit()
        avail_seat = {"seat_number": s_rec.seat_number}

    # Assign student 1 to the seat
    assign_res = client.post(
        f"/api/v1/seats/assign?bus_id={bus1.id}",
        json={"student_id": 1, "seat_number": avail_seat["seat_number"]},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["status"] == "Assigned"

    # Attempt to assign another student (student 2) to the exact same seat: MUST BE REJECTED
    dup_res = client.post(
        f"/api/v1/seats/assign?bus_id={bus1.id}",
        json={"student_id": 2, "seat_number": avail_seat["seat_number"]},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert dup_res.status_code == 400
    assert "SEAT_ALREADY_ASSIGNED" in str(dup_res.json())

    # Test database-level constraint: attempting to insert identical (bus_id, seat_number)
    with pytest.raises(IntegrityError):
        duplicate_seat = BusSeat(
            bus_id=bus1.id,
            seat_number=avail_seat["seat_number"],
            status="Available"
        )
        db_session.add(duplicate_seat)
        db_session.commit()
    db_session.rollback()


def test_trip_lifecycle(client: TestClient, db_session):
    driver_token = get_token(client, "driver@campusride.edu", "Driver@123")
    
    # Get trips for driver
    trip = db_session.query(Trip).first()
    assert trip is not None
    trip_id = trip.trip_id

    # 1. Complete vehicle check
    check_res = client.post(
        f"/api/v1/trips/{trip_id}/check",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert check_res.status_code == 200
    assert check_res.json()["vehicle_check_completed"] is True
    assert check_res.json()["status"] == "Ready"

    # 2. Start trip
    start_res = client.post(
        f"/api/v1/trips/{trip_id}/start",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "Started"
    assert start_res.json()["actual_start_time"] is not None

    # Verify associated bus is Running
    bus = db_session.query(Bus).filter(Bus.id == trip.bus_id).first()
    assert bus.status == "Running"

    # 3. End trip
    end_res = client.post(
        f"/api/v1/trips/{trip_id}/end",
        headers={"Authorization": f"Bearer {driver_token}"}
    )
    assert end_res.status_code == 200
    assert end_res.json()["status"] == "Completed"
    assert end_res.json()["actual_end_time"] is not None
