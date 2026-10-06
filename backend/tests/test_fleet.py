import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.seed.seed_fleet import seed_fleet
from app.models.transport import Bus


@pytest.fixture(autouse=True)
def setup_fleet_data(db_session):
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


def test_fleet_summary(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/fleet/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_buses"] == 20
    assert data["buses_in_maintenance"] >= 1
    assert data["active_service_orders"] >= 1
    assert data["monthly_fuel_liters"] > 1000
    assert data["valid_documents_count"] > 70


def test_maintenance_lifecycle(client: TestClient, db_session):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    bus = db_session.query(Bus).filter(Bus.status == "Running").first()

    # 1. Create In Progress maintenance order -> marks bus as Maintenance
    payload = {
        "bus_id": bus.id,
        "service_type": "Brake Service",
        "description": "Front brake pads worn out during inspection.",
        "status": "In Progress",
        "priority": "High",
        "cost": 12000.0,
        "vendor_name": "Ashok Leyland Depot"
    }
    create_res = client.post("/api/v1/services", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    log_data = create_res.json()
    assert log_data["status"] == "In Progress"

    # Verify bus status changed to Maintenance
    db_session.refresh(bus)
    assert bus.status == "Maintenance"

    # 2. Complete maintenance order -> restores bus to Running
    update_res = client.put(
        f"/api/v1/services/{log_data['id']}",
        json={"status": "Completed"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    db_session.refresh(bus)
    assert bus.status == "Running"


def test_fuel_logging_telemetry(client: TestClient, db_session):
    token = get_token(client, "driver@campusride.edu", "Driver@123")
    bus = db_session.query(Bus).first()

    payload = {
        "bus_id": bus.id,
        "liters_filled": 60.0,
        "rate_per_liter": 94.50,
        "odometer_reading": bus.odometer + 300,
        "fuel_station": "Indian Oil Campus Depot",
        "fuel_level_after_fill": 95.0,
        "payment_mode": "Fleet Card",
        "notes": "Driver shift refuel"
    }

    res = client.post("/api/v1/fuel", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    fuel_data = res.json()
    assert fuel_data["total_cost"] == 5670.0
    assert fuel_data["bus_number"] == bus.bus_number

    # Verify telemetry synced on bus
    db_session.refresh(bus)
    assert bus.fuel_level_percent == 95.0
    assert bus.odometer >= payload["odometer_reading"]


def test_vehicle_documents_and_expiry(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/documents", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    docs = res.json()["items"]
    assert len(docs) >= 80

    # Ensure days_until_expiry is calculated
    for d in docs:
        assert "days_until_expiry" in d


def test_student_forbidden_from_fleet(client: TestClient):
    token = get_token(client, "student@campusride.edu", "Student@123")

    # Services
    res_srv = client.get("/api/v1/services", headers={"Authorization": f"Bearer {token}"})
    assert res_srv.status_code == 403

    # Fuel
    res_fuel = client.get("/api/v1/fuel", headers={"Authorization": f"Bearer {token}"})
    assert res_fuel.status_code == 403

    # Documents
    res_docs = client.get("/api/v1/documents", headers={"Authorization": f"Bearer {token}"})
    assert res_docs.status_code == 403
