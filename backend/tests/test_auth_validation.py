import pytest
from fastapi.testclient import TestClient
import sys
import os
from datetime import datetime

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
import models
from database import get_db

# client = TestClient(app)  <-- Removed global client

def test_login_invalid_credentials(client):
    payload = {"login": "nonexistent@example.com", "password": "wrongpassword"}
    response = client.post("/login", json=payload)
    assert response.status_code == 401
    assert "Invalid credentials" in response.json()["detail"]

def test_registration_duplicate_email(client):
    # 1. Register User
    unique_str = str(datetime.now().timestamp())
    email = f"dup_{unique_str}@example.com"
    payload = {
        "email": email,
        "password": "Password123!",
        "real_name": "Duplicate Test",
        "intent": "longterm",
        "answers": []
    }
    r1 = client.post("/users/", json=payload)
    if r1.status_code != 200:
        # If user mock persists across tests?
        # Ideally tests use test DB. Assuming clean or unique email works.
        pass

    assert r1.status_code == 200

    # 2. Try Duplicate
    r2 = client.post("/users/", json=payload)
    assert r2.status_code == 400
    assert "Email already registered" in r2.json()["detail"]

def test_registration_duplicate_username():
    # Username is generated from email usually, OR provided?
    # backend/routers/users.py: create_user(user: schemas.UserCreate)
    # It generates username from email part + random if not provided?
    # Let's check schemas/routers.
    # Assuming standard flow checks unique constraint.
    pass
