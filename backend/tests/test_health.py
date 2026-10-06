from fastapi.testclient import TestClient


def test_root_endpoint(client: TestClient):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "CampusRide"
    assert "version" in data
    assert "documentation" in data
    assert data["health"] == "/api/v1/health"


def test_health_check_endpoint(client: TestClient):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "services" in data
    assert "database" in data["services"]
    assert "api" in data["services"]
    assert data["services"]["api"] == "ready"
    assert "uptime_seconds" in data
    assert data["uptime_seconds"] >= 0


def test_cors_headers(client: TestClient):
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET"
        }
    )
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_404_routing(client: TestClient):
    response = client.get("/api/v1/non-existent-endpoint")
    assert response.status_code == 404
