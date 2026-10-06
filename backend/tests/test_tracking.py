import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.seed.seed_fleet import seed_fleet
from app.models.transport import Bus


@pytest.fixture(autouse=True)
def setup_tracking_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)
    seed_transport(db=db_session)
    seed_attendance(db=db_session)
    seed_finance(db=db_session)
    seed_fleet(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_get_live_tracking_admin(client: TestClient):
    """Admin receives live telemetry for all 20 buses in the fleet."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/tracking/live", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    assert data["total_tracked"] == 20
    assert data["running_count"] >= 15
    assert len(data["buses"]) == 20

    first_bus = data["buses"][0]
    assert "bus_id" in first_bus
    assert "latitude" in first_bus
    assert "longitude" in first_bus
    assert "speed" in first_bus
    assert "heading" in first_bus
    assert "status" in first_bus
    assert "distance_to_campus_km" in first_bus
    assert first_bus["distance_to_campus_km"] is not None


def test_get_live_tracking_student(client: TestClient):
    """Student receives live telemetry with personalized stop info for their assigned bus."""
    token = get_token(client, "student@campusride.edu", "Student@123")
    res = client.get("/api/v1/tracking/live", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()

    assert data["total_tracked"] == 20
    # Find student's assigned bus (student is assigned to BUS-01 / Tambaram)
    assigned_buses = [b for b in data["buses"] if b["student_stop_name"] is not None]
    assert len(assigned_buses) >= 1
    my_bus = assigned_buses[0]
    assert my_bus["student_stop_name"] is not None
    assert my_bus["student_stop_eta_minutes"] is not None
    assert my_bus["distance_to_student_stop_km"] is not None


def test_get_bus_telemetry_and_stop_etas(client: TestClient):
    """Retrieves single bus live telematics and stop arrival sequence."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    # Query BUS-01 by identifier
    res = client.get("/api/v1/tracking/bus/BUS-01", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    bus_data = res.json()
    assert bus_data["bus_number"] == "BUS-01"
    assert bus_data["route_name"] is not None

    # Query stop ETAs
    stops_res = client.get(f"/api/v1/tracking/bus/{bus_data['bus_id']}/stops", headers={"Authorization": f"Bearer {token}"})
    assert stops_res.status_code == 200
    stops = stops_res.json()
    assert len(stops) > 0
    assert stops[0]["sequence"] == 1
    assert "eta_minutes" in stops[0]
    assert "distance_km" in stops[0]


def test_ingest_location_telemetry(client: TestClient, db_session):
    """Ingests real-time coordinate update and verifies state change."""
    token = get_token(client, "driver@campusride.edu", "Driver@123")
    bus = db_session.query(Bus).filter(Bus.bus_number == "BUS-01").first()

    payload = {
        "bus_id": bus.id,
        "latitude": 12.93605,
        "longitude": 80.12805,
        "speed": 45.5,
        "heading": 135.0,
        "odometer": 75200.5,
        "fuel_level_percent": 88.0,
        "status": "Running"
    }

    res = client.post("/api/v1/tracking/location", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    updated = res.json()
    assert updated["latitude"] == 12.93605
    assert updated["speed"] == 45.5
    assert updated["heading"] == 135.0

    # Verify DB update
    db_session.refresh(bus)
    assert bus.latitude == 12.93605
    assert bus.speed == 45.5
    assert bus.odometer == 75200.5


def test_simulate_movement_step(client: TestClient):
    """Admin triggers fleet route movement simulation step."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.post("/api/v1/tracking/simulate-step", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["buses_moved"] > 0
    assert "timestamp" in data


def test_student_forbidden_from_telemetry_ingestion(client: TestClient):
    """Students are forbidden from sending GPS location ingestion or triggering simulation."""
    student_token = get_token(client, "student@campusride.edu", "Student@123")

    # Ingestion attempt
    ingest_res = client.post(
        "/api/v1/tracking/location",
        json={"bus_id": 1, "latitude": 12.9, "longitude": 80.1, "speed": 40.0, "heading": 90.0},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert ingest_res.status_code == 403

    # Simulation attempt
    sim_res = client.post(
        "/api/v1/tracking/simulate-step",
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert sim_res.status_code == 403


def test_websocket_tracking_handshake(client: TestClient):
    """Establishes WebSocket telematics connection and verifies ping/pong handshake."""
    with client.websocket_connect("/ws/tracking") as ws:
        # Welcome message
        welcome = ws.receive_json()
        assert welcome["type"] == "CONNECTION_ESTABLISHED"

        # Ping-pong heartbeat
        ws.send_json({"type": "PING"})
        pong = ws.receive_json()
        assert pong["type"] == "PONG"
        assert "timestamp" in pong
