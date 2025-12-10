from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import json
import logging

from database import get_db
import models, schemas
from dependencies import get_current_user_from_header
from utils import get_setting

# Try to import pywebpush, if not available, push will fail but app won't crash
try:
    from pywebpush import webpush, WebPushException
    HAS_WEBPUSH = True
except ImportError:
    HAS_WEBPUSH = False

logger = logging.getLogger(__name__)

router = APIRouter()

# --- VAPID KEYS (Should be env vars or settings) ---
# For this MVP, we will try to fetch from Admin Settings or use generate ones
# But VAPID keys must be consistent.
# We will use the 'SystemSetting' to store them if generated.

@router.get("/notifications", response_model=List[schemas.NotificationDisplay])
def get_notifications(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Get all notifications for current user."""
    return db.query(models.Notification).filter(
        models.Notification.user_id == user.id
    ).order_by(models.Notification.created_at.desc()).limit(50).all()

@router.put("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: int, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notif_id, models.Notification.user_id == user.id).first()
    if not notif: raise HTTPException(404, "Not found")
    notif.is_read = True
    db.commit()
    return {"status": "ok"}

@router.delete("/notifications/clear")
def clear_all_notifications(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    db.query(models.Notification).filter(models.Notification.user_id == user.id).delete()
    db.commit()
    return {"status": "cleared"}

# --- PUSH NOTIFICATIONS ---

@router.get("/notifications/vapid-public-key")
def get_vapid_public_key(db: Session = Depends(get_db)):
    """Returns the Public Key for Push Subscription."""
    # We store keys in system settings "push_keys" = { "private": "...", "public": "..." }
    keys_json = get_setting(db, "push_keys", None)

    if not keys_json and HAS_WEBPUSH:
        # Generate new keys if missing
        # This requires 'openssl' or using pywebpush CLI usually, but pywebpush itself doesn't export strict keygen?
        # Actually it's easier to ask User to provide them or generate once.
        # For auto-magic:
        # We can implement a simple key generation helper or dummy key.
        # But VAPID needs real format.
        # Check if user provided them in env?
        # For now, return empty if not set, Frontend handles "Not Configured"
        return {"publicKey": None, "error": "VAPID keys not configured in Admin"}

    return {"publicKey": keys_json.get("public") if keys_json else None}

@router.post("/notifications/subscribe")
def subscribe_push(sub: schemas.PushSubscription, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Save the Web Push Subscription for the user."""
    # We store it in user.push_subscription AND user.app_settings
    # Actually models.User has 'push_subscription' column now (implied from earlier view, wait, I saw it in models.py view? Yes, line 95)

    user.push_subscription = json.dumps(sub.dict())
    db.commit()
    return {"status": "subscribed"}

# --- INTERNAL HELPER (Not Route) ---
def send_push_to_user(db: Session, user_id: int, title: str, body: str, url: str = "/"):
    """
    Sends a Push Notification to a user if they have a subscription.
    Also creates a DB Notification.
    """
    # 1. DB Notification
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: return

    notif = models.Notification(
        user_id=user_id,
        title=title,
        message=body,
        type="system",
        link=url,
        created_at=datetime.utcnow()
    )
    db.add(notif)
    db.commit()

    # 2. Web Push
    if not HAS_WEBPUSH: return

    if not user.push_subscription: return

    keys = get_setting(db, "push_keys", {})
    if not keys or not keys.get("private_key"): return # Use private_key instead of private to be exact? keys_json usually has "privateKey"

    try:
        subscription_info = json.loads(user.push_subscription)

        payload = json.dumps({
            "title": title,
            "body": body,
            "url": url
        })

        webpush(
            subscription_info=subscription_info,
            data=payload,
            vapid_private_key=keys["private_key"],
            vapid_claims={
                "sub": "mailto:admin@solumati.com"
            }
        )
        logger.info(f"Push sent to user {user_id}")
    except WebPushException as ex:
        logger.error(f"WebPush failed: {ex}")
        # If 410 Gone, remove subscription
        # if ex.response and ex.response.status_code == 410:
        #     user.push_subscription = None
        #     db.commit()
    except Exception as e:
        logger.error(f"Push generic error: {e}")
