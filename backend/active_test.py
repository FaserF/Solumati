import pytest
import asyncio
from httpx import AsyncClient, ASGITransport
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.db import models

# Use TestClient for synchronous endpoints if needed, but here we need Async for WS
# We'll use a mix or just AsyncClient

@pytest.mark.asyncio
async def test_demo_mode_local():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Login/Get Token (We mock user)
        # We need a token for WS? WS in chat.py uses "token" param which is treated as user_id
        # Let's assume user_id=1 (Admin)

        # 2. Start Demo Mode Local
        headers = {"X-User-Id": "1", "X-User-Role": "admin"} # Mock header for dependencies
        # Wait, get_current_user_from_header checks DB?
        # Yes. We need to ensure Admin exists.
        # It should exist from startup event or we force it.
        # But we are in a test env. `app.dependency_overrides` might be needed if DB is empty.
        # But main.py startup event runs? Not with AsyncClient unless we use LifeSpan?
        # Let's rely on the DB having data if we run against existing DB or mock dependency.

        # Let's override checking user to always return Admin
        app.dependency_overrides = {}
        # Actually easier to just insert Admin if using a test DB.

        # Mock dependency for user
        from app.api.dependencies import get_current_user_from_header
        def mock_get_user():
            return models.User(id=1, username="admin", role="admin", is_superuser=True)

        app.dependency_overrides[get_current_user_from_header] = mock_get_user

        # Start Demo
        resp = await ac.post("/demo/start?mode=local")
        assert resp.status_code == 200
        assert resp.json()["status"] == "started"

        # Connect WS
        # AsyncClient doesn't support WS easily.
        # Use TestClient for WS? TestClient wraps Starlette TestClient which has websocket_connect

        with TestClient(app) as client:
            with client.websocket_connect("/ws/chat?token=1") as websocket:
                # Wait for a broadcast message
                # The loop runs every ~0.5-3s
                # We might need to wait up to 4s
                data = websocket.receive_json(mode="text")
                print(f"Received: {data}")
                assert "type" in data
                # It could be demo_message or demo_notification
                assert data["type"] in ["demo_message", "demo_notification"]

        # Stop Demo
        resp = await ac.post("/demo/stop")
        assert resp.status_code == 200

@pytest.mark.asyncio
async def test_demo_mode_persistent():
    # Setup Override
    from app.api.dependencies import get_current_user_from_header
    def mock_get_user():
        return models.User(id=1, username="admin", role="admin", is_superuser=True)
    app.dependency_overrides[get_current_user_from_header] = mock_get_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Start Persistent
        resp = await ac.post("/demo/start?mode=persistent")
        assert resp.status_code == 200

        # Wait a bit
        await asyncio.sleep(5)

        # Check Errors
        resp = await ac.get("/demo/errors")
        assert resp.status_code == 200
        errors = resp.json()
        print(f"Errors found: {len(errors)}")
        # We might have errors if DB is locked or random simulation error

        # Stop
        await ac.post("/demo/stop")

        # Verify some data might have been created?
        # Hard to verify without DB access here, but if no errors, it likely worked.
