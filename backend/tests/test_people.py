import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.models.people import Driver, BusIncharge, Student


@pytest.fixture(autouse=True)
def seed_test_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_list_drivers_admin(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/drivers", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 20
    assert len(data["items"]) == 20
    # Search filter
    search_res = client.get(
        "/api/v1/drivers?search=Ramesh",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert search_res.status_code == 200
    assert any("Ramesh" in d["name"] for d in search_res.json()["items"])


def test_driver_crud(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    
    # Create driver
    new_driver = {
        "driver_id": "DRV-999",
        "name": "Test Driver",
        "phone": "+91 99999 88888",
        "email": "testdriver@campusride.edu",
        "license_number": "TN-01-2020-9999999",
        "license_expiry": str(date(2030, 1, 1)),
        "assigned_bus": "BUS-01",
        "assigned_route": "Tambaram Route",
        "status": "Active"
    }
    create_res = client.post(
        "/api/v1/drivers",
        json=new_driver,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert create_res.status_code == 201
    assert create_res.json()["driver_id"] == "DRV-999"

    # Update driver
    update_res = client.put(
        "/api/v1/drivers/DRV-999",
        json={"phone": "+91 99999 77777", "status": "On Leave"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["phone"] == "+91 99999 77777"
    assert update_res.json()["status"] == "On Leave"

    # Delete driver
    del_res = client.delete(
        "/api/v1/drivers/DRV-999",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert del_res.status_code == 200


def test_list_incharges_admin(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/incharges", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 20
    assert len(data["items"]) == 20

    # Get single incharge
    single_res = client.get(
        "/api/v1/incharges/INC-001",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert single_res.status_code == 200
    assert single_res.json()["incharge_id"] == "INC-001"
    assert single_res.json()["name"] == "Meena Priya"


def test_list_students_admin_pagination(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/students?page=1&page_size=20", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 300
    assert len(data["items"]) == 20
    assert data["page"] == 1
    assert data["total_pages"] >= 15

    # Filter by department
    dept_res = client.get(
        "/api/v1/students?department=CSE",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert dept_res.status_code == 200
    assert all(s["department"] == "CSE" for s in dept_res.json()["items"])


def test_student_privacy_student_role(client: TestClient, db_session):
    # Link student user to STU-0001
    student = db_session.query(Student).filter(Student.student_id == "STU-0001").first()
    student.phone = "+91 98401 11005"  # matches student@campusride.edu seed user phone
    db_session.commit()

    token = get_token(client, "student@campusride.edu", "Student@123")
    res = client.get("/api/v1/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    # Student MUST NOT see all 320 students!
    assert data["total"] <= 1
    assert len(data["items"]) <= 1
    if len(data["items"]) > 0:
        assert data["items"][0]["phone"] == "+91 98401 11005"


def test_student_privacy_bus_incharge_role(client: TestClient, db_session):
    # Link incharge_meena user to INC-001 with BUS-07
    incharge = db_session.query(BusIncharge).filter(BusIncharge.incharge_id == "INC-001").first()
    incharge.user_id = 3  # incharge_meena
    db_session.commit()

    token = get_token(client, "incharge@campusride.edu", "Incharge@123")
    res = client.get("/api/v1/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    # Bus Incharge for BUS-07 must ONLY receive students assigned to BUS-07!
    assert data["total"] > 0
    assert all(s["bus"] == "BUS-07" for s in data["items"])


def test_student_privacy_driver_forbidden(client: TestClient):
    token = get_token(client, "driver@campusride.edu", "Driver@123")
    # Driver attempting to browse private student roster is blocked
    res = client.get("/api/v1/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
