from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import List
import urllib.request
import urllib.error
import json
import shutil
import logging
from datetime import datetime, timedelta

# Local modules
from app.core.database import get_db
from app.db import models, schemas
from app.core.security import hash_password
from app.api.dependencies import require_admin, require_moderator_or_admin
from app.services.utils import get_setting, save_setting, send_account_deactivated_notification
from app.core.config import CURRENT_VERSION

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
    if update.is_visible_in_matches is not None: user.is_visible_in_matches = update.is_visible_in_matches
    if update.two_factor_method is not None: user.two_factor_method = update.two_factor_method
    if update.role: user.role = update.role

    db.commit()
    logger.info(f"Admin {current_admin.username} updated user {user_id}.")
    return {"status": "success"}

@router.post("/users")
def admin_create_user(new_user: schemas.UserCreateAdmin, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    if db.query(models.User).filter(models.User.email == new_user.email).first():
        raise HTTPException(400, "Email already exists")
    if db.query(models.User).filter(models.User.username == new_user.username).first():
        raise HTTPException(400, "Username already exists")

    user = models.User(
        email=new_user.email,
        username=new_user.username,
        hashed_password=hash_password(new_user.password),
        role=new_user.role,
        is_active=True,
        is_verified=True,
        is_guest=False,
        answers="{}", # Default empty answers
        intent="longterm" # Default intent
    )
    db.add(user)
    db.commit()
    logger.info(f"Admin {current_admin.username} created user {user.username}")
    return {"status": "success"}

@router.put("/users/{user_id}/punish")
def admin_punish_user(user_id: int, action: schemas.AdminPunishAction, background_tasks: BackgroundTasks, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    logger.info(f"Admin {current_admin.username} executing action {action.action} on user {user_id}")

    send_deactivation_email = False
    deactivation_reason = None

    if action.action == "delete": db.delete(user)
    elif action.action == "reactivate":
        user.is_active = True
        user.deactivation_reason = None
        user.banned_until = None
    elif action.action == "deactivate":
        user.is_active = False
        user.deactivation_reason = action.reason_type
        user.ban_reason_text = action.custom_reason
        deactivation_reason = action.custom_reason or action.reason_type
        send_deactivation_email = True
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

    # Send deactivation notification email
    if send_deactivation_email and action.action != "delete":
        background_tasks.add_task(send_account_deactivated_notification, user, deactivation_reason)

    return {"status": "success"}

@router.post("/users/{user_id}/reset-2fa")
def admin_reset_2fa(user_id: int, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """Reset 2FA for a specific user (Admin only)."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    user.two_factor_method = 'none'
    user.totp_secret = None
    user.webauthn_credentials = "[]"
    user.webauthn_challenge = None

    logger.info(f"Admin {current_admin.username} reset 2FA for User {user.username} (ID: {user.id})")

    db.commit()
    return {"status": "success", "message": "2FA Reset successfully"}

@router.get("/settings", response_model=schemas.SystemSettings)
def get_admin_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    # Fetch Settings
    mail_conf = get_setting(db, "mail", schemas.MailConfig().dict())
    reg_conf = get_setting(db, "registration", schemas.RegistrationConfig().dict())
    legal_conf = get_setting(db, "legal", schemas.LegalConfig().dict())
    oauth_conf = get_setting(db, "oauth", schemas.OAuthConfig().dict()) # Get Raw
    support_conf = get_setting(db, "support_chat", schemas.SupportChatConfig().dict())
    reg_notify_conf = get_setting(db, "registration_notification", schemas.RegistrationNotificationConfig().dict())
    reg_notify_conf = get_setting(db, "registration_notification", schemas.RegistrationNotificationConfig().dict())
    captcha_conf = get_setting(db, "captcha", schemas.CaptchaConfig().dict())
    maintenance_mode = get_setting(db, "maintenance_mode", False)
    update_channel = get_setting(db, "update_channel", "stable")

    assetlinks = get_setting(db, "assetlinks", [])
    if not isinstance(assetlinks, list):
        assetlinks = [] # Force list if DB contains invalid data

    # Mask Secrets for UI
    # We do not want to send the actual secrets to the frontend
    if oauth_conf.get('github', {}).get('client_secret'): oauth_conf['github']['client_secret'] = "******"
    if oauth_conf.get('google', {}).get('client_secret'): oauth_conf['google']['client_secret'] = "******"
    if oauth_conf.get('microsoft', {}).get('client_secret'): oauth_conf['microsoft']['client_secret'] = "******"

    # Mask CAPTCHA secret
    if captcha_conf.get('secret_key'): captcha_conf['secret_key'] = "******"

    return {
        "mail": mail_conf,
        "registration": reg_conf,
        "legal": legal_conf,
        "oauth": oauth_conf,
        "support_chat": support_conf,
        "registration_notification": reg_notify_conf,
        "captcha": captcha_conf,
        "registration_notification": reg_notify_conf,
        "captcha": captcha_conf,
        "assetlinks": assetlinks,
        "maintenance_mode": maintenance_mode,
        "update_channel": update_channel
    }

@router.put("/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    # Save Mail, Registration, Legal (Direct save)
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    save_setting(db, "legal", settings.legal.dict())
    save_setting(db, "support_chat", settings.support_chat.dict())
    save_setting(db, "registration_notification", settings.registration_notification.dict())
    save_setting(db, "registration_notification", settings.registration_notification.dict())
    save_setting(db, "assetlinks", settings.assetlinks)
    save_setting(db, "maintenance_mode", settings.maintenance_mode)
    save_setting(db, "update_channel", settings.update_channel)

    # Save OAuth (Handle Secrets)
    current_oauth = get_setting(db, "oauth", schemas.OAuthConfig().dict())
    new_oauth = settings.oauth.dict()
    for provider in ['github', 'google', 'microsoft']:
        submitted_secret = new_oauth.get(provider, {}).get('client_secret', '')
        if submitted_secret == "******":
            new_oauth[provider]['client_secret'] = current_oauth.get(provider, {}).get('client_secret', '')
    save_setting(db, "oauth", new_oauth)

    # Save CAPTCHA (Handle Secret)
    current_captcha = get_setting(db, "captcha", schemas.CaptchaConfig().dict())
    new_captcha = settings.captcha.dict()
    if new_captcha.get('secret_key') == "******":
        new_captcha['secret_key'] = current_captcha.get('secret_key', '')
    save_setting(db, "captcha", new_captcha)

    logger.info(f"Admin {current_admin.username} updated system settings.")
    return {"status": "updated"}

class TestMailRequest(BaseModel):
    target_email: str

@router.post("/settings/test-mail")
def send_test_mail(req: TestMailRequest, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    from app.services.utils import send_mail_sync, create_html_email
    try:
        content = f"""
        This is a test email triggered by {current_admin.username} from the Solumati Admin Console.<br><br>
        If you see this, your SMTP configuration is correct!
        """
        html = create_html_email("Test Mail", content, server_domain="", db=db)
        send_mail_sync(req.target_email, "Solumati Test Mail", html, db)
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"Test mail failed: {e}")
        raise HTTPException(500, f"Failed to send mail: {str(e)}")

@router.get("/diagnostics", response_model=schemas.SystemDiagnostics)
def get_diagnostics(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    total, used, free = shutil.disk_usage(".")

    # Fetch Releases
    latest_version_in_channel = "Unknown"
    update_available = False

    current_ver_str = CURRENT_VERSION.lstrip('v')
    update_channel = get_setting(db, "update_channel", "stable") # User preference

    try:
        # Fetch list of releases
        url = "https://api.github.com/repos/FaserF/Solumati/releases?per_page=20"
        req = urllib.request.Request(url, headers={'User-Agent': 'Solumati-Backend'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())

                # Helper to parse version roughly for comparison [Year, Month, Patch, Beta]
                    if len(parts) > 1:
                        is_beta = True
                        suffix = parts[1]
                        if 'beta' in suffix or suffix.startswith('b'):
                            beta_num = int(suffix.replace('beta', '').replace('b', ''))
                            # Priority: 2 (Beta)
                            ver_priority = 2
                        elif 'dev' in suffix or suffix.startswith('d'):
                            # Dev versions (e.g. -d1)
                            beta_num = int(suffix.replace('dev', '').replace('d', ''))
                            # Priority: 0 (Dev - Lowest)
                            ver_priority = 0
                        elif 'alpha' in suffix or suffix.startswith('a'):
                            beta_num = int(suffix.replace('alpha', '').replace('a', ''))
                            # Priority: 1 (Alpha)
                            ver_priority = 1
                        elif 'rc' in suffix:
                             beta_num = int(suffix.replace('rc', ''))
                             ver_priority = 3

                    # Return tuple for comparison: (Year, Month, Patch, Priority, SuffixNum)
                    # Priority: 0=Dev, 1=Alpha, 2=Beta, 3=RC, 4=Stable
                    return (base[0], base[1], base[2], ver_priority if is_beta else 4, beta_num)

                current_tuple = parse_ver(current_ver_str)
                found_ver_tuple = None
                found_tag = None

                for rel in data:
                    tag = rel.get('tag_name', 'v0.0.0')
                    is_prerelease = rel.get('prerelease', False)
                    t_ver = parse_ver(tag)

                    # Filter based on Channel
                    # If channel is 'stable', ignore prereleases
                    if update_channel == 'stable' and is_prerelease:
                        continue

                    # If channel is 'beta', we accept prereleases (and stable ones)
                    # If channel is 'alpha', everything goes (logic mainly same as beta here effectively)

                    # Logic: Find the highest version number that fits the channel
                    if not found_ver_tuple or t_ver > found_ver_tuple:
                        found_ver_tuple = t_ver
                        found_tag = tag

                if found_tag:
                    latest_version_in_channel = found_tag
                    if found_ver_tuple > current_tuple:
                        update_available = True

    except Exception as e:
        logger.warning(f"Diagnostics: Could not fetch releases: {e}")

    return {
        "current_version": CURRENT_VERSION,
        "latest_version": latest_version_in_channel,
        "latest_beta_version": latest_version_in_channel if update_channel != 'stable' else None, # Legacy field support
        "update_available": update_available,
        "beta_update_available": False, # Legacy field
        "internet_connected": True,
        "disk_total_gb": round(total / (2**30), 2),
        "disk_free_gb": round(free / (2**30), 2),
        "disk_percent": round((used / total) * 100, 1),
        "database_connected": True,
        "api_reachable": True
    }

@router.post("/update/trigger")
def trigger_update(version: str, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """
    Triggers the update process.
    Since we cannot reliably self-update in all environments, we:
    1. Save the target version to a file 'UPDATE_REQUEST'
    2. Save it to DB settings
    3. Return instruction
    """
    if not version:
        raise HTTPException(400, "Version required")

    # 1. Save to DB
    save_setting(db, "target_version", version)

    # 2. Touch File (for external watchers like run.sh or watchtower logic)
    try:
        with open("UPDATE_REQUEST", "w") as f:
            f.write(version)
    except Exception as e:
        logger.warning(f"Could not write UPDATE_REQUEST file: {e}")

    logger.info(f"Admin {current_admin.username} triggered update to {version}")

    return {
        "status": "pending",
        "message": f"Update to {version} requested. Container restart may be required.",
        "target_version": version
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

@router.get("/reports", response_model=List[schemas.ReportDisplay])
def get_reports(db: Session = Depends(get_db), current_mod: models.User = Depends(require_moderator_or_admin)):
    reports = db.query(models.Report).all()
    res = []
    for r in reports:
        res.append(schemas.ReportDisplay(
            id=r.id,
            reporter_username=r.reporter.username if (r.reporter and r.reporter.username) else "Unknown",
            reported_username=r.reported.username if (r.reported and r.reported.username) else "Unknown",
            reason=r.reason,
            status=r.status,
            created_at=r.created_at
        ))
    return res

@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), current_mod: models.User = Depends(require_moderator_or_admin)):
    r = db.query(models.Report).filter(models.Report.id == report_id).first()
    if not r: raise HTTPException(404, "Report not found")
    db.delete(r)
    db.commit()
    return {"status": "deleted"}