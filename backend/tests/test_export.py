from unittest.mock import MagicMock, patch

from app.core.security import hash_password
from app.db import models


def create_test_user(session, username, email, role="user"):
    user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password("TestPass123!"),
        role=role,
        is_active=True,
        is_verified=True,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def test_export_download(client, test_db):
    session = test_db()
    try:
        user = create_test_user(session, "exportuser", "export@example.com")
        user_id = user.id
    finally:
        session.close()

    headers = {"X-User-ID": str(user_id)}

    response = client.post(f"/users/{user_id}/export?method=download", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"
    assert "attachment" in response.headers["content-disposition"]
    assert "solumati_export" in response.headers["content-disposition"]


from app.services.utils import save_setting


def test_export_email(client, test_db):
    session = test_db()
    try:
        user = create_test_user(session, "emailuser", "email@example.com")
        user_id = user.id

        # Enable Email Service
        mail_config = {
            "enabled": True,
            "smtp_host": "smtp.example.com",
            "smtp_port": 587,
            "smtp_user": "test",
            "smtp_password": "test",
            "from_email": "test@example.com",
            "sender_name": "Test",
        }
        save_setting(session, "mail", mail_config)
    finally:
        session.close()

    headers = {"X-User-ID": str(user_id)}

    with patch("smtplib.SMTP") as mock_smtp:
        mock_server = MagicMock()
        mock_smtp.return_value.__enter__.return_value = mock_server

        response = client.post(f"/users/{user_id}/export?method=email", headers=headers)

        if response.status_code != 200:
            print(response.json())

        assert response.status_code == 200
        assert response.json()["message"] == "Email will be sent shortly."
        assert mock_server.send_message.called
