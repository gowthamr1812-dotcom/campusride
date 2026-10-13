import pytest
from fastapi.testclient import TestClient

from app.core.security_apis import check_password_breach
from app.core.config import settings
from app.seed.seed_users import seed_default_users


@pytest.fixture(autouse=True)
def setup_security_test_data(db_session):
    seed_default_users(db=db_session)


def get_token(client: TestClient, email: str = "driver@campusride.edu", password: str = "Driver@123") -> str:
    res = client.post("/api/v1/auth/login", json={"username_or_email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def test_security_headers_on_root_and_api(client: TestClient):
    """Verifies that all OWASP security defense headers are present on API responses."""
    res = client.get("/")
    assert res.status_code == 200

    headers = res.headers
    assert headers["x-frame-options"] == "DENY"
    assert headers["x-content-type-options"] == "nosniff"
    assert "max-age=31536000" in headers["strict-transport-security"]
    assert headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert "default-src 'self'" in headers["content-security-policy"]
    assert "frame-ancestors 'none'" in headers["content-security-policy"]
    assert "camera=()" in headers["permissions-policy"]


def test_security_headers_on_404_error(client: TestClient):
    """Ensures security headers are attached even on error responses."""
    res = client.get("/api/v1/nonexistent-endpoint-xyz")
    assert res.status_code == 404

    headers = res.headers
    assert headers["x-frame-options"] == "DENY"
    assert headers["x-content-type-options"] == "nosniff"


def test_hibp_pwned_password_check():
    """Verifies HaveIBeenPwned k-anonymity breach detection logic."""
    novel_pass = "CampusRide#Production#Secured#Key!2026_Unique_XYZ"
    assert check_password_breach(novel_pass) is False

    # Empty password returns False
    assert check_password_breach("") is False


def test_change_password_blocks_pwned_password_if_flagged(client: TestClient, monkeypatch):
    """Verifies that change-password rejects passwords flagged by the HIBP audit service."""
    token = get_token(client, "driver@campusride.edu", "Driver@123")

    # Mock check_password_breach to simulate a compromised password
    monkeypatch.setattr("app.services.settings.check_password_breach", lambda pwd: True)

    res = client.post(
        "/api/v1/profile/change-password",
        json={"current_password": "Driver@123", "new_password": "pwned_password_12345"},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 400
    assert "Security Alert" in res.json()["detail"]
    assert "known data breaches" in res.json()["detail"]


def test_create_user_blocks_pwned_password_if_flagged(client: TestClient, monkeypatch):
    """Verifies that admin user provisioning rejects compromised passwords."""
    admin_token = get_token(client, "admin@campusride.edu", "Admin@123")

    # Mock check_password_breach to simulate compromised password
    monkeypatch.setattr("app.services.settings.check_password_breach", lambda pwd: True)

    res = client.post(
        "/api/v1/users",
        json={
            "email": "insecure_user@campusride.edu",
            "username": "insecure_user",
            "password": "pwned_password_12345",
            "full_name": "Insecure User",
            "role": "STUDENT"
        },
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert res.status_code == 400
    assert "Security Alert" in res.json()["detail"]
