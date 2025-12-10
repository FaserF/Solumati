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
