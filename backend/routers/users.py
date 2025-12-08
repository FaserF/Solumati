from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from datetime import datetime
import shutil
import secrets
import json
from typing import List

# Local modules
from database import get_db
import models, schemas
from security import hash_password
from utils import get_setting, create_html_email, send_mail_sync, generate_unique_username, calculate_compatibility
from dependencies import get_current_user_from_header

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    logger.info(f"Attempting to register new user: {user.email}")
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not reg_config.enabled: raise HTTPException(403, "Registration disabled.")

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
        intent=user.intent, answers=json.dumps(user.answers),
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
        html = create_html_email("Verify your Account", "Welcome to Solumati!", link, "Verify Email", server_url)
        background_tasks.add_task(send_mail_sync, user.email, "Verify your Solumati Account", html, db)

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

    res = []
    query = db.query(models.User).filter(
        models.User.id != exc_id, models.User.is_active == True, models.User.id != 0,
        models.User.is_visible_in_matches == True, models.User.role != 'admin'
    )
    for other in query.all():
        compatibility = calculate_compatibility(curr_answ, other.answers, curr_int, other.intent)
        s = compatibility["score"]
        if s > 0:
            res.append(schemas.MatchResult(
                user_id=other.id,
                username=other.username,
                about_me=other.about_me,
                image_url=other.image_url,
                score=s,
                match_details=compatibility["details"]
            ))
    res.sort(key=lambda x: x.score, reverse=True)
    return res

from questions_content import QUESTIONS
@router.get("/questions")
def get_questions():
    return QUESTIONS

@router.get("/users/discover", response_model=List[schemas.UserDisplay])
def discover_users(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """
    Returns a list of random users for the 'Swipe' / Discover feature.
    Excludes the current user and users already swiped (not implemented yet, just random for now).
    """
    # Simple implementation: Random 10 users that are not me
    import random
    candidates = db.query(models.User).filter(
        models.User.id != user.id,
        models.User.is_active == True,
        models.User.is_visible_in_matches == True,
        models.User.role != 'admin'  # Hide admins from discover?
    ).limit(50).all() # Fetch a pool

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
def update_account_settings(user_id: int, update: schemas.UserAdminUpdate, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Self-service account update for normal users (Email/Password)."""
    if user.id != user_id:
        raise HTTPException(403, "Forbidden")

    # RESTRICTION FOR TEST USERS
    if user.role == 'test':
        raise HTTPException(403, "Test users cannot change sensitive account settings (Email/Password).")

    if update.email and update.email != user.email:
        if db.query(models.User).filter(models.User.email == update.email).first():
            raise HTTPException(400, "Email already in use")
        user.email = update.email
        user.is_verified = False # Require re-verification
        # Logic to send verification mail again could go here

    if update.password:
        user.hashed_password = hash_password(update.password)

    db.commit()
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

# --- Password Reset Flow ---
@router.post("/auth/password-reset/request")
def request_password_reset(body: dict, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = body.get("email")
    user = db.query(models.User).filter(models.User.email == email).first()

    if user:
        # RESTRICTION FOR TEST USERS
        if user.role == 'test':
            logger.warning(f"Password reset blocked for test user: {email}")
            # We return success to prevent enumeration, but do NOT send email
            return {"status": "ok", "message": "If the email exists, a reset link has been sent."}

        logger.info(f"Password reset requested for: {email}")
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.utcnow() + timedelta(hours=1)
        db.commit()

        reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
        server_url = reg_config.server_domain.rstrip('/')
        link = f"{server_url}?reset_token={token}"

        html = create_html_email("Reset Password", "Click the button below to reset your password.", link, "Reset Password", server_url)
        background_tasks.add_task(send_mail_sync, email, "Solumati Password Reset", html, db)
    else:
        logger.info(f"Password reset requested for unknown email: {email}")

    # Always return success to prevent enumeration
    return {"status": "ok", "message": "If the email exists, a reset link has been sent."}

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

    user.hashed_password = hash_password(new_password)
    user.reset_token = None
    user.reset_token_expires = None
    db.commit()
    return {"status": "success"}