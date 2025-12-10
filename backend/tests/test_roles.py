import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from dependencies import require_admin, require_moderator_or_admin, get_current_user_from_header
import models

client = TestClient(app)

# Helper to mock user
def mock_user_dep(role="user", id=1):
    user = models.User(id=id, username=f"mock_{role}", role=role, email=f"{role}@test.com", is_active=True)
    return lambda: user

# --- GUEST TESTS ---
def test_guest_access_denied():
    # Guests should not access admin panels
    app.dependency_overrides[require_admin] = mock_user_dep(role="guest") # Should fail inside dependency?
    # Actually require_admin logic raises 403 if role != admin.
    # We need to override the dependency that *calls* require_admin?
    # No, require_admin IS the dependency. If we return a guest user from it, the *endpoint* thinks we are admin IF the dependency logic was "return user".
    # BUT `require_admin` implementation checks role.
    # WE MUST OVERRIDE `get_current_user_from_header` to return a guest, and let `require_admin` do its check.

    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="guest")
    # We must CLEAR require_admin override if it was set elsewhere, but here we just set get_current_user

    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    app.dependency_overrides = {}

# --- TEST USER TESTS ---
def test_test_user_access_denied():
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="test")

    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    app.dependency_overrides = {}

# --- USER TESTS ---
def test_standard_user_access_denied():
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="user")

    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    app.dependency_overrides = {}

# --- MODERATOR TESTS ---
def test_moderator_access():
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="moderator")

    # Mod CANNOT access full user list (Admin only)
    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    # Mod CAN access reports
    # Note: Requires DB to work for fetching reports?
    # If the endpoint uses `db` dependency, we might need to mock that too or rely on test DB.
    # Assuming test DB is handled or empty list returned.
    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    app.dependency_overrides = {}

# --- ADMIN TESTS ---
def test_admin_access():
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="admin")

    # Admin CAN access users
    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    # Admin CAN access reports
    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    app.dependency_overrides = {}
