from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime
import shutil
import secrets
import json
from typing import List

# Local modules
from app.core.database import get_db
from app.db import models, schemas
from app.core.security import hash_password
from app.core.config import PROJECT_NAME
from app.services.utils import get_setting, create_html_email, send_mail_sync, generate_unique_username, calculate_compatibility, send_registration_notification, send_password_changed_notification, send_email_changed_notification
from app.services.captcha import verify_captcha_sync
from app.api.dependencies import get_current_user_from_header

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

from app.services.password_validation import validate_password_complexity, check_pwned_password
from app.services.export_service import collect_user_data, create_export_archive

@router.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, request: Request, db: Session = Depends(get_db)):
    logger.info(f"Attempting to register new user: {user.email}")
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", schemas.RegistrationConfig()))
    if not reg_config.enabled: raise HTTPException(403, "Registration disabled.")

    # CAPTCHA verification
    captcha_config = schemas.CaptchaConfig(**get_setting(db, "captcha", {}))
    if captcha_config.enabled:
        if not user.captcha_token:
            raise HTTPException(428, {"message": "CAPTCHA required", "captcha_required": True})
        client_ip = request.client.host if request.client else "unknown"
        if not verify_captcha_sync(user.captcha_token, captcha_config.provider, captcha_config.secret_key, client_ip):
            raise HTTPException(400, "CAPTCHA verification failed")

    # Password Strength & Leak Check
    try:
        validate_password_complexity(user.password)
        check_pwned_password(user.password)
    except ValueError as e:
        raise HTTPException(400, str(e))

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Email already registered.")

    hashed_pw = hash_password(user.password)
    secure_code = secrets.token_urlsafe(32)
    is_verified = not reg_config.require_verification
    verification_code = secure_code if reg_config.require_verification else None

    # ID is handled by sequence (starts at 10000)
    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pw,
        real_name=user.real_name, username=generate_unique_username(db, user.real_name),
        intent=user.intent, answers=json.dumps(user.answers if isinstance(user.answers, dict) else {}), # Store empty if list/none for now
        is_active=True, is_verified=is_verified, verification_code=verification_code,
        role="user", created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    logger.info(f"User created: ID {new_user.id}, Username {new_user.username}")

    if reg_config.require_verification and not new_user.is_verified:
        server_url = reg_config.server_domain.rstrip('/')
        link = f"{server_url}/verify?id={new_user.id}&code={secure_code}"

        # Default to EN for new registration (or system default)
        # Improvement: We could allow passing language in UserCreate
        t = get_translations("en")

        subject = f"[{PROJECT_NAME}] {t.get('email.verify.subject', 'Verify your Solumati Account')}"
        title = t.get('email.verify.title', 'Verify your Account')
        content = t.get('email.verify.content', 'Welcome to Solumati! Please verify your email address.')
        btn_text = t.get('email.verify.btn', 'Verify Email')

        html = create_html_email(title, content, link, btn_text, server_url, db)
        background_tasks.add_task(send_mail_sync, user.email, subject, html, db)

    # Send registration notification to admin (if enabled)
    background_tasks.add_task(send_registration_notification, new_user)

    return new_user

@router.post("/verify")
def verify_email(id: int, code: str, db: Session = Depends(get_db)):
    logger.info(f"Verification attempt for User ID {id}")
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.is_verified: return {"message": "User already verified", "status": "already_verified"}
    if not code or not user.verification_code or not secrets.compare_digest(code, user.verification_code):
        raise HTTPException(400, "Invalid code")
    user.is_verified = True
    user.verification_code = None
    db.commit()
    logger.info(f"User {user.username} (ID {id}) successfully verified.")
    return {"message": "Success", "status": "verified"}

