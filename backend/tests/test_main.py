import os
import sys


# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# client = TestClient(app)


def test_read_main(client):
    response = client.get("/public-config")
    assert response.status_code == 200
    assert "backend_version" in response.json()
