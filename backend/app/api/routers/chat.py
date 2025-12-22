import base64
import json
import os
import secrets
from datetime import datetime
from typing import Dict, List

from app.api.dependencies import \
    get_current_user_from_header  # We might need a query param version for WS
from app.core.database import get_db
from app.db import models, schemas
from cryptography.fernet import Fernet
from fastapi import (APIRouter, Depends, HTTPException, WebSocket,
                     WebSocketDisconnect)
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

# --- ENCRYPTION SETUP ---
# In a real app, this MUST be in environment variables.
# We will generate/load a key. For MVP persistence, we will use a hardcoded fallback or load from file.
# To keep it simple and consistent across restarts (unless file is deleted), we try to load/create a key file.
KEY_FILE = "secret.key"


def load_key():
    if os.path.exists(KEY_FILE):
        with open(KEY_FILE, "rb") as key_file:
            return key_file.read()
    else:
        key = Fernet.generate_key()
        with open(KEY_FILE, "wb") as key_file:
            key_file.write(key)
        return key


try:
    cipher_suite = Fernet(load_key())
except:
    # Fallback if something fails (e.g. read permissions), though dangerous for data loss if it changes
    cipher_suite = Fernet(Fernet.generate_key())


def encrypt_message(message: str) -> str:
    return cipher_suite.encrypt(message.encode()).decode()


def decrypt_message(encrypted_message: str) -> str:
    try:
        return cipher_suite.decrypt(encrypted_message.encode()).decode()
    except:
        return "[Decryption Error]"


router = APIRouter()


from app.services.websocket_manager import manager


# --- WS DEPENDENCY HELPER ---
# WebSockets cannot send headers easily in browser JS API (standard WebSocket).
# So we usually pass token in query param: ws://url/ws?token=...
def get_current_user_ws(token: str, db: Session):
    # In this specific codebase, it seems Auth is handled via user_id instead of a signed token
    # (based on dependencies.py relying on Header(X-User-Id)).
    # So we treat the 'token' as the user_id.
    try:
        user_id = int(token)
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            return None
        return user
    except ValueError:
        return None


@router.websocket("/ws/chat")
async def websocket_endpoint(
    websocket: WebSocket, token: str, db: Session = Depends(get_db)
):
    user = get_current_user_ws(token, db)
    if not user:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            # Expecting JSON: { "receiver_id": 123, "content": "Hello" }
            try:
                msg_data = json.loads(data)
                receiver_id = int(msg_data["receiver_id"])
                content = msg_data["content"]

                # --- PERMISSION CHECK ---
                receiver = (
                    db.query(models.User).filter(models.User.id == receiver_id).first()
                )
                if not receiver:
                    continue  # Or send error

                # 0. Support Chat Logic (ID 3)
                if receiver_id == 3:
                    # Check Settings
                    from app.services.utils import get_setting

                    support_conf = get_setting(
                        db, "support_chat", {"enabled": False, "email_target": ""}
                    )
                    support_enabled = support_conf.get("enabled", False)
                    user_is_support = user.id == 3  # Support replying to user

                    if not user_is_support:
                        if not support_enabled and user.role != "admin":
                            err = {"error": "Support chat is currently read-only."}
                            await manager.send_personal_message(err, user.id)
                            continue

                        # Email Forwarding - BLOCKED FOR GUESTS
                        # Guests can chat (sandbox) but we do not forward to email to prevent spam.
                        if not user.is_guest:
                            support_email = support_conf.get("email_target", "")
                            if support_email:
                                from app.services.utils import (
                                    create_html_email, send_mail_sync)

                                try:
                                    subject = f"Support Request: {user.username}"
                                    html_body = create_html_email(
                                        title=f"New Message from {user.username}",
                                        content=f"<p><b>User:</b> {user.username} (ID: {user.id})</p><p><b>Message:</b><br>{content}</p>",
                                    )
                                    # Send sync (might block slightly but acceptable for MVP support chat)
                                    send_mail_sync(
                                        support_email, subject, html_body, db
                                    )
                                except Exception as exc:
                                    print(f"Error forwarding support email: {exc}")

                # 1. Guest Restriction (Guest -> Can only chat with 'test' users)
                if user.is_guest:
                    # UPDATED: Allow Guest -> Support (3) as well
                    if (
                        receiver.role != "test"
                        and receiver.role != "admin"
                        and receiver.id != 3
                    ):
                        # Block
                        err = {"error": "Guests can only chat with Test users."}
                        await manager.send_personal_message(err, user.id)
                        continue

                # 2. Test User Restriction (Test -> Test only)
                if user.role == "test":
                    # UPDATED: Allow Test -> Support (3) as well
                    if (
                        receiver.role != "test"
                        and receiver.role != "admin"
                        and receiver.id != 3
                    ):
                        err = {
                            "error": "Test users can only chat with other Test users."
                        }
                        await manager.send_personal_message(err, user.id)
                        continue

                # 3. Encrypt
                encrypted_content = encrypt_message(content)

                # 4. Storage Logic (Transient for Guest)
                # User request: "Chatnachrichten des Users 'Guest' sollen nicht aufgehoben werden... direkt nach dem senden gelöscht"
                # Guest messages to Support SHOULD probably be kept? No, user said "Chatnachrichten des Users Guest... direkt gelöscht"
                # But Support needs to see them?
                # If Guest -> Support, we probably WANT to save it so Support sees it?
                # User Requirement: "Dieser Chat soll keine Schreibmöglichkeit bieten, aber den Status der letzten Meldungen darstellen" (This implies Support broadcast or system msgs?)
                # Actually, "Jeder User soll automatisch einen Chat... haben. Dieser Chat soll keine Schreibmöglichkeit bieten... aber den Status der letzten Meldungen darstellen"
                # Wait. "Status der letzten Meldungen" might mean "Status updates from Support"?
                # But then "Optional soll im Admin Panel einstellbar sein, ob man dem Support Account schreiben kann"
                # So if writable, it acts like a normal chat.
                # If Guest -> Support (Enabled), should it save?
                # If it's transient, Support won't see it if they aren't online.
                # Let's stick to Transient for Guest globally for safety/privacy as requested. (Email captures it).

                is_transient = user.is_guest

                new_msg_id = -1
                timestamp = datetime.utcnow()

                if not is_transient:
                    new_msg = models.Message(
                        sender_id=user.id,
                        receiver_id=receiver_id,
                        content=encrypted_content,
                        timestamp=timestamp,
                        is_read=False,
                    )
                    db.add(new_msg)
                    db.commit()
                    db.refresh(new_msg)
                    new_msg_id = new_msg.id
                else:
                    # Fake ID for transient message (negative to indicate not saved?)
                    # Or just random number?
                    new_msg_id = secrets.randbelow(1000000)

                # 5. Construct Payload
                response_payload = {
                    "id": new_msg_id,
                    "sender_id": user.id,
                    "receiver_id": receiver_id,
                    "content": content,
                    "timestamp": timestamp.isoformat(),
                    "is_transient": is_transient,
                }

                # 6. Notify Receiver (Real-time)
                await manager.send_personal_message(response_payload, receiver_id)

                # 7. Notify Sender (Confirmation/Echo)
                await manager.send_personal_message(response_payload, user.id)

            except Exception as e:
                # Invalid format or db error
                print(f"WS Error: {e}")
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)


