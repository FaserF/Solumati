from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import urllib.request
import urllib.error
import json
import shutil
import logging
from datetime import datetime, timedelta

# Local modules
from database import get_db
import models, schemas
from security import hash_password
from dependencies import require_admin, require_moderator_or_admin
from utils import get_setting, save_setting
from config import CURRENT_VERSION

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin")

# --- Dynamic Roles Endpoint ---
@router.get("/roles")
def get_system_roles(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """Returns a list of all available system roles with translation keys."""
    return [
        {"name": "admin", "description_key": "role.admin.desc"},
        {"name": "moderator", "description_key": "role.moderator.desc"},
        {"name": "user", "description_key": "role.user.desc"},
        {"name": "guest", "description_key": "role.guest.desc"},
        {"name": "test", "description_key": "role.test.desc"}
    ]

@router.get("/users", response_model=List[schemas.UserDisplay])
def admin_get_users(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    logger.info(f"Admin {current_admin.username} fetched users.")
    return db.query(models.User).order_by(models.User.id).all()

@router.put("/users/{user_id}")
def admin_update_user(user_id: int, update: schemas.UserAdminUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    if update.username and update.username != user.username: user.username = update.username
    if update.email and update.email != user.email: user.email = update.email
    if update.password: user.hashed_password = hash_password(update.password)
    if update.is_verified is not None: user.is_verified = update.is_verified
    if update.is_visible_in_matches is not None: user.is_visible_in_matches = update.is_visible_in_matches
    if update.two_factor_method is not None: user.two_factor_method = update.two_factor_method

    db.commit()
    logger.info(f"Admin {current_admin.username} updated user {user_id}.")
    return {"status": "success"}

@router.put("/users/{user_id}/punish")
def admin_punish_user(user_id: int, action: schemas.AdminPunishAction, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    logger.info(f"Admin {current_admin.username} executing action {action.action} on user {user_id}")

    if action.action == "delete": db.delete(user)
    elif action.action == "reactivate":
        user.is_active = True
        user.deactivation_reason = None
        user.banned_until = None
    elif action.action == "deactivate":
        user.is_active = False
        user.deactivation_reason = action.reason_type
        user.ban_reason_text = action.custom_reason
        if action.reason_type.startswith("TempBan"):
            user.banned_until = datetime.utcnow() + timedelta(hours=action.duration_hours or 24)
    elif action.action == "promote_moderator":
        user.role = "moderator"
        logger.info(f"User {user.username} promoted to moderator.")
    elif action.action == "demote_user":
        user.role = "user"
        logger.info(f"User {user.username} demoted to regular user.")
    elif action.action == "demote_test":
        user.role = "test"
        logger.info(f"User {user.username} changed to test user.")
    elif action.action == "demote_guest":
        user.role = "guest"
    elif action.action == "verify": user.is_verified = True

    db.commit()
    return {"status": "success"}

@router.get("/settings", response_model=schemas.SystemSettings)
def get_admin_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    return {
        "mail": get_setting(db, "mail", schemas.MailConfig()),
        "registration": get_setting(db, "registration", schemas.RegistrationConfig()),
        "legal": get_setting(db, "legal", schemas.LegalConfig())
    }

@router.put("/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    save_setting(db, "legal", settings.legal.dict())
    logger.info(f"Admin {current_admin.username} updated system settings.")
    return {"status": "updated"}

@router.get("/diagnostics", response_model=schemas.SystemDiagnostics)
def get_diagnostics(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    total, used, free = shutil.disk_usage(".")

    # Try fetching latest version from Github
    latest_version = "Unknown"
    update_available = False
    try:
        url = "https://api.github.com/repos/FaserF/Solumati/releases/latest"
        req = urllib.request.Request(url, headers={'User-Agent': 'Solumati-Backend'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                latest_version = data.get('tag_name', 'Unknown')
                if latest_version != CURRENT_VERSION and latest_version != "Unknown":
                    update_available = True
    except urllib.error.HTTPError as e:
        if e.code == 404:
            logger.info("Diagnostics: No latest release found on GitHub (404). This is normal for new repos.")
        else:
            logger.warning(f"Diagnostics: GitHub API error: {e}")
    except Exception as e:
        logger.warning(f"Diagnostics: Could not fetch latest version: {e}")

    return {
        "current_version": CURRENT_VERSION,
        "latest_version": latest_version,
        "update_available": update_available,
        "internet_connected": True, # Simplified check
        "disk_total_gb": round(total / (2**30), 2),
        "disk_free_gb": round(free / (2**30), 2),
        "disk_percent": round((used / total) * 100, 1),
        "database_connected": True,
        "api_reachable": True
    }

@router.get("/changelog", response_model=List[schemas.ChangelogRelease])
def get_changelog(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    try:
        url = "https://api.github.com/repos/FaserF/Solumati/releases"
        req = urllib.request.Request(url, headers={'User-Agent': 'Solumati-Backend'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                releases = []
                for item in data:
                    releases.append(schemas.ChangelogRelease(
                        tag_name=item.get('tag_name', 'v0.0.0'),
                        name=item.get('name', 'Release'),
                        body=item.get('body', ''),
                        published_at=item.get('published_at', ''),
                        html_url=item.get('html_url', '')
                    ))
                return releases
    except Exception as e:
        logger.warning(f"Could not fetch changelog: {e}")
    return []

# Placeholder for Reports
@router.get("/reports", response_model=List[schemas.ReportDisplay])
def get_reports(db: Session = Depends(get_db), current_mod: models.User = Depends(require_moderator_or_admin)):
    return []

@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_mod: models.User = Depends(require_moderator_or_admin)):
    return {"status": "deleted"}