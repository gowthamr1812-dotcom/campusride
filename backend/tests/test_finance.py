import pytest
from fastapi.testclient import TestClient
from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.models.people import Student
from app.models.finance import Receipt


@pytest.fixture(autouse=True)
def setup_finance_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)
    seed_transport(db=db_session)
    seed_attendance(db=db_session)
    seed_finance(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_finance_summary(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/fees/summary", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total_assessed"] > 1000000
    assert data["total_collected"] > 500000
    assert data["collection_rate_pct"] > 60.0
    assert data["fully_paid_students"] > 200


def test_list_fee_structures(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    res = client.get("/api/v1/fees", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 4
    assert any(s["slab_name"] == "Tier 1: Up to 15 km" for s in data["items"])


def test_create_fee_structure(client: TestClient):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    payload = {
        "academic_year": "2025-2026",
        "slab_name": "Tier 5: Ultra Express AC VIP",
        "min_distance_km": 60.0,
        "max_distance_km": 100.0,
        "amount": 42000.0,
        "billing_frequency": "Annual",
        "description": "Executive air-conditioned direct coach pass."
    }
    res = client.post("/api/v1/fees", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    data = res.json()
    assert data["slab_name"] == payload["slab_name"]
    assert data["amount"] == 42000.0


def test_process_payment_and_receipt_generation(client: TestClient, db_session):
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    student = db_session.query(Student).filter(Student.payment_status != "Paid").first()
    if not student:
        student = db_session.query(Student).first()

    payload = {
        "student_id": student.id,
        "amount": 5000.0,
        "payment_method": "UPI",
        "notes": "Mid-term fee installment"
    }

    res = client.post("/api/v1/payments", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    payment = res.json()
    assert payment["amount"] == 5000.0
    assert payment["receipt_number"] is not None

    # Fetch generated receipt
    rec_res = client.get(f"/api/v1/receipts/{payment['receipt_number']}", headers={"Authorization": f"Bearer {token}"})
    assert rec_res.status_code == 200
    receipt_data = rec_res.json()
    assert receipt_data["amount_paid"] == 5000.0
    assert receipt_data["student_name"] == student.name


def test_student_privacy_student_role(client: TestClient, db_session):
    # Log in as Student
    token = get_token(client, "student@campusride.edu", "Student@123")
    student_obj = db_session.query(Student).filter(Student.student_id == "STU-0001").first()

    # Query payments: should only see self payments
    res = client.get("/api/v1/payments", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    payments = res.json()["items"]
    for p in payments:
        assert p["student_id"] == student_obj.id

    # Query receipts: should only see self receipts
    rec_res = client.get("/api/v1/receipts", headers={"Authorization": f"Bearer {token}"})
    assert rec_res.status_code == 200
    receipts = rec_res.json()["items"]
    for r in receipts:
        assert r["student_id"] == student_obj.id

    # Attempt to view another student's receipt directly -> 403 Forbidden
    other_receipt = db_session.query(Receipt).filter(Receipt.student_id != student_obj.id).first()
    if other_receipt:
        forbidden_res = client.get(
            f"/api/v1/receipts/{other_receipt.receipt_number}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert forbidden_res.status_code == 403


def test_student_privacy_driver_forbidden(client: TestClient):
    # Log in as Driver
    token = get_token(client, "driver@campusride.edu", "Driver@123")

    # Driver attempts to access payments register -> 403 Forbidden
    res = client.get("/api/v1/payments", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403
