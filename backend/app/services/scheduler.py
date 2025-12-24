import json
import logging
from datetime import datetime, timedelta

from app.core.config import PROJECT_NAME
from app.core.database import SessionLocal
from app.db import models
from app.services.utils import (create_html_email, get_setting,
                                get_user_email_preferences, send_mail_sync)
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from sqlalchemy import or_

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def start_scheduler():
    if scheduler.running:
        logger.info("Scheduler already running.")
        return

    # Run every day at 08:00 AM
    trigger = CronTrigger(hour=8, minute=0)
    scheduler.add_job(
        send_daily_message_summaries, trigger, id="daily_summary", replace_existing=True
    )

    # Run cleanup of Guest Data every 1 hour (to ensure strict privacy in demo mode)
    scheduler.add_job(
        cleanup_guest_data, 'interval', hours=1, id="guest_cleanup", replace_existing=True
    )

    scheduler.start()
    logger.info("Scheduler started with daily summary job at 08:00.")


def send_daily_message_summaries():
    """
    Job to send daily summary of unread messages to users who opted in.
    """
    logger.info("Starting Daily Message Summary generation...")
    db: Session = SessionLocal()
    try:
        # 1. Get all active users
        users = db.query(models.User).filter(models.User.is_active == True).all()

        for user in users:
            # Check Preferences (Default False for new messages, but user might have enabled it)
            prefs = get_user_email_preferences(user)
            if not prefs.get("new_messages", False):
                continue

            # 2. Check for unread messages
            # We look for ANY unread messages, not just from last 24h,
            # because "Summary" implies "Here is what you missed".
            # If they didn't read it yesterday, they still need to know.
            # But maybe only recent ones? Let's show count of ALL unread.

            unread_count = (
                db.query(models.Message)
                .filter(
                    models.Message.receiver_id == user.id,
                    models.Message.is_read == False,
                )
                .count()
            )

            if unread_count == 0:
                continue

            # Get distinct senders of unread messages
            unread_senders = (
                db.query(models.Message.sender_id)
                .filter(
                    models.Message.receiver_id == user.id,
                    models.Message.is_read == False,
                )
                .distinct()
                .count()
            )

            # 3. Generate Email
            # Determine Language
            lang = "en"
            if user.app_settings:
                try:
                    s = (
                        json.loads(user.app_settings)
                        if isinstance(user.app_settings, str)
                        else user.app_settings
                    )
                    lang = s.get("language", "en")
                except:
                    pass

            from app.services.i18n import get_translations

            t = get_translations(lang)

            subject = f"[{PROJECT_NAME}] {t.get('email.summary.subject', 'Your Daily Summary')}"
            title = t.get("email.summary.title", "You have unread messages")

            if unread_senders == 1:
                desc = t.get(
                    "email.summary.desc_single",
                    "You have {count} unread message from 1 chat partner.",
                ).format(count=unread_count)
            else:
                desc = t.get(
                    "email.summary.desc_multi",
                    "You have {count} unread messages from {senders} chat partners.",
                ).format(count=unread_count, senders=unread_senders)

            btn_text = t.get("email.summary.btn", "Go to Chat")

            reg_config = get_setting(db, "registration", {})
            server_domain = reg_config.get("server_domain", "")
            action_url = f"{server_domain}/chat" if server_domain else None

            content = f"<p>{desc}</p>"

            html = create_html_email(
                title, content, action_url, btn_text, server_domain, db
            )

            # Send
            send_mail_sync(user.email, subject, html, db)
            logger.info(f"Daily summary sent to {user.email} ({unread_count} unread)")

    except Exception as e:
        logger.error(f"Error in send_daily_message_summaries: {e}")
    finally:
        db.close()


def cleanup_guest_data():
    """
    Periodic cleanup for Guest User (ID 0) to ensure privacy.
    Removes all messages and interactions associated with the Guest user.
    """
    logger.info("Starting Guest Data Cleanup...")
    db: Session = SessionLocal()
    try:
        # 1. Clear Guest Messages
        guest_id = 0

        # Count first for logging
        msg_count = db.query(models.Message).filter(
            or_(models.Message.sender_id == guest_id, models.Message.receiver_id == guest_id)
        ).count()

        if msg_count > 0:
            db.query(models.Message).filter(
                or_(models.Message.sender_id == guest_id, models.Message.receiver_id == guest_id)
            ).delete(synchronize_session=False)
            logger.info(f"Deleted {msg_count} guest messages.")

        # 2. Reset Guest Profile Data (Optional, ensuring clean slate)
        # We re-run ensure_guest_user which handles reset of standard fields
        from app.scripts.init_data import ensure_guest_user
        ensure_guest_user(db)

        # 3. Also clean up any Reports made by Guest?
        db.query(models.Report).filter(models.Report.reporter_id == guest_id).delete(synchronize_session=False)

        db.commit()
        logger.info("Guest data cleanup completed successfully.")

    except Exception as e:
        logger.error(f"Guest cleanup failed: {e}")
        db.rollback()
    finally:
        db.close()
