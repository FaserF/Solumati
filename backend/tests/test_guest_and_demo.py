import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from app.main import app
from app.api.dependencies import get_current_user_from_header, get_db
from app.db import models

client = TestClient(app)

# Mock DB Session
def mock_get_db():
    yield MagicMock()

# Mock Authentication for Admin and Guest
def mock_get_current_admin():
    user = MagicMock(spec=models.User)
    user.id = 1
    user.username = "admin"
    user.role = "admin"
    user.is_superuser = True
    user.is_active = True
    return user

def mock_get_guest():
    user = MagicMock(spec=models.User)
    user.id = 0
    user.username = "Guest"
    user.role = "guest"
    user.is_active = True
    return user

@patch("app.api.routers.users.user_service")
def test_guest_discovery_route_shadowing(mock_user_service):
    """
    Verifies that /users/discover is NOT shadowed by /users/{user_id}.
    """
    app.dependency_overrides[get_current_user_from_header] = mock_get_guest
    app.dependency_overrides[get_db] = mock_get_db

    # Mock the service response so it doesn't really check DB
    mock_user_service.get_discover_candidates.return_value = []

    response = client.get("/users/discover")

    app.dependency_overrides = {}

    # Expect 200 OK. If shadowed by /users/{user_id}, it would be 422 (int validation) or 403 (forbidden).
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}. Response: {response.text}"

    data = response.json()
    assert isinstance(data, list)

@patch("app.services.demo_service.demo_service.start_demo")
def test_demo_mode_start_pydantic_fix(mock_start_demo):
    """
    Verifies that /api/demo/start?mode=local works with the new Pydantic pattern.
    """
    app.dependency_overrides[get_current_user_from_header] = mock_get_current_admin

    # Param 'mode' must match ^(local|persistent)$
    # We mock the async call
    import asyncio
    f = asyncio.Future()
    f.set_result(None)
    mock_start_demo.return_value = f

    response = client.post("/demo/start?mode=local")

    app.dependency_overrides = {}

    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}. Response: {response.text}"
    assert response.json()["status"] == "started"
    assert response.json()["mode"] == "local"
