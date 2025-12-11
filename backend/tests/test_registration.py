import pytest
from fastapi.testclient import TestClient
import sys
import os
from datetime import datetime

# Ensure backend path is in sys.path if running from root or backend/tests
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.api.dependencies import require_admin
from app.db import models

# client = TestClient(app)

def test_registration_with_list_answers(client, test_password):
    """
    Verifies that the registration endpoint accepts 'answers' as a list (frontend legacy behavior)
    and does not crash.
    """
    timestamp = datetime.now().timestamp()
    email = f"test_reg_list_{timestamp}@example.com"
    payload = {
        "email": email,
        "password": test_password,
        "real_name": "Test User",
        "intent": "longterm",
        "answers": [3, 3, 3, 3] # This should now be accepted
    }

    response = client.post("/users/", json=payload)
    assert response.status_code == 200, f"Registration failed: {response.text}"
    data = response.json()
    assert data["email"] == email
    assert "id" in data

def test_admin_create_user_defaults(client, test_password):
    """
    Verifies that creating a user via Admin Panel (which might omit answers/intent) works
    due to default values being applied.
    """
    # Mock Admin Dependency
    mock_admin = models.User(id=999, username="admin_mock", role="admin", email="admin@mock.com")
    app.dependency_overrides[require_admin] = lambda: mock_admin

    timestamp = datetime.now().timestamp()
    payload = {
        "username": f"new_admin_user_{timestamp}",
        "email": f"new_admin_user_{timestamp}@test.com",
        "password": test_password,
        "role": "user"
        # answers and intent are OMITTED, should default
    }

    response = client.post("/admin/users", json=payload)

    # Clean up override
    app.dependency_overrides = {}

    assert response.status_code == 200, f"Admin create failed: {response.text}"
    assert response.json()["status"] == "success"

def test_match_gating_incomplete_profile(client, test_password):
    """
    Verifies that a user with an incomplete profile (e.g. just registered with dummy answers)
    cannot retrieve matches and receives a 403.
    """
    # 1. Register new user
    timestamp = datetime.now().timestamp()
    email = f"test_gating_{timestamp}@example.com"
    payload = {
        "email": email,
        "password": test_password,
        "real_name": "Incomplete User",
        "intent": "longterm",
        "answers": [3, 3, 3, 3] # Incomplete/Dummy answers
    }
    reg_response = client.post("/users/", json=payload)
    assert reg_response.status_code == 200
    user_id = reg_response.json()["id"]

    # 2. Mock Authentication to be this user
    # For dependencies.get_current_user_from_header, we assume it checks a header or similar.
    # We can override the dependency 'get_current_user_from_header' or 'get_current_user'
    # if we knew exactly which one 'get_matches' uses.

    # Looking at users.py: get_matches(user_id: int, db...)
    # Wait, get_matches endpoint signature:
    # def get_matches(user_id: int, db: Session = Depends(get_db)):
    # It takes user_id as path param and does NOT explicitly depend on current_user for the *request* validation itself
    # (except maybe global middleware? No, users.py lines 81-82 don't show Depends(get_current_user)).
    # BUT logic inside uses 'user_id' path param to fetch 'u'.
    # If I call /matches/{my_id}, it checks profile of {my_id}.
    # So I don't strictly need auth headers if the endpoint is public/unprotected
    # (which it seems to be based on the signature in `users.py` I read earlier!).
    #
    # Re-reading users.py step 49:
    # @router.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
    # def get_matches(user_id: int, db: Session = Depends(get_db)):
    # Correct, no Depends(get_current_user). It relies on the ID passed.
    # Security Note: This means anyone can check matches for any ID?
    # Probably a security flaw but out of scope for this fix.

    response = client.get(f"/matches/{user_id}")

    # EXPECTATION: 403 Forbidden because profile is incomplete
    assert response.status_code == 403, f"Expected 403 for incomplete profile, got {response.status_code}"
    assert "Profile Incomplete" in response.text