@router.get("/chat/history/{other_user_id}", response_model=List[dict])
def get_chat_history(
    other_user_id: int,
    current_user: models.User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """Retrieve chat history with a specific user."""

    # Check permissions? Only if matches exist? For now, open if known ID.

    messages = (
        db.query(models.Message)
        .filter(
            or_(
                and_(
                    models.Message.sender_id == current_user.id,
                    models.Message.receiver_id == other_user_id,
                ),
                and_(
                    models.Message.sender_id == other_user_id,
                    models.Message.receiver_id == current_user.id,
                ),
            )
        )
        .order_by(models.Message.timestamp.asc())
        .all()
    )

    # Decrypt
    results = []
    for m in messages:
        decrypted = decrypt_message(m.content)

        # Mark as read if I am the receiver and it's unread
        if m.receiver_id == current_user.id and not m.is_read:
            m.is_read = True
            db.add(m)  # Mark for update

        results.append(
            {
                "id": m.id,
                "sender_id": m.sender_id,
                "receiver_id": m.receiver_id,
                "content": decrypted,
                "timestamp": m.timestamp,
                "is_read": m.is_read,
            }
        )

    db.commit()  # Commit read status changes
    return results


@router.get("/chat/conversations", response_model=List[dict])
def get_conversations(
    current_user: models.User = Depends(get_current_user_from_header),
    db: Session = Depends(get_db),
):
    """
    Returns a list of conversations for the current user.
    Each item includes the partner user details and the last message.
    """
    # 1. Fetch all messages involving the user, ordered by time DESC
    # We limit to e.g. 500 recent messages to find unique conversations
    recent_msgs = (
        db.query(models.Message)
        .filter(
            or_(
                models.Message.sender_id == current_user.id,
                models.Message.receiver_id == current_user.id,
            )
        )
        .order_by(models.Message.timestamp.desc())
        .limit(1000)
        .all()
    )

    conversations = {}  # partner_id -> { partner_user, last_msg }

    for m in recent_msgs:
        partner_id = m.receiver_id if m.sender_id == current_user.id else m.sender_id

        if partner_id not in conversations:
            # Need to fetch partner details if not already known?
            # We can fetch them in bulk later or one by one.
            # For MVP, let's just store the msg and ID, then fetch Users.
            conversations[partner_id] = {"message": m, "unread_count": 0}

        # Count unread
        if m.receiver_id == current_user.id and not m.is_read:
            conversations[partner_id]["unread_count"] += 1

    # 2. Get User Objects for partners
    partner_ids = list(conversations.keys())
    if not partner_ids:
        # User requested: Support Chat should ALWAYS be visible?
        # Or only if they chatted?
        # User said: "Mir fehlt immernoch irgendwo ein Reiter wo ich die vergangenen Chats aufrufen kann"
        # If no chats, maybe show nothing?
        # But Support might be good to auto-show if empty?
        # Let's stick to actual history for now.
        return []

    partners = db.query(models.User).filter(models.User.id.in_(partner_ids)).all()
    partners_map = {u.id: u for u in partners}

    result = []
    for pid in partner_ids:  # Keep order of recent_msgs (most recent first)
        if pid not in partners_map:
            continue

        user = partners_map[pid]
        data = conversations[pid]
        msg = data["message"]

        # specific decryption
        decrypted_content = decrypt_message(msg.content)

        result.append(
            {
                "partner_id": pid,
                "partner_username": user.username,
                "partner_real_name": user.real_name,
                "partner_image_url": user.image_url,
                "last_message": decrypted_content,
                "timestamp": msg.timestamp,
                "unread_count": data["unread_count"],
            }
        )

    return result
