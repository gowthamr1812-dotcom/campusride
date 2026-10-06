import pytest
from datetime import date
from fastapi.testclient import TestClient
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.models.people import Student
from app.models.transport import Bus


@pytest.fixture(autouse=True)
def setup_attendance_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)
    seed_transport(db=db_session)
    seed_attendance(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_student_attendance_summary(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/attendance/students/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_expected"] > 0
    assert data["total_boarded"] > 0
    assert data["boarding_rate_pct"] > 70.0


def test_mark_individual_student_attendance(client: TestClient, db_session):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    student = db_session.query(Student).first()
    bus = db_session.query(Bus).first()

    payload = {
        "student_id": student.id,
        "bus_id": bus.id,
        "trip_type": "Morning Pickup",
        "status": "Boarded",
        "method": "Manual",
        "remarks": "Manual verified boarding"
    }

    res = client.post("/api/v1/attendance/students", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == student.id
    assert data["status"] == "Boarded"
    assert data["student_name"] == student.name


def test_batch_mark_student_attendance(client: TestClient, db_session):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    bus = db_session.query(Bus).first()
    students = db_session.query(Student).limit(5).all()

    items = [{"student_id": s.id, "status": "Boarded", "remarks": "Batch check-in"} for s in students]
    payload = {
        "bus_id": bus.id,
        "trip_type": "Morning Pickup",
        "method": "Manual",
        "items": items
    }

    res = client.post("/api/v1/attendance/students/batch", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    records = res.json()
    assert len(records) == 5
    assert all(r["status"] == "Boarded" for r in records)


def test_student_privacy_student_role(client: TestClient, db_session):
    # Logged in as student
    token = get_token(client, "student@campusride.edu", "Student@123")

    # Student requests attendance
    res = client.get("/api/v1/attendance/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    
    # If student has records, they must all belong to this student
    if data["total"] > 0:
        student_obj = db_session.query(Student).filter(Student.student_id == "STU-0001").first()
        for item in data["items"]:
            assert item["student_id"] == student_obj.id


def test_student_privacy_driver_forbidden(client: TestClient):
    # Logged in as driver
    token = get_token(client, "driver@campusride.edu", "Driver@123")

    # Driver attempts to access student attendance list -> 403 Forbidden
    res = client.get("/api/v1/attendance/students", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_staff_attendance_check_in_and_summary(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")

    # Query staff summary
    res = client.get("/api/v1/attendance/staff/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["drivers_present"] >= 18
    assert data["incharges_present"] >= 19
    assert data["attendance_rate_pct"] >= 90.0

    # Query staff list
    list_res = client.get("/api/v1/attendance/staff", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    staff_items = list_res.json()["items"]
    assert len(staff_items) >= 40  # 20 drivers + 20 incharges
