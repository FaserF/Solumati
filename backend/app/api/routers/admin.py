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
    assetlinks = get_setting(db, "assetlinks", [])

    # Mask Secrets for UI
    # We do not want to send the actual secrets to the frontend
    if oauth_conf.get('github', {}).get('client_secret'): oauth_conf['github']['client_secret'] = "******"
    if oauth_conf.get('google', {}).get('client_secret'): oauth_conf['google']['client_secret'] = "******"
    if oauth_conf.get('microsoft', {}).get('client_secret'): oauth_conf['microsoft']['client_secret'] = "******"

    return {
        "mail": mail_conf,
        "registration": reg_conf,
        "legal": legal_conf,
        "oauth": oauth_conf,
        "support_chat": support_conf,
        "assetlinks": assetlinks
    }

@router.put("/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    # Save Mail, Registration, Legal (Direct save)
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    # Duplicate removed
    save_setting(db, "legal", settings.legal.dict())
    save_setting(db, "support_chat", settings.support_chat.dict())
    save_setting(db, "assetlinks", settings.assetlinks)

    # Save OAuth (Handle Secrets)
    # 1. Fetch existing secrets to keep them if not changed
    current_oauth = get_setting(db, "oauth", schemas.OAuthConfig().dict())

    new_oauth = settings.oauth.dict()

    for provider in ['github', 'google', 'microsoft']:
        # If new secret is masked or empty, keep old secret?
        # User requirement: "Secrets should after input not be readable, only overwritable"
        # If user sends "******", we assume NO CHANGE.
        # If user sends "", we might assume CLEARING the secret? Or NO CHANGE?
        # Usually empty means "no change" in password fields or "clear".
        # Let's assume: "******" = No Change. Anything else = Update.

        submitted_secret = new_oauth.get(provider, {}).get('client_secret', '')
        if submitted_secret == "******":
            # Restore old secret
            new_oauth[provider]['client_secret'] = current_oauth.get(provider, {}).get('client_secret', '')

        # If user actually cleared it (empty string), it will be saved as empty string (disabling it).

    save_setting(db, "oauth", new_oauth)

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
    latest_stable = "Unknown"
    latest_beta = "Unknown"
    update_available = False
    beta_update_available = False

    current_ver_str = CURRENT_VERSION.lstrip('v')
    is_current_beta = "beta" in current_ver_str or "-" in current_ver_str

    try:
        # Fetch list of releases (not just latest stable)
        url = "https://api.github.com/repos/FaserF/Solumati/releases?per_page=10"
        req = urllib.request.Request(url, headers={'User-Agent': 'Solumati-Backend'})
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())

                # Helper to parse version roughly for comparison [Year, Month, Patch, Beta]
                def parse_ver(v_str):
                    v = v_str.lstrip('v')
                    parts = v.split('-')
                    base = [int(x) for x in parts[0].split('.')]
                    beta_num = 0
                    is_beta = False
                    if len(parts) > 1:
                        is_beta = True
                        if 'beta' in parts[1]:
                            beta_num = int(parts[1].split('.')[-1])

                    # Return tuple for comparison: (Year, Month, Patch, IsStable(0=beta, 1=stable), BetaNum)
                    # We want Stable > Beta for same base.
                    return (base[0], base[1], base[2], 0 if is_beta else 1, beta_num)

                current_tuple = parse_ver(current_ver_str)

                # Find latest
                found_stable = None
                found_beta = None

                for rel in data:
                    tag = rel.get('tag_name', 'v0.0.0')
                    t_ver = parse_ver(tag)

                    if rel.get('prerelease'):
                        if not found_beta or t_ver > found_beta[1]: # Compare tuples
                            found_beta = (tag, t_ver)
                    else:
                        if not found_stable or t_ver > found_stable[1]:
                            found_stable = (tag, t_ver)

                # Logic:
                # 1. Update Stable
                if found_stable:
                    latest_stable = found_stable[0]
                    # If found stable > current
                    if found_stable[1] > current_tuple:
                        update_available = True

                # 2. Update Beta
                if found_beta:
                    latest_beta = found_beta[0]
                    # If found beta > current
                    if found_beta[1] > current_tuple:
                        if is_current_beta:
                            # If we are on beta, we treat newer beta as main update
                            # UNLESS there is a stable that is even newer?
                            # Usually if a stable exists > current beta, we prefer stable.
                            if update_available:
                                # Stable is available and newer than current.
                                # Check if beta is even newer than that stable?
                                if found_beta[1] > found_stable[1]:
                                    beta_update_available = True
                                else:
                                    pass # Stable is the way to go
                            else:
                                update_available = True # Show beta as main update
                                latest_stable = latest_beta # Hack: Display beta as "Latest Version" in frontend
                        else:
                            # Current is Stable.
                            # Beta is available.
                            if found_beta[1] > found_stable[1] if found_stable else True:
                                beta_update_available = True

    except Exception as e:
        logger.warning(f"Diagnostics: Could not fetch releases: {e}")

    return {
        "current_version": CURRENT_VERSION,
        "latest_version": latest_stable, # Should contain the recommended update
        "latest_beta_version": latest_beta, # Extra field (need to add to schema?)
        "update_available": update_available,
        "beta_update_available": beta_update_available, # Extra field
        "internet_connected": True,
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

@router.get("/reports", response_model=List[schemas.ReportDisplay])
def get_reports(db: Session = Depends(get_db), current_mod: models.User = Depends(require_moderator_or_admin)):
    reports = db.query(models.Report).all()
    res = []
    for r in reports:
        res.append(schemas.ReportDisplay(
            id=r.id,
            reporter_username=r.reporter.username if r.reporter else "Unknown",
            reported_username=r.reported.username if r.reported else "Unknown",
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