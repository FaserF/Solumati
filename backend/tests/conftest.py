import pytest
import os
import sys
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.core.database import Base, get_db
from app.api.dependencies import get_current_user_from_header
from app.db import models
from app.core.config import TEST_MODE

from unittest.mock import patch

@pytest.fixture(scope="module")
def test_db():
    # Use in-memory SQLite for tests
    SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
    from sqlalchemy.pool import StaticPool
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Patch the main app's engine and SessionLocal to use our test DB
    with patch("app.main.engine", engine), \
         patch("app.main.SessionLocal", TestingSessionLocal), \
         patch("app.core.database.engine", engine), \
         patch("app.core.database.SessionLocal", TestingSessionLocal):

        # Create tables
        Base.metadata.create_all(bind=engine)

        yield TestingSessionLocal

        Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def client(test_db):
    # Override get_db dependency
    def override_get_db():
        try:
            db = test_db()
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Use TestClient as context manager to trigger startup events
    with TestClient(app) as c:
        yield c

import secrets
import string

@pytest.fixture
def test_password():
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    return ''.join(secrets.choice(alphabet) for i in range(15))

@pytest.fixture(scope="session", autouse=True)
def cleanup_txt_files():
    yield
    # Cleanup .txt files in backend directory
    # Get backend dir relative to this conftest file (backend/tests/conftest.py)
    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_pattern = os.path.join(backend_dir, "*.txt")

    import glob
    print(f"DEBUG: Conftest file: {os.path.abspath(__file__)}")
    print(f"DEBUG: Backend dir: {backend_dir}")
    print(f"DEBUG: Pattern: {target_pattern}")

    files = glob.glob(target_pattern)
    print(f"DEBUG: Found files: {files}")

    for f in files:
        # Check filename only to exclude requirements.txt
        if os.path.basename(f) == "requirements.txt":
            print(f"DEBUG: Skipping {f}")
            continue
        try:
            os.remove(f)
            print(f"Cleaned up test file: {f}")
        except Exception as e:
            print(f"Failed to cleanup {f}: {e}")
