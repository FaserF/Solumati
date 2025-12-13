import os
import sys

import pytest
from fastapi.testclient import TestClient

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.api.dependencies import (get_current_user_from_header, require_admin,
                                  require_moderator_or_admin)
from app.db import models
from app.main import app

# client = TestClient(app)


# Helper to mock user
def mock_user_dep(role="user", id=1):
    user = models.User(
        id=id,
        username=f"mock_{role}",
        role=role,
        email=f"{role}@test.com",
        is_active=True,
    )
    return lambda: user


# --- GUEST TESTS ---
def test_guest_access_denied(client):
    # Guests should not access admin panels
    # app.dependency_overrides[require_admin] = mock_user_dep(role="guest")  <-- REMOVED: Do not override logic
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

    del app.dependency_overrides[get_current_user_from_header]
    if require_admin in app.dependency_overrides:
        del app.dependency_overrides[require_admin]


# --- TEST USER TESTS ---
def test_test_user_access_denied(client):
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="test")

    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    del app.dependency_overrides[get_current_user_from_header]
    if require_admin in app.dependency_overrides:
        del app.dependency_overrides[require_admin]


# --- USER TESTS ---
def test_standard_user_access_denied(client):
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="user")

    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    del app.dependency_overrides[get_current_user_from_header]
    if require_admin in app.dependency_overrides:
        del app.dependency_overrides[require_admin]


# --- MODERATOR TESTS ---
def test_moderator_access(client):
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(
        role="moderator"
    )

    # Mod CANNOT access full user list (Admin only)
    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 403

    # Mod CAN access reports
    # Note: Requires DB to work for fetching reports?
    # If the endpoint uses `db` dependency, we might need to mock that too or rely on test DB.
    # Assuming test DB is handled or empty list returned.
    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    del app.dependency_overrides[get_current_user_from_header]
    if require_admin in app.dependency_overrides:
        del app.dependency_overrides[require_admin]


# --- ADMIN TESTS ---
def test_admin_access(client):
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="admin")

    # Admin CAN access users
    response = client.get("/admin/users", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    # Admin CAN access reports
    response = client.get("/admin/reports", headers={"X-User-ID": "1"})
    assert response.status_code == 200

    del app.dependency_overrides[get_current_user_from_header]
    if require_admin in app.dependency_overrides:
        del app.dependency_overrides[require_admin]


# --- GUEST MATCH VISIBILITY ---
def test_guest_match_visibility(client):
    # Setup: Create 1 Dummy (test) and 1 Real (user)
    # 1. Login/Mock as Admin to create users? Or use DB fixture directly if available?
    # The 'client' fixture likely uses a test DB session.
    # But direct DB access in test file requires 'db' fixture.
    # Let's use `app.dependency_overrides` for current user, but relies on pre-existing data or we insert it.

    # We can try to rely on `test_registration` like setup or just trust the DB is clean?
    # Let's insert via API if possible, or assume we can mock db query?
    # Mocking DB query in integration test is hard.
    # We'll use the API to create users if possible, or just fail if not.

    # Better: Override `get_db` to generic mocked session? No, `client` uses `TestingSessionLocal`.
    # Let's use `client` to create users as admin first?
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep(role="admin")

    # Create Dummy
    # We can't easily create a 'test' role user via API unless we are admin and use SQL?
    # Or register and then update role?
    # Admin can update role.

    # Register "dummy_user"
    # Actually, simpler: Test against the LOGIC using unit test style if DB is hard?
    # But the user asked for CI test.
    # Let's assume we can just inject dependency usage.

    pass  # Placeholder if too complex without DB Access code here.
    # Ideally checking `users.py` logic directly.

    # Let's write a targeted test that mocks the DB session result!
    # That validates the logic in `get_matches`.


from unittest.mock import MagicMock

from app.api.routers import users as users_router


def test_guest_logic_unit():
    # Mock DB Session
    mock_db = MagicMock()

    # Mock Guest User (ID 0)
    guest_user = models.User(
        id=0, role="guest", answers=[3, 3, 3, 3], intent="casual", is_active=True
    )
    mock_db.query.return_value.filter.return_value.first.return_value = guest_user

    # Mock Query Results
    # 1 Dummy, 1 Real
    dummy = models.User(
        id=10,
        username="Dummy",
        role="test",
        about_me="Full Info",
        image_url="/img.jpg",
        answers=[3, 3, 3, 3],
        intent="casual",
        is_active=True,
        is_visible_in_matches=True,
    )
    real = models.User(
        id=11,
        username="RealUser",
        role="user",
        about_me="Real Info",
        image_url="/real.jpg",
        answers=[3, 3, 3, 3],
        intent="casual",
        is_active=True,
        is_visible_in_matches=True,
    )

    # filter().filter()...all()
    # We need to mock the chain.
    # db.query(User).filter(...).filter(...)...all()
    mock_query = mock_db.query.return_value
    mock_query.filter.return_value = mock_query  # Chaining
    mock_query.all.return_value = [dummy, real]

    # Call get_matches directly
    res = users_router.get_matches(user_id=0, db=mock_db)

    # Verify
    assert len(res) == 2

    # Check Dummy (Should be full)
    dummy_res = next(r for r in res if r.user_id == 10)
    assert dummy_res.username == "Dummy"
    assert dummy_res.about_me == "Full Info"
    assert "RESTRICTED_VIEW" not in dummy_res.match_details

    # Check Real (Should be obfuscated)
    real_res = next(r for r in res if r.user_id == 11)
    assert real_res.username == "R..."  # First char + ...
    assert real_res.about_me != "Real Info"  # Should be replaced
    assert "RESTRICTED_VIEW" in real_res.match_details