# --- NEW: Get Own Profile Endpoint ---
@router.get("/users/{user_id}", response_model=schemas.UserDisplay)
def get_user_profile(user_id: int, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Fetch own user profile details (including email and settings)."""
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")
    return user

@router.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
def get_matches(user_id: int, db: Session = Depends(get_db)):
    if user_id == 0:
        guest = db.query(models.User).filter(models.User.id == 0).first()
        if not guest or not guest.is_active: raise HTTPException(403, "Guest mode disabled")
        curr_answ, curr_int, exc_id = [3,3,3,3], "longterm", 0
    else:
        u = db.query(models.User).filter(models.User.id == user_id).first()
        if not u: raise HTTPException(404, "User not found")
        curr_answ, curr_int, exc_id = u.answers, u.intent, user_id

    # PROFILE COMPLETION CHECK (Gating)
    # Guest (0) is exempt.
    # Normal users must complete profile first.
    if user_id != 0:
        from app.services.utils import is_profile_complete
        # We need the user object, which we fetched as 'u'
        # Admins/Mods are exempt from profile completion check
        if u.role not in ['admin', 'moderator']:
            if not is_profile_complete(u):
                 # User requested specific message: "Vor 'Deine Matches'... stehen dass man erst das Profil vervollständigen muss."
                 raise HTTPException(403, "Profile Incomplete. Please finish setting up your account.")

    # Prepare Query
    query = db.query(models.User).filter(
        models.User.id != exc_id,
        models.User.is_active == True,
        models.User.id != 0,
        models.User.role != 'admin'
    )

    # Filtering logic:
    # Normal users: Must be visible.
    # Guest (id=0) OR Admin: Can see visible users OR users with role 'test' (even if hidden).
    is_admin = False
    if user_id != 0 and u.role == 'admin':
        is_admin = True

    if user_id == 0 or is_admin:
        query = query.filter(
            or_(
                models.User.is_visible_in_matches == True,
                models.User.role == 'test'
            )
        )
    else:
        # Normal users: Visible users only, AND NOT test users (double check)
        query = query.filter(
            models.User.is_visible_in_matches == True,
            models.User.role != 'test'
        )

    import random

    # Guest promotional ads
    ADS = [
        "🔒 Unlock to see full profile! The Solumati community is waiting.",
        "✨ This user seems interesting! Sign up to see more.",
        "❤️ Real connections happen here. Join us to chat!",
        "🚀 Upgrade for the full experience. It's free!",
    ]

    res = []
    is_guest_mode = (user_id == 0)

    for other in query.all():
        compatibility = calculate_compatibility(curr_answ, other.answers, curr_int, other.intent)
        s = compatibility["score"]

        # ESCAPE HATCH FOR GUEST + TEST USERS
        # If I am guest (user_id=0) or Admin and target is 'test', force match
        if (is_guest_mode or is_admin) and other.role == 'test':
            if s <= 0: s = 95 # Force high score
            compatibility["details"].append("Debug Mode: Dummy Match")

        # GUEST RESTRICTION LOGIC
        final_username = other.username
        final_about = other.about_me
        final_image = other.image_url
        match_details = compatibility["details"]

        if is_guest_mode and other.role != 'test':
             # Obfuscate Real Users
             final_username = f"{other.username[0]}..."
             final_about = random.choice(ADS)
             # Mark as restricted for frontend blurring (via match_details flag)
             match_details = ["RESTRICTED_VIEW"]

             # We want to force show them even if score is bad?
             # Probably yes, to show "activity".
             if s <= 0: s = float(random.randint(40, 85))

        if s > 0:
            res.append(schemas.MatchResult(
                user_id=other.id,
                username=final_username,
                about_me=final_about,
                image_url=final_image,
                score=s,
                match_details=match_details
            ))

    res.sort(key=lambda x: x.score, reverse=True)
    return res

@router.get("/users/{user_id}/public", response_model=schemas.UserPublicDisplay)
def get_user_public_profile(user_id: int, current_user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Fetch public profile of another user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    if not user.is_active or not user.is_visible_in_matches:
        # We might want to allow viewing reported users even if hidden? For now, standard visibility rules.
        # Check if caller is admin/mod?
        if current_user.role not in ['admin', 'moderator']:
             # Special Exception: Guest User viewing Test User
             if current_user.id == 0 and user.role == 'test':
                 pass # Allow
             else:
                 raise HTTPException(404, "User not available")

    # Parse answers if they are stored as JSON string but schema expects list/obj
    if isinstance(user.answers, str):
        try:
            user.answers = json.loads(user.answers)
        except:
            pass

    return user

@router.post("/users/{user_id}/report", response_model=dict)
def report_user(user_id: int, report: schemas.ReportCreate, reporter: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Report another user."""
    # Check if user exists
    reported_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not reported_user:
        raise HTTPException(404, "User not found")

    if reporter.id == user_id:
        raise HTTPException(400, "You cannot report yourself")

    new_report = models.Report(
        reporter_id=reporter.id,
        reported_id=user_id,
        reason=report.reason,
        status="open",
        created_at=datetime.utcnow()
    )
    db.add(new_report)
    db.commit()

    logger.info(f"User {reporter.id} reported User {user_id}. Reason: {report.reason}")
    return {"status": "submitted"}

from app.services.questions_content import QUESTIONS_SKELETON
from app.services.i18n import get_translations

@router.get("/questions")
def get_questions(lang: str = "en"):
    # Load translations for the requested language
    t = get_translations(lang)
    questions_data = t.get("questions", {})

    # Hydrate the skeleton
    final_questions = []
    for q_skel in QUESTIONS_SKELETON:
        qid_str = str(q_skel["id"])
        if qid_str in questions_data:
            q_trans = questions_data[qid_str]
            # Merge
            final_questions.append({
                **q_skel,
                "text": q_trans.get("text", "MISSING TEXT"),
                "options": q_trans.get("options", [])
            })
        else:
             # Fallback if translation missing (should not happen if EN is complete)
            final_questions.append({
                **q_skel,
                 "text": f"Question {qid_str}",
                 "options": ["Yes", "No"] # Emergency fallback
            })

    return final_questions

@router.get("/users/discover", response_model=List[schemas.UserDisplay])
def discover_users(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """
    Returns a list of random users for the 'Swipe' / Discover feature.
    Excludes the current user and users already swiped (not implemented yet, just random for now).
    """
    import random

    # Check if caller is Guest, Admin, or Moderator
    is_privileged = user.id == 0 or user.role in ('admin', 'moderator')

    # Base filters (always applied)
    base_filters = [
        models.User.id != user.id,
        models.User.is_active == True,
        models.User.role != 'admin',  # Never show admins
        models.User.id != 0  # Never show guest user
    ]

    if is_privileged:
        # Guest/Admin/Mod: Can see visible users OR test users (even if hidden)
        visibility_filter = or_(
            models.User.is_visible_in_matches == True,
            models.User.role == 'test'
        )
    else:
        # Normal users: Only see visible users, exclude test users
        base_filters.append(models.User.role != 'test')
        visibility_filter = models.User.is_visible_in_matches == True

    candidates = db.query(models.User).filter(
        *base_filters,
        visibility_filter
    ).limit(50).all()

    if not candidates:
        return []

    # Shuffle and pick 10
    random.shuffle(candidates)
    return candidates[:10]


@router.put("/users/{user_id}/profile", response_model=schemas.UserDisplay)
def update_profile(user_id: int, update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")

    if update.about_me is not None:
        user.about_me = update.about_me
    if update.intent is not None:
        user.intent = update.intent
    if update.answers is not None:
        user.answers = json.dumps(update.answers)

    db.commit()
    db.refresh(user)
    return user

@router.post("/users/{user_id}/image")
def upload_image(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")
    path = f"static/images/{user_id}_{file.filename}"
    with open(path, "wb+") as f: shutil.copyfileobj(file.file, f)
    user.image_url = f"/{path}"
    db.commit()
    return {"image_url": user.image_url}

@router.put("/users/{user_id}/account")
def update_account_settings(user_id: int, update: schemas.UserAdminUpdate, background_tasks: BackgroundTasks, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Self-service account update for normal users (Email/Password)."""
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")

    # RESTRICTION FOR TEST USERS
    if user.role == 'test':
        raise HTTPException(403, "Test users cannot change sensitive account settings (Email/Password).")

    old_email = user.email
    email_changed = False
    password_changed = False

    if update.email and update.email != user.email:
        if db.query(models.User).filter(models.User.email == update.email).first():
            raise HTTPException(400, "Email already in use")
        user.email = update.email
        user.is_verified = False # Require re-verification
        email_changed = True

    if update.password:
        try:
            validate_password_complexity(update.password)
            check_pwned_password(update.password)
        except ValueError as e:
            raise HTTPException(400, str(e))

        user.hashed_password = hash_password(update.password)
        password_changed = True

    if update.is_visible_in_matches is not None:
        user.is_visible_in_matches = update.is_visible_in_matches

    db.commit()

    # Send notification emails (background tasks)
    if email_changed:
        background_tasks.add_task(send_email_changed_notification, old_email, user.email)

    if password_changed:
        background_tasks.add_task(send_password_changed_notification, user)

    return {"status": "updated", "reverify_needed": not user.is_verified}

@router.put("/users/{user_id}/preferences")
def update_user_preferences(user_id: int, settings: schemas.UserSettingsUpdate, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Updates app-specific settings like push notifications and theme."""
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")

    current_settings = {}
    try:
        current_settings = json.loads(user.app_settings) if user.app_settings else {}
    except:
        current_settings = {}

    # Update Generic JSON Settings
    if settings.notifications_enabled is not None:
        current_settings["notifications_enabled"] = settings.notifications_enabled

    if settings.theme is not None:
        current_settings["theme"] = settings.theme

    # Handle email_notifications settings
    if settings.email_notifications is not None:
        # Merge with existing email_notifications (don't overwrite completely)
        existing_email_prefs = current_settings.get("email_notifications", {})
        for key, value in settings.email_notifications.items():
            if value is not None:
                existing_email_prefs[key] = value
        current_settings["email_notifications"] = existing_email_prefs

    # Store Push Subscription separately (could be large)
    if settings.push_subscription is not None:
        # If subscription is sent, we store it. If empty dict/null, we might clear it.
        user.push_subscription = json.dumps(settings.push_subscription)

    user.app_settings = json.dumps(current_settings)
    db.commit()

    logger.info(f"User {user.username} updated preferences.")
    return {"status": "success", "settings": current_settings}

@router.delete("/users/{user_id}")
def delete_own_account(user_id: int, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

@router.post("/users/{user_id}/export")
async def export_user_data(user_id: int, method: str = "download", background_tasks: BackgroundTasks = None, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """
    GDPR Data Export. Method can be 'download' or 'email'.
    """
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")

    # Check Mail config if email requested
    if method == "email":
        mail_conf = get_setting(db, "mail", {})
        if not mail_conf.get("enabled"):
             raise HTTPException(400, "Email service is not enabled. Please use download.")

    # 1. Collect Data
    data = collect_user_data(db, user_id)
    if not data:
         raise HTTPException(404, "User data extraction failed.")

    # 2. Create Archive
    zip_buffer = create_export_archive(data)
    zip_size = zip_buffer.getbuffer().nbytes

    if method == "download":
        zip_buffer.seek(0)
        headers = {
            'Content-Disposition': f'attachment; filename="solumati_export_{user.username}.zip"'
        }
        return StreamingResponse(
            iter([zip_buffer.read()]),
            media_type="application/zip",
            headers=headers
        )

    elif method == "email":
        # Check size limit (12MB)
        if zip_size > 12 * 1024 * 1024:
            raise HTTPException(413, "Export too large for email (Max 12MB). Please use download.")

        # Get User Language
        user_lang = "en"
        try:
            settings = json.loads(user.app_settings) if user.app_settings else {}
            user_lang = settings.get("language", "en")
        except:
            pass

        t = get_translations(user_lang)

        # Prepare content
        subject = f"[{PROJECT_NAME}] {t.get('email.export.subject', 'Your Data Export')}"
        body_text = t.get('email.export.body', 'Here is the data export you requested.')

        # Create HTML Body using template
        html_body = create_html_email(
            title=subject,
            content=body_text,
            server_domain=get_setting(db, "registration", {}).get("server_domain", ""),
            db=db
        )

        # Function to send mail with attachment
        def send_export_mail(target_email, zip_data, filename, subject, html_content):
            import smtplib
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            from email.mime.application import MIMEApplication

            # Re-fetch mail config inside task to be safe
            from app.core.database import SessionLocal
            db_task = SessionLocal()
            try:
                mail_conf = get_setting(db_task, "mail", {})
                if not mail_conf.get("enabled"):
                     logger.warning("Mail disabled during export task.")
                     return

                msg = MIMEMultipart('alternative') # Changed to alternative for HTML/Text
                msg['Subject'] = subject
                msg['From'] = f"{mail_conf.get('sender_name', 'Solumati')} <{mail_conf.get('from_email')}>"
                msg['To'] = target_email

                # Attach HTML Body
                msg.attach(MIMEText(html_content, 'html'))

                # Attach file
                part = MIMEApplication(zip_data, Name=filename)
                part['Content-Disposition'] = f'attachment; filename="{filename}"'
                msg.attach(part)

                with smtplib.SMTP(mail_conf['smtp_host'], mail_conf['smtp_port']) as server:
                    if mail_conf.get('smtp_tls'): server.starttls()
                    if mail_conf.get('smtp_user') and mail_conf.get('smtp_password'):
                        server.login(mail_conf['smtp_user'], mail_conf['smtp_password'])
                    server.send_message(msg)

                logger.info(f"Export email sent to {target_email}")
            except Exception as e:
                logger.error(f"Failed to send export email: {e}")
            finally:
                db_task.close()

        background_tasks.add_task(send_export_mail, user.email, zip_buffer.getvalue(), f"solumati_export_{user.username}.zip", subject, html_body)
        return {"status": "queued", "message": "Email will be sent shortly."}

    else:
        raise HTTPException(400, "Invalid method")

# --- Password Reset Flow ---
from datetime import timedelta
from app.services.i18n import translate, get_translations

@router.post("/auth/password-reset/request")
def request_password_reset(body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    identifier = body.get("email") # Can be email or username now
    if not identifier:
        # If user/email not provided from frontend
        return {"status": "ok", "message": "If the account exists, a reset link has been sent."}

    # Try matching email first, then username
    user = db.query(models.User).filter(models.User.email == identifier).first()
    if not user:
        user = db.query(models.User).filter(models.User.username == identifier).first()

    if user:
        # RESTRICTION FOR TEST USERS
        if user.role == 'test':
            logger.warning(f"Password reset blocked for test user: {identifier}")
            return {"status": "ok", "message": "If the account exists, a reset link has been sent."}

        # RESTRICTION FOR ADMIN USERS
        if user.role == 'admin':
             logger.warning(f"Password reset via mail blocked for admin: {identifier} (Use CLI tool)")
             return {"status": "ok", "message": "If the account exists, a reset link has been sent."}

        # Ensure email exists (if found by username but no email?) - Should verify
        if not user.email:
             logger.warning(f"Password reset blocked (no email) for user: {user.username}")
             return {"status": "ok", "message": "If the account exists, a reset link has been sent."}

        logger.info(f"Password reset requested for: {user.email}")
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
        server_url = reg_config.server_domain.rstrip('/')
        link = f"{server_url}?reset_token={token}"

        # Get User Language
        user_lang = "en"
        try:
            settings = json.loads(user.app_settings) if user.app_settings else {}
            user_lang = settings.get("language", "en")
        except:
            pass

        # Use i18n for email content
        # Note: translate() usually takes strict context, but our i18n.py implementation
        # might default to request context or system default.
        # We need a way to force language in translate() or get specific dictionary.
        # i18n.py has get_translations(lang).

        t = get_translations(user_lang)

        subject = f"[{PROJECT_NAME}] {t.get('email.reset.subject', 'Password Reset')}"
        title = t.get('email.reset.title', 'Reset Password')
        content = t.get('email.reset.content', 'Click the button below to reset your password.')
        btn_text = t.get('email.reset.btn', 'Reset Password')

        html = create_html_email(title, content, link, btn_text, server_url)
        background_tasks.add_task(send_mail_sync, user.email, subject, html, db)
    else:
        logger.info(f"Password reset requested for unknown identifier: {identifier}")

    # Always return success to prevent enumeration
    return {"status": "ok", "message": "If the account exists, a reset link has been sent."}

@router.post("/auth/password-reset/confirm")
def confirm_password_reset(body: dict, db: Session = Depends(get_db)):
    token = body.get("token")
    new_password = body.get("new_password")

    user = db.query(models.User).filter(models.User.reset_token == token).first()
    if not user or not user.reset_token_expires or user.reset_token_expires < datetime.utcnow():
        raise HTTPException(400, "Invalid or expired token")

    # Extra check just in case
    if user.role == 'test':
        raise HTTPException(403, "Test users cannot change password.")

    try:
        validate_password_complexity(new_password)
        check_pwned_password(new_password)
    except ValueError as e:
        raise HTTPException(400, str(e))

    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"status": "success"}
