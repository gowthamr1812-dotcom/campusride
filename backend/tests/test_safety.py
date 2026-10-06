import pytest
from fastapi.testclient import TestClient

from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.seed.seed_fleet import seed_fleet
from app.seed.seed_safety import seed_safety
from app.models.transport import Bus
from app.models.safety import EmergencyIncident, Notification


@pytest.fixture(autouse=True)
def setup_safety_data(db_session):
    seed_default_users(db=db_session)
    seed_people(db=db_session)
    seed_transport(db=db_session)
    seed_attendance(db=db_session)
    seed_finance(db=db_session)
    seed_fleet(db=db_session)
    seed_safety(db=db_session)


def get_token(client: TestClient, email: str, password: str) -> str:
    res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": email, "password": password}
    )
    assert res.status_code == 200
    return res.json()["access_token"]


def test_emergency_summary_and_incidents(client: TestClient):
    """Admin retrieves incident counts and active SOS items."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")

    summary_res = client.get("/api/v1/emergency/summary", headers={"Authorization": f"Bearer {token}"})
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["total_incidents"] >= 5
    assert summary["active_sos_count"] >= 1
    assert summary["dispatched_count"] >= 1

    list_res = client.get("/api/v1/emergency", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    incidents = list_res.json()["items"]
    assert len(incidents) >= 5
    assert any(i["status"] == "Triggered / Active" for i in incidents)


def test_driver_triggers_emergency_sos(client: TestClient, db_session):
    """Driver triggers SOS; marks bus Stopped and auto-creates Emergency Notification."""
    token = get_token(client, "driver@campusride.edu", "Driver@123")
    bus = db_session.query(Bus).filter(Bus.bus_number == "BUS-01").first()

    payload = {
        "bus_id": bus.id,
        "incident_type": "Medical Emergency",
        "severity": "Critical",
        "latitude": 12.9360,
        "longitude": 80.1280,
        "location_name": "Chromepet Railway Gate",
        "description": "Student collapsed due to severe heat exhaustion. Emergency oxygen kit in use."
    }

    res = client.post("/api/v1/emergency", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 201
    incident = res.json()

    assert incident["incident_code"].startswith("SOS-2026-")
    assert incident["status"] == "Triggered / Active"
    assert incident["severity"] == "Critical"

    # Bus status should be Stopped
    db_session.refresh(bus)
    assert bus.status == "Stopped"

    # Verify notification created
    notif = db_session.query(Notification).filter(
        Notification.category == "EMERGENCY_SOS",
        Notification.target_bus_id == bus.id
    ).first()
    assert notif is not None
    assert "EMERGENCY SOS" in notif.title


def test_update_and_resolve_emergency_incident(client: TestClient, db_session):
    """Admin dispatches rescue bus and resolves incident, restoring vehicle status."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")
    incident = db_session.query(EmergencyIncident).filter(
        EmergencyIncident.status == "Triggered / Active"
    ).first()
    rescue_bus = db_session.query(Bus).filter(Bus.id != incident.bus_id).first()

    # 1. Update to Dispatched
    disp_res = client.put(
        f"/api/v1/emergency/{incident.id}",
        json={"status": "Dispatched", "rescue_bus_id": rescue_bus.id, "resolution_notes": "Rescue vehicle dispatched to site."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "Dispatched"

    # 2. Mark Resolved
    res_res = client.put(
        f"/api/v1/emergency/{incident.id}",
        json={"status": "Resolved", "resolution_notes": "All students transferred and arrived safely."},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "Resolved"
    assert res_res.json()["resolved_at"] is not None


def test_notification_list_and_read_receipts(client: TestClient):
    """Student receives targeted notifications and records read receipts."""
    token = get_token(client, "student@campusride.edu", "Student@123")

    list_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    data = list_res.json()
    assert data["total"] > 0
    assert data["unread_count"] > 0

    first_notif = data["items"][0]
    notif_id = first_notif["id"]

    # Mark as read
    read_res = client.post(f"/api/v1/notifications/{notif_id}/read", headers={"Authorization": f"Bearer {token}"})
    assert read_res.status_code == 200

    # Query again
    recheck_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    recheck_items = recheck_res.json()["items"]
    target_item = next(i for i in recheck_items if i["id"] == notif_id)
    assert target_item["is_read"] is True

    # Mark all read
    all_res = client.post("/api/v1/notifications/read-all", headers={"Authorization": f"Bearer {token}"})
    assert all_res.status_code == 200

    final_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {token}"})
    assert final_res.json()["unread_count"] == 0


def test_safety_instructions_and_acknowledgment(client: TestClient):
    """Student reads safety instructions and submits compliance acknowledgment."""
    token = get_token(client, "student@campusride.edu", "Student@123")

    res = client.get("/api/v1/instructions", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    instructions = res.json()["items"]
    assert len(instructions) >= 3

    inst = instructions[0]
    assert inst["is_mandatory"] is True

    # Acknowledge instruction
    ack_res = client.post(
        f"/api/v1/instructions/{inst['id']}/acknowledge",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert ack_res.status_code == 200
    ack_data = ack_res.json()
    assert ack_data["status"] == "Acknowledged"

    # Re-verify
    re_res = client.get("/api/v1/instructions", headers={"Authorization": f"Bearer {token}"})
    re_inst = next(i for i in re_res.json()["items"] if i["id"] == inst["id"])
    assert re_inst["is_acknowledged"] is True


def test_websocket_notifications_stream(client: TestClient):
    """Verifies WebSocket push notification stream connection."""
    with client.websocket_connect("/ws/notifications") as ws:
        ready = ws.receive_json()
        assert ready["type"] == "NOTIFICATIONS_STREAM_READY"

        ws.send_json({"type": "PING"})
        pong = ws.receive_json()
        assert pong["type"] == "PONG"
