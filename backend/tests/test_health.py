from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_root():
    """The API root should respond successfully."""

    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "running"


def test_health():
    """Health endpoint should report a healthy application."""

    response = client.get("/health")

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "ok"