import pytest
from fastapi.testclient import TestClient
import sys
import os

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)

def test_read_main():
    response = client.get("/public-config")
    assert response.status_code == 200
    assert "backend_version" in response.json()
