import asyncio
import logging
from datetime import datetime, timedelta
from database import SessionLocal
import models

logger = logging.getLogger(__name__)

async def cleanup_unverified_users():
    logger.info("Starting cleanup of expired unverified accounts...")
    db = SessionLocal()
    try:
        expiration_threshold = datetime.utcnow() - timedelta(days=7)
        users_to_delete = db.query(models.User).filter(
            models.User.is_verified == False,
            models.User.created_at < expiration_threshold
        ).all()
        count = 0
        for user in users_to_delete:
            logger.info(f"Deleting expired unverified user: {user.email}")
            db.delete(user)
            count += 1
        if count > 0:
            db.commit()
            logger.info(f"Cleanup complete. Deleted {count} expired users.")
        else:
            logger.info("Cleanup complete. No expired users found.")
    except Exception as e:
        logger.error(f"Error during user cleanup task: {e}")
        db.rollback()
    finally:
        db.close()

async def periodic_cleanup_task():
    while True:
        await cleanup_unverified_users()
        await asyncio.sleep(86400) # Run daily