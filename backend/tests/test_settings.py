import pytest
from fastapi.testclient import TestClient

from app.seed.seed_users import seed_default_users
from app.seed.seed_people import seed_people
from app.seed.seed_transport import seed_transport
from app.seed.seed_attendance import seed_attendance
from app.seed.seed_finance import seed_finance
from app.seed.seed_fleet import seed_fleet
from app.seed.seed_safety import seed_safety
from app.models.user import User


@pytest.fixture(autouse=True)
def setup_settings_data(db_session):
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


def test_admin_list_users(client: TestClient):
    """Admin retrieves paginated system users with role filters."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")

    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 5
    assert len(data["items"]) >= 5

    # Filter by role
    student_res = client.get("/api/v1/users?role=STUDENT", headers={"Authorization": f"Bearer {token}"})
    assert student_res.status_code == 200
    assert all(u["role"] == "STUDENT" for u in student_res.json()["items"])


def test_admin_create_and_manage_user(client: TestClient):
    """Admin provisions, modifies, toggles active status, and unlocks a user account."""
    token = get_token(client, "admin@campusride.edu", "Admin@123")

    payload = {
        "email": "ops_dispatcher@campusride.edu",
        "username": "ops_dispatcher",
        "password": "Password@123",
        "full_name": "Operations Dispatcher",
        "phone": "+91 98401 99999",
        "role": "TRANSPORT_MANAGER",
        "is_active": True
    }

    create_res = client.post("/api/v1/users", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 201
    created_user = create_res.json()
    assert created_user["email"] == payload["email"]
    user_id = created_user["id"]

    # Update user details
    update_res = client.put(
        f"/api/v1/users/{user_id}",
        json={"full_name": "Senior Operations Dispatcher", "phone": "+91 98401 88888"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Senior Operations Dispatcher"

    # Toggle status to inactive
    toggle_res = client.post(f"/api/v1/users/{user_id}/toggle-status", headers={"Authorization": f"Bearer {token}"})
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_active"] is False

    # Unlock user
    unlock_res = client.post(f"/api/v1/users/{user_id}/unlock", headers={"Authorization": f"Bearer {token}"})
    assert unlock_res.status_code == 200
    assert unlock_res.json()["failed_login_attempts"] == 0


def test_student_forbidden_from_user_admin(client: TestClient):
    """Students are strictly forbidden from user administrative APIs."""
    student_token = get_token(client, "student@campusride.edu", "Student@123")

    res = client.get("/api/v1/users", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403

    post_res = client.post(
        "/api/v1/users",
        json={"email": "hacker@test.com", "username": "hacker", "password": "123", "full_name": "Bad Actor", "role": "ADMIN"},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert post_res.status_code == 403


def test_profile_endpoints(client: TestClient):
    """User inspects and updates their own profile."""
    token = get_token(client, "student@campusride.edu", "Student@123")

    prof_res = client.get("/api/v1/profile", headers={"Authorization": f"Bearer {token}"})
    assert prof_res.status_code == 200
    prof = prof_res.json()
    assert prof["email"] == "student@campusride.edu"
    assert prof["role"] == "STUDENT"
    assert prof["active_sessions_count"] >= 1
    assert prof["assigned_bus"] is not None

    # Update profile phone
    upd_res = client.put(
        "/api/v1/profile",
        json={"phone": "+91 98401 77777"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert upd_res.status_code == 200
    assert upd_res.json()["phone"] == "+91 98401 77777"


def test_change_password_flow(client: TestClient):
    """User changes password and verifies login with new credentials."""
    token = get_token(client, "driver@campusride.edu", "Driver@123")

    pw_res = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "Driver@123", "new_password": "NewDriverPassword@123"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert pw_res.status_code == 200

    # Test login with new password
    new_login = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "driver@campusride.edu", "password": "NewDriverPassword@123"}
    )
    assert new_login.status_code == 200
    new_token = new_login.json()["access_token"]

    # Restore original password to keep pristine test state for other suites
    restore_res = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "NewDriverPassword@123", "new_password": "Driver@123"},
        headers={"Authorization": f"Bearer {new_token}"}
    )
    assert restore_res.status_code == 200


def test_user_preferences_and_system_settings(client: TestClient):
    """User manages multilingual/theme preferences and admin manages system config."""
    student_token = get_token(client, "student@campusride.edu", "Student@123")

    # 1. Preferences
    pref_res = client.get("/api/v1/settings/preferences", headers={"Authorization": f"Bearer {student_token}"})
    assert pref_res.status_code == 200
    assert pref_res.json()["language"] == "en"

    upd_pref = client.put(
        "/api/v1/settings/preferences",
        json={"language": "ta", "theme": "dark", "sound_effects": False},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert upd_pref.status_code == 200
    assert upd_pref.json()["language"] == "ta"
    assert upd_pref.json()["theme"] == "dark"

    # 2. System Settings - Read (available to all authenticated users)
    sys_res = client.get("/api/v1/settings/system", headers={"Authorization": f"Bearer {student_token}"})
    assert sys_res.status_code == 200
    assert "college_name" in sys_res.json()["settings"]

    # Student cannot update system settings
    forb_res = client.put(
        "/api/v1/settings/system",
        json={"settings": {"morning_departure_time": "08:00 AM"}},
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert forb_res.status_code == 403

    # Admin CAN update system settings
    admin_token = get_token(client, "admin@campusride.edu", "Admin@123")
    admin_upd = client.put(
        "/api/v1/settings/system",
        json={"settings": {"morning_departure_time": "06:45 AM"}},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_upd.status_code == 200
    assert admin_upd.json()["settings"]["morning_departure_time"] == "06:45 AM"
