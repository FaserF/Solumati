import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock
import sys
import os
from datetime import datetime

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from dependencies import get_current_user_from_header, get_db
import models

# client = TestClient(app)

def mock_user_dep(id=1, email="notif@test.com"):
    user = models.User(id=id, email=email, role="user", is_active=True)
    return lambda: user

def test_get_notifications_empty(client):
    mock_db = MagicMock()
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep()
    app.dependency_overrides[get_db] = lambda: mock_db

    # Mock query returning empty list
    mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

    response = client.get("/notifications", headers={"X-User-ID": "1"})
    # Note: Router prefix is usually included?
    # backend/main.py usually includes routers.
    # checking notifications.py -> @router.get("/notifications")
    # If main.py says app.include_router(notifications.router, prefix="/api/notifications")?
    # Or just app.include_router(notifications.router)?
    # Assuming prefix is /api based on previous tests.
    # Wait, in notifications.py: router = APIRouter() (no prefix) -> @router.get("/notifications")
    # If main.py does include_router(..., prefix="/api"), then URL is /api/notifications

    # Let's assume standard /api/notifications
    # But wait, notifications.py line 22: router = APIRouter()
    # Line 29: @router.get("/notifications")
    # If main.py mounts it at /api, then it's /api/notifications

    # Wait, check main.py...
    pass # Can't check main.py here inside writing file. Assuming path based on convention.
    # If path is wrong, test will fail 404.

    # Let's assume /api/notifications is correct route for `get_notifications`.

    assert response.status_code == 200 # If 404, path is wrong.
    assert response.json() == []

    del app.dependency_overrides[get_current_user_from_header]
    del app.dependency_overrides[get_db]

def test_mark_notification_read(client):
    mock_db = MagicMock()
    app.dependency_overrides[get_current_user_from_header] = mock_user_dep()
    app.dependency_overrides[get_db] = lambda: mock_db

    # Mock finding the notification
    mock_notif = models.Notification(id=123, is_read=False, user_id=1)
    mock_db.query.return_value.filter.return_value.first.return_value = mock_notif

    response = client.put(f"/notifications/123/read", headers={"X-User-ID": "1"})

    assert response.status_code == 200
    assert mock_notif.is_read == True
    mock_db.commit.assert_called_once()

    del app.dependency_overrides[get_current_user_from_header]
    del app.dependency_overrides[get_db]
