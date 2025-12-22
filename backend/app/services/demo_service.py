import asyncio
import logging
import random
from datetime import datetime
from typing import List, Optional

try:
    from faker import Faker
except ImportError:
    Faker = None

from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.db import models
from app.services.websocket_manager import manager

logger = logging.getLogger(__name__)

class DemoService:
    def __init__(self):
        self.active_mode: Optional[str] = None  # 'local' or 'persistent'
        self.task: Optional[asyncio.Task] = None
        if Faker:
            self.faker = Faker()
        else:
            self.faker = None
            logger.warning("Faker library not installed. Demo features will generate errors or use fallbacks.")
        self.errors: List[dict] = []
        self._stop_event = asyncio.Event()

    async def start_demo(self, mode: str):
        if self.task and not self.task.done():
            self.stop_demo()

        self.active_mode = mode
        self._stop_event.clear()
        self.task = asyncio.create_task(self._simulation_loop())
        logger.info(f"Demo Mode started: {mode}")

    def stop_demo(self):
        if self.task:
            self._stop_event.set()
            self.task.cancel()
            self.task = None
        self.active_mode = None
        logger.info("Demo Mode stopped")

    def get_errors(self) -> List[dict]:
        return self.errors

    def clear_errors(self):
        self.errors = []

    async def _simulation_loop(self):
        """Main loop for generating events."""
        try:
            while not self._stop_event.is_set():
                if self.active_mode == 'local':
                    await self._run_local_simulation()
                elif self.active_mode == 'persistent':
                    await self._run_persistent_simulation()

                # Random delay between 0.5s and 3s to simulate activity
                await asyncio.sleep(random.uniform(0.5, 3.0))
        except asyncio.CancelledError:
            logger.info("Demo simulation task cancelled.")
        except Exception as e:
            logger.error(f"Critical Error in Demo Loop: {e}")
            self._record_error("Critical Loop Error", str(e))

    async def _run_local_simulation(self):
        """Mode 1: Broadcast fake data without saving."""
        if not self.faker:
            logger.warning("Faker not active, skipping local simulation step.")
            return

        # 1. Simulate Chat Message (Group simulating behavior)
        # We send a "demo_message" event that the frontend can display in a special banner/feed
        msg = self.faker.sentence()
        user_name = self.faker.user_name()

        payload = {
            "type": "demo_message",
            "username": user_name,
            "content": msg,
            "timestamp": datetime.utcnow().isoformat(),
            "fake_member_count": random.randint(9900, 10100) # Simulating ~10k users
        }
        await manager.broadcast(payload)

        # 2. Simulate System Notification occasionally
        if random.random() < 0.2:
            notif = {
                "type": "demo_notification",
                "title": f"New User: {self.faker.first_name()}",
                "message": "just joined the group."
            }
            await manager.broadcast(notif)


    async def _run_persistent_simulation(self):
        """Mode 2: Save data to DB and replicate real behavior."""
        try:
            with SessionLocal() as db:
                action = random.choice(['create_user', 'send_message', 'system_error'])

                if action == 'create_user':
                    await self._create_dummy_user(db)
                elif action == 'send_message':
                    await self._send_real_message(db)
                elif action == 'system_error':
                    # Intentionally cause/simulate an error
                    await self._simulate_error()

        except Exception as e:
            self._record_error("Persistent Loop Error", str(e))

    async def _create_dummy_user(self, db: Session):
        # Create a user in DB
        try:
            if not self.faker:
                return

            profile = self.faker.profile()
            username = profile['username']
            email = profile['mail']

            # Check exist
            if db.query(models.User).filter(models.User.email == email).first():
                return

            new_user = models.User(
                username=username,
                email=email,
                role="guest", # Safe default
                hashed_password="dummy_password_hash",
                is_active=True
            )
            db.add(new_user)
            db.commit()

            # Broadcast "Real" notification if implemented in app, but here we manually broadcast
            # to verify "Live" updates in Admin Console
            await manager.broadcast({
                "type": "system_event",
                "event": "user_created",
                "data": {"username": username, "id": new_user.id}
            })

        except Exception as e:
            db.rollback()
            self._record_error("Create User Failed", str(e))

    async def _send_real_message(self, db: Session):
        # Pick 2 random users and send a message
        try:
            users = db.query(models.User).limit(50).all()
            if len(users) < 2:
                return

            sender, receiver = random.sample(users, 2)
            content = "This is a demo message."
            if self.faker:
                content = self.faker.sentence()

            # Logic similar to chat.py router
            # Reuse logic? For now, simple insert
            new_msg = models.Message(
                sender_id=sender.id,
                receiver_id=receiver.id,
                content=content, # Should be encrypted technically, but for demo plain or simple
                timestamp=datetime.utcnow(),
                is_read=False
            )
            # If we want to test encryption we'd import it. Let's send plain for now or mimic
            # Actually chat.py expects decrypted for history?
            # If I insert plain and chat.py tries to decrypt, it might fail or show garbage.
            # Safe bet: Import encrypt
            from app.api.routers import chat
            encrypted = chat.encrypt_message(content)
            new_msg.content = encrypted

            db.add(new_msg)
            db.commit()

            # Broadcast via Manager (Targeted)
            payload = {
                "id": new_msg.id,
                "sender_id": sender.id,
                "receiver_id": receiver.id,
                "content": content,
                "timestamp": new_msg.timestamp.isoformat(),
                "is_transient": False
            }
            await manager.send_personal_message(payload, receiver.id)
            await manager.send_personal_message(payload, sender.id)

            # Also Broadcast "Activity" to admins?
            await manager.broadcast({
                "type": "admin_spy",
                "event": "message_sent",
                "info": f"Message from {sender.username} to {receiver.username}"
            })

        except Exception as e:
            self._record_error("Send Message Failed", str(e))

    async def _simulate_error(self):
        # Simulate a caught exception
        try:
            if random.random() < 0.5:
                # 1. Division by zero
                _ = 1 / 0
            else:
                # 2. ValueError
                int("im_not_a_number")
        except Exception as e:
            self._record_error("Simulated Fault", str(e), fatal=False)

    def _record_error(self, title: str, details: str, fatal: bool = False):
        error_entry = {
            "id": len(self.errors) + 1,
            "title": title,
            "details": details,
            "timestamp": datetime.utcnow().isoformat(),
            "fatal": fatal,
            "github_issue_link": self._generate_github_link(title, details)
        }
        self.errors.append(error_entry)
        # Broadcast error to "Live Error Log"
        asyncio.create_task(manager.broadcast({
            "type": "system_error",
            "error": error_entry
        }))

    def _generate_github_link(self, title, body) -> str:
        # Pre-fill GitHub Issue URL
        base = "https://github.com/FaserF/Solumati/issues/new"
        import urllib.parse
        q = urllib.parse.urlencode({
            "title": f"[Demo Error] {title}",
            "body": f"### Error Detection\n\n**Error:** {title}\n**Details:**\n{body}\n\n*Reported via Demo Mode*"
        })
        return f"{base}?{q}"

demo_service = DemoService()
