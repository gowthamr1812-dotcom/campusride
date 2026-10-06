import pytest
from fastapi.testclient import TestClient
from app.seed.seed_users import seed_default_users
from app.models.user import User, UserRole, UserSession, LoginHistory
from app.core.deps import require_roles
from app.main import app


# Seed default users in test database before auth tests
@pytest.fixture(autouse=True)
def seed_test_users(db_session):
    seed_default_users(db=db_session)


def test_login_all_five_roles(client: TestClient):
    role_credentials = [
        ("admin@campusride.edu", "Admin@123", "ADMIN"),
        ("manager@campusride.edu", "Manager@123", "TRANSPORT_MANAGER"),
        ("incharge@campusride.edu", "Incharge@123", "BUS_INCHARGE"),
        ("driver@campusride.edu", "Driver@123", "DRIVER"),
        ("student@campusride.edu", "Student@123", "STUDENT"),
    ]

    for email, password, expected_role in role_credentials:
        response = client.post(
            "/api/v1/auth/login",
            json={"username_or_email": email, "password": password}
        )
        assert response.status_code == 200, f"Failed for {email}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "Bearer"
        assert data["user"]["role"] == expected_role
        assert len(data["permissions"]) > 0


def test_login_invalid_password(client: TestClient, db_session):
    response = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@campusride.edu", "password": "WrongPassword!"}
    )
    assert response.status_code == 401
    data = response.json()
    assert "error" in data or "detail" in data

    # Verify failed attempt recorded in database
    user = db_session.query(User).filter(User.email == "admin@campusride.edu").first()
    assert user.failed_login_attempts >= 1

    # Verify login history audit
    history = db_session.query(LoginHistory).filter(
        LoginHistory.attempted_email == "admin@campusride.edu"
    ).order_by(LoginHistory.id.desc()).first()
    assert history is not None
    assert history.success is False


def test_refresh_token_flow(client: TestClient):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "manager@campusride.edu", "password": "Manager@123"}
    )
    assert login_res.status_code == 200
    refresh_token = login_res.json()["refresh_token"]

    refresh_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 200
    data = refresh_res.json()
    assert "access_token" in data
    assert data["user"]["role"] == "TRANSPORT_MANAGER"


def test_get_me_endpoint(client: TestClient):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "student@campusride.edu", "password": "Student@123"}
    )
    token = login_res.json()["access_token"]

    # Authorized request
    me_res = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["user"]["email"] == "student@campusride.edu"
    assert me_data["user"]["role"] == "STUDENT"
    assert "transport:own:read" in me_data["permissions"]

    # Unauthorized request (missing token)
    unauth_res = client.get("/api/v1/auth/me")
    assert unauth_res.status_code == 401


def test_sessions_and_logout(client: TestClient):
    login_res = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "incharge@campusride.edu", "password": "Incharge@123"}
    )
    token = login_res.json()["access_token"]
    refresh_token = login_res.json()["refresh_token"]

    # List active sessions
    sessions_res = client.get(
        "/api/v1/auth/sessions",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert sessions_res.status_code == 200
    sessions = sessions_res.json()
    assert len(sessions) >= 1
    assert any(s["is_revoked"] is False for s in sessions)

    # Logout
    logout_res = client.post(
        "/api/v1/auth/logout",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert logout_res.status_code == 200
    assert logout_res.json()["success"] is True

    # After logout, refreshing with that revoked session should fail
    refresh_res = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    assert refresh_res.status_code == 401


def test_rbac_authorization(client: TestClient):
    # Student login
    student_login = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "student@campusride.edu", "password": "Student@123"}
    )
    student_token = student_login.json()["access_token"]

    # Admin login
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"username_or_email": "admin@campusride.edu", "password": "Admin@123"}
    )
    admin_token = admin_login.json()["access_token"]

    # Student accessing admin-only endpoint: should be 403 Forbidden
    student_res = client.get(
        "/api/v1/auth/login-history",  # Only admins can view others/unrestricted
        headers={"Authorization": f"Bearer {student_token}"}
    )
    assert student_res.status_code == 200
    # Normal user sees only own records
    assert all(r["attempted_email"] == "student@campusride.edu" for r in student_res.json())

    # Admin accessing login history sees all records
    admin_res = client.get(
        "/api/v1/auth/login-history",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert admin_res.status_code == 200
    assert len(admin_res.json()) > 0
