import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os
from datetime import datetime

# Ensure backend path is in sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from dependencies import require_admin, get_current_user_from_header, get_db
import models

client = TestClient(app)

# Helper to mock user
def mock_user_dep(role="admin", id=1):
    user = models.User(id=id, username=f"mock_{role}", role=role, email=f"{role}@test.com", is_active=True)
    return lambda: user

# --- MAIL TESTS ---
@patch("utils.send_mail_sync")
@patch("utils.create_html_email")
def test_admin_send_test_mail(mock_create_html, mock_send_mail):
    # Setup Admin Mock
    app.dependency_overrides[require_admin] = mock_user_dep(role="admin")

    mock_create_html.return_value = "<html>Test</html>"

    payload = {"target_email": "test@example.com"}
    response = client.post("/admin/settings/test-mail", json=payload)

    assert response.status_code == 200
    assert response.json()["status"] == "sent"

    mock_send_mail.assert_called_once()

    app.dependency_overrides = {}

# --- CHAT TESTS ---
def test_get_conversations_mock_db():
    # We will mock the DB session to avoid needing a real DB for this logic check
    mock_db = MagicMock()

    # Mock Current User
    current_user = models.User(id=1, username="me", role="user")
    app.dependency_overrides[get_current_user_from_header] = lambda: current_user
    app.dependency_overrides[get_db] = lambda: mock_db

    # Setup Mock Data: Messages
    # The endpoint does: db.query(Message).filter(...).order_by(...).limit(...).all()
    # It constructs a complex query.
    # To mock this chain: mock_db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value

    msg1 = models.Message(
        id=10, sender_id=2, receiver_id=1, content="encrypted_hello",
        timestamp=datetime.now(), is_read=False
    )

    # Mock the chain
    mock_query = mock_db.query.return_value
    mock_filter = mock_query.filter.return_value
    mock_order = mock_filter.order_by.return_value
    mock_limit = mock_order.limit.return_value
    mock_limit.all.return_value = [msg1]

    # The endpoint then queries Users for partner IDs [2]
    # db.query(User).filter(...).all()
    partner_user = models.User(id=2, username="partner", real_name="Partner Real", image_url=None)

    # For the second query (Users), we need to handle that `query` satisfies both Message and User calls.
    # Side effect for `query(Model)`?
    def query_side_effect(model):
        if model == models.Message:
            return mock_query # Return the chain starter for Messages
        elif model == models.User:
            # Create a new mock chain for User
            u_query = MagicMock()
            u_query.filter.return_value.all.return_value = [partner_user]
            return u_query
        return MagicMock()

    mock_db.query.side_effect = query_side_effect

    # Also need to patch `decrypt_message` since we don't have the real key setup in tests possibly
    with patch("routers.chat.decrypt_message", return_value="Hello World"):
        response = client.get("/chat/conversations", headers={"X-User-ID": "1"})

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["partner_id"] == 2
    assert data[0]["last_message"] == "Hello World"
    assert data[0]["unread_count"] == 1 # Since is_read=False and receiver=me

    app.dependency_overrides = {}
