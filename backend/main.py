from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import or_, text
from typing import List, Optional
import logging
import os
import random
import shutil
import json
import smtplib
import secrets
import socket
import urllib.request
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# Import local modules
from database import engine, Base, get_db
import models, schemas
import i18n
from logging_config import logger

# --- LOGGING CONFIGURATION ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

TEST_MODE = os.getenv("TEST_MODE", "false").lower() in ("true", "1", "yes")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

# --- VERSION SYNC ---
def get_app_version():
    """Tries to read version from mounted frontend package.json, falls back to default."""
    try:
        pkg_path = "/app/frontend_package.json"
        if os.path.exists(pkg_path):
            with open(pkg_path, 'r') as f:
                data = json.load(f)
                version = data.get('version')
                if version:
                    logger.info(f"Version synced from package.json: {version}")
                    return version
    except Exception as e:
        logger.warning(f"Could not read version from package.json: {e}")
    return "0.5.3" # Fallback

CURRENT_VERSION = get_app_version()

# Initialize DB Tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(title="Solumati API", version=CURRENT_VERSION)

# --- CORS SETTINGS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Static files for images
os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Startup: DB Migration Check ---
@app.on_event("startup")
def startup_check_schema():
    """Checks if new columns exist in DB and adds them if missing (Auto-Migration)."""
    db = next(get_db())
    try:
        # Check for 'is_visible_in_matches'
        try:
            db.execute(text("SELECT is_visible_in_matches FROM users LIMIT 1"))
        except Exception:
            db.rollback()
            logger.warning("Column 'is_visible_in_matches' missing in 'users'. Attempting to add it.")
            db.execute(text("ALTER TABLE users ADD COLUMN is_visible_in_matches BOOLEAN DEFAULT TRUE"))
            db.commit()
            logger.info("Migration successful: Added 'is_visible_in_matches'.")
    except Exception as e:
        logger.error(f"Schema check failed: {e}")
    finally:
        db.close()

# --- Dependency: Auth & Role Check ---
def get_current_user_from_header(x_user_id: Optional[int] = Header(None), db: Session = Depends(get_db)):
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Missing authentication header")
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return user

def require_admin(user: models.User = Depends(get_current_user_from_header)):
    if user.role != 'admin':
        logger.warning(f"Unauthorized admin access attempt by user {user.username} (Role: {user.role})")
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

def require_moderator_or_admin(user: models.User = Depends(get_current_user_from_header)):
    if user.role not in ['admin', 'moderator']:
        logger.warning(f"Unauthorized moderator access attempt by user {user.username} (Role: {user.role})")
        raise HTTPException(status_code=403, detail="Moderator or Admin privileges required")
    return user

# --- Settings Helpers ---
def get_setting(db: Session, key: str, default):
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if setting:
            return json.loads(setting.value)
        if hasattr(default, 'dict'):
            return default.dict()
        return default
    except Exception as e:
        logger.error(f"DB Error in get_setting: {e}")
        return default

def save_setting(db: Session, key: str, value: dict):
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if not setting:
            setting = models.SystemSetting(key=key, value=json.dumps(value))
            db.add(setting)
        else:
            setting.value = json.dumps(value)
        db.commit()
    except Exception as e:
        logger.error(f"DB Error in save_setting: {e}")
        db.rollback()

# --- Mail Helper ---
def send_mail_sync(to_email: str, subject: str, body: str, db: Session):
    try:
        config_dict = get_setting(db, "mail", schemas.MailConfig())
        config = schemas.MailConfig(**config_dict)
        if not config.enabled:
            logger.info(f"Mail sending disabled. To: {to_email}")
            return

        msg = MIMEMultipart()
        msg['From'] = formataddr((config.sender_name, config.from_email))
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'html'))

        if config.smtp_ssl:
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port)
        else:
            server = smtplib.SMTP(config.smtp_host, config.smtp_port)
            if config.smtp_tls:
                server.starttls()
        if config.smtp_user and config.smtp_password:
            server.login(config.smtp_user, config.smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise e

# --- Core Logic Helpers ---
def generate_unique_username(db: Session, real_name: str) -> str:
    base = real_name.strip() if real_name else "User"
    count = db.query(models.User).filter(models.User.real_name == base).count()
    suffix = count + 1
    while True:
        candidate = f"{base}#{suffix}"
        if not db.query(models.User).filter(models.User.username == candidate).first():
            return candidate
        suffix += 1

def calculate_compatibility(answers_a, answers_b, intent_a, intent_b) -> float:
    if intent_a != intent_b: return 0.0
    if not answers_a or not answers_b: return 0.0
    diff_sum = sum(abs(a - b) for a, b in zip(answers_a, answers_b))
    max_diff = len(answers_a) * 4
    return round(max(0, 100 - ((diff_sum / max_diff) * 100)), 2)

# --- Startup Data ---
def ensure_guest_user(db: Session):
    try:
        guest = db.query(models.User).filter(models.User.id == 0).first()
        if not guest:
            logger.info("Creating Guest User (ID 0)...")
            # CHANGED: Role is now 'guest' instead of 'user'
            guest = models.User(
                id=0, email="guest@solumati.local", hashed_password="NOPASSWORD",
                real_name="Gast", username="Gast", about_me="System Guest",
                is_active=True, is_verified=True, is_guest=True, intent="casual",
                answers=[3,3,3,3], created_at=datetime.utcnow(), role='guest',
                is_visible_in_matches=False
            )
            db.add(guest)
            db.commit()
        elif guest.role != 'guest':
            # Fix existing guest role if necessary
            logger.info("Fixing guest user role to 'guest'...")
            guest.role = 'guest'
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create or update guest user: {e}")

def ensure_admin_user(db: Session):
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            logger.info("No 'admin' user found. Creating initial admin account...")
            initial_password = secrets.token_urlsafe(16)
            admin = models.User(
                email="admin@solumati.local",
                hashed_password=initial_password + "salt",
                real_name="Administrator",
                username="admin",
                about_me="System Administrator",
                is_active=True, is_verified=True, is_guest=False, role="admin",
                intent="admin", answers=[3,3,3,3], created_at=datetime.utcnow(),
                is_visible_in_matches=False # Default admin hidden
            )
            db.add(admin)
            db.commit()
            separator = "=" * 60
            logger.warning(f"\n{separator}\nINITIAL ADMIN USER CREATED\nUsername: admin\nEmail: admin@solumati.local\nPassword: {initial_password}\nPLEASE CHANGE THIS PASSWORD LATER\n{separator}\n")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to ensure admin user: {e}")

def populate_test_data(db: Session):
    try:
        if db.query(models.User).count() >= 20: return
        logger.info("Generating dummy users for TEST_MODE...")
        intents = ["longterm", "casual"]
        names = ["Anna", "Ben", "Clara", "David", "Emma", "Fabian"]
        for i, name in enumerate(names):
            email = f"dummy{i}_{name.lower()}@solumati.local"
            if db.query(models.User).filter(models.User.email == email).first(): continue
            u = models.User(
                email=email, hashed_password="pw" + "salt", real_name=name,
                username=generate_unique_username(db, name),
                intent=random.choice(intents), answers=[random.randint(1,5) for _ in range(4)],
                is_active=True, is_verified=True, created_at=datetime.utcnow(), role='user',
                is_visible_in_matches=True
            )
            db.add(u)
        db.commit()
        logger.info("Dummy users created.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create dummy users: {e}")

@app.on_event("startup")
def startup_event():
    logger.info("Starting up Solumati Backend...")
    try:
        db = next(get_db())
        ensure_guest_user(db)
        ensure_admin_user(db)
        if get_setting(db, "registration", None) is None:
            save_setting(db, "registration", schemas.RegistrationConfig().dict())
        if get_setting(db, "mail", None) is None:
            save_setting(db, "mail", schemas.MailConfig().dict())
        if TEST_MODE: populate_test_data(db)
    except Exception as e:
        logger.critical(f"Startup failed (Database might be unreachable): {e}")

# --- Public Endpoints ---

@app.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    return {
        "registration_enabled": reg_config.enabled,
        "test_mode": TEST_MODE
    }

@app.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    logger.info(f"Attempting to register new user: {user.email}")
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))

    if not reg_config.enabled:
        raise HTTPException(403, "Registration disabled.")

    domain = user.email.split('@')[-1].lower()

    # Whitelist logic
    if reg_config.allowed_domains:
        if domain not in [d.strip().lower() for d in reg_config.allowed_domains.split(',') if d.strip()]:
            raise HTTPException(403, f"Domain '{domain}' not allowed.")

    # Blacklist logic (NEW)
    if reg_config.blocked_domains:
        if domain in [d.strip().lower() for d in reg_config.blocked_domains.split(',') if d.strip()]:
            logger.warning(f"Registration blocked for domain {domain} (Blacklisted)")
            raise HTTPException(403, f"Registration is not allowed for domain '{domain}'.")

    if db.query(models.User).filter(models.User.email == user.email).first():
        logger.warning(f"Registration failed: Email {user.email} already exists.")
        raise HTTPException(400, "Email already registered.")

    new_user = models.User(
        email=user.email, hashed_password=user.password + "salt",
        real_name=user.real_name, username=generate_unique_username(db, user.real_name),
        intent=user.intent, answers=user.answers,
        is_active=True, is_verified=not reg_config.require_verification,
        role="user",
        is_visible_in_matches=True, # Default for normal users
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info(f"User created: ID {new_user.id}, Username {new_user.username}")

    if not new_user.is_verified:
        link = f"{APP_BASE_URL}/verify?id={new_user.id}&code=dummy"
        background_tasks.add_task(send_mail_sync, user.email, "Solumati Verify", f"Link: {link}", db)
    return new_user

@app.post("/login")
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for: {creds.login}")
    user = db.query(models.User).filter(
        or_(models.User.email == creds.login, models.User.username == creds.login)
    ).first()

    if not user or user.hashed_password != (creds.password + "salt"):
        raise HTTPException(401, "Invalid credentials")

    if not user.is_active:
        if user.banned_until and user.banned_until <= datetime.utcnow():
            user.is_active = True
            user.banned_until = None
            user.deactivation_reason = None
            user.ban_reason_text = None
            db.commit()
            logger.info(f"User {user.username} auto-reactivated after tempban.")
        else:
            reason = user.deactivation_reason or "Unknown"
            custom_text = user.ban_reason_text or ""
            msg = "Account deactivated."

            # --- Enhanced Ban Message Logic ---
            if reason.startswith("TempBan") and user.banned_until:
                now = datetime.utcnow()
                diff = user.banned_until - now
                total_seconds = int(diff.total_seconds())

                if total_seconds > 0:
                    hours = total_seconds // 3600
                    minutes = (total_seconds % 3600) // 60
                    # Format: YYYY-MM-DD HH:MM
                    unban_time_str = user.banned_until.strftime("%Y-%m-%d %H:%M UTC")

                    msg = (f"Account temporarily suspended. "
                           f"You are banned until: {unban_time_str}. "
                           f"Remaining time: {hours}h {minutes}m.")
            # ----------------------------------

            elif reason == "Reported":
                msg = "Account deactivated due to policy violations."

            if custom_text:
                msg += f" Reason: {custom_text}"

            raise HTTPException(403, detail=msg)

    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not user.is_verified and reg_config.require_verification:
        raise HTTPException(403, "Please verify your email address.")

    user.last_login = datetime.utcnow()
    db.commit()
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "is_guest": user.is_guest,
        "is_admin": user.role == 'admin'
    }

@app.post("/verify")
def verify_email(id: int, code: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user: raise HTTPException(404, "User not found")
    user.is_verified = True
    db.commit()
    return {"message": "Success"}

@app.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
def get_matches(user_id: int, db: Session = Depends(get_db)):
    if user_id == 0:
        guest_user = db.query(models.User).filter(models.User.id == 0).first()
        if not guest_user or not guest_user.is_active: raise HTTPException(403, "Guest mode disabled")
        curr_answ, curr_int, exc_id = [3,3,3,3], "longterm", 0
    else:
        u = db.query(models.User).filter(models.User.id == user_id).first()
        if not u: raise HTTPException(404, "User not found")
        curr_answ, curr_int, exc_id = u.answers, u.intent, user_id

    res = []
    # UPDATED QUERY: Filter out users who are not visible in matches (e.g. Admin-only accounts)
    query = db.query(models.User).filter(
        models.User.id != exc_id,
        models.User.is_active == True,
        models.User.id != 0,
        models.User.is_visible_in_matches == True,
        models.User.role != 'admin' # Ensure admins don't show up in matches generally unless specifically opted in? Actually is_visible_in_matches handles this.
    )

    for other in query.all():
        s = calculate_compatibility(curr_answ, other.answers, curr_int, other.intent)
        if s > 0: res.append(schemas.MatchResult(user_id=other.id, username=other.username, about_me=other.about_me, image_url=other.image_url, score=s))
    res.sort(key=lambda x: x.score, reverse=True)
    return res

@app.put("/users/{user_id}/profile", response_model=schemas.UserDisplay)
def update_profile(user_id: int, update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")
    user.about_me = update.about_me
    db.commit()
    db.refresh(user)
    return user

@app.post("/users/{user_id}/image")
def upload_image(user_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")
    path = f"static/images/{user_id}_{file.filename}"
    with open(path, "wb+") as f: shutil.copyfileobj(file.file, f)
    user.image_url = f"/{path}"
    db.commit()
    return {"image_url": user.image_url}

@app.post("/report")
def report_user(report: schemas.ReportCreate, db: Session = Depends(get_db)):
    new_report = models.Report(
        reporter_id=1,
        reported_user_id=report.reported_user_id,
        reported_message_id=report.reported_message_id,
        reason=report.reason
    )
    db.add(new_report)
    db.commit()
    return {"message": "Report submitted"}

# --- Admin Section ---

@app.get("/admin/users", response_model=List[schemas.UserDisplay])
def admin_get_users(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    try:
        users = db.query(models.User).order_by(models.User.id).all()
        return users
    except Exception as e:
        logger.error(f"DB Error fetching users: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred.")

@app.put("/admin/users/{user_id}")
def admin_update_user(user_id: int, update: schemas.UserAdminUpdate, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    if update.username is not None and update.username != user.username:
        if db.query(models.User).filter(models.User.username == update.username).first():
            raise HTTPException(400, "Username already exists")
        user.username = update.username

    if update.email is not None and update.email != user.email:
        if db.query(models.User).filter(models.User.email == update.email).first():
            raise HTTPException(400, "Email already exists")
        user.email = update.email
        user.is_verified = False

    if update.password is not None and update.password.strip() != "":
        user.hashed_password = update.password + "salt"

    if update.is_verified is not None:
        user.is_verified = update.is_verified

    # Allow admin to set match visibility
    if update.is_visible_in_matches is not None:
        user.is_visible_in_matches = update.is_visible_in_matches
        logger.info(f"Admin {current_admin.username} changed match visibility for {user.username} to {update.is_visible_in_matches}")

    db.commit()
    return {"status": "success", "user": {"id": user.id}}

@app.put("/admin/users/{user_id}/punish")
def admin_punish_user(user_id: int, action: schemas.AdminPunishAction, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    # Protection for Root Admin (assuming username is 'admin')
    if user.username == 'admin' and action.action in ['delete', 'deactivate', 'demote_user', 'demote_guest']:
        logger.warning(f"Admin {current_admin.username} tried to punish root admin.")
        raise HTTPException(400, "Cannot perform this action on the root admin.")

    # Protection for System Guest (ID 0)
    if user.id == 0:
        if action.action == 'delete':
            raise HTTPException(400, "Cannot delete system guest. Deactivate instead.")
        if action.action == 'promote_moderator':
            raise HTTPException(400, "Cannot promote guest user.")

    # Guest user role logic checks
    if user.role == 'guest' and action.action == 'promote_moderator':
         raise HTTPException(400, "Cannot promote guest user.")


    if action.action == "delete":
        db.delete(user)
    elif action.action == "reactivate":
        user.is_active = True
        user.deactivation_reason = None
        user.banned_until = None
    elif action.action == "deactivate":
        user.is_active = False
        user.deactivation_reason = action.reason_type
        user.ban_reason_text = action.custom_reason
        user.deactivated_at = datetime.utcnow()
        if action.reason_type and action.reason_type.startswith("TempBan") and action.duration_hours:
            user.banned_until = datetime.utcnow() + timedelta(hours=action.duration_hours)
            user.deactivation_reason = f"TempBan{action.duration_hours}"
    elif action.action == "promote_moderator":
        user.role = "moderator"
        user.is_guest = False
    elif action.action == "demote_user":
        user.role = "user"
        user.is_guest = False
    elif action.action == "demote_guest":
        user.role = "guest"
        user.is_guest = True
    elif action.action == "verify":
        user.is_verified = True

    db.commit()
    logger.info(f"Admin {current_admin.username} executed action {action.action} on user {user.id}")
    return {"status": "success"}

@app.get("/admin/reports", response_model=List[schemas.ReportDisplay])
def admin_get_reports(db: Session = Depends(get_db), current_user: models.User = Depends(require_moderator_or_admin)):
    reports = db.query(models.Report).filter(models.Report.resolved == False).all()
    results = []
    for r in reports:
        reporter = db.query(models.User).filter(models.User.id == r.reporter_id).first()
        reported = db.query(models.User).filter(models.User.id == r.reported_user_id).first()
        results.append({
            "id": r.id,
            "reporter_id": r.reporter_id,
            "reported_user_id": r.reported_user_id,
            "reported_message_id": r.reported_message_id,
            "reason": r.reason,
            "timestamp": r.timestamp,
            "reporter_name": reporter.username if reporter else "Unknown",
            "reported_name": reported.username if reported else "Unknown"
        })
    return results

@app.delete("/admin/reports/{report_id}")
def admin_resolve_report(report_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(require_moderator_or_admin)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report:
        db.delete(report)
        db.commit()
    return {"status": "resolved"}

@app.get("/admin/settings", response_model=schemas.SystemSettings)
def get_admin_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    mail = get_setting(db, "mail", schemas.MailConfig())
    reg = get_setting(db, "registration", schemas.RegistrationConfig())
    return {"mail": mail, "registration": reg}

@app.put("/admin/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    logger.info(f"Admin {current_admin.username} updated system settings.")
    return {"status": "updated"}

@app.post("/admin/settings/test-mail")
def send_test_mail(req: schemas.TestMailRequest, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    try:
        send_mail_sync(req.target_email, "Solumati Test Mail", "<h1>It Works!</h1>", db)
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"SMTP Test Failed: {e}")
        raise HTTPException(500, detail=str(e))

# --- NEW: Diagnostics Endpoints ---

@app.get("/admin/diagnostics", response_model=schemas.SystemDiagnostics)
def get_diagnostics(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    """
    Performs system checks: DB connection, Internet connectivity, Disk usage, Version check.
    """
    # 1. Database Check (Implicitly working if we are here, but let's query explicit)
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        logger.error(f"Diagnostics: Database check failed: {e}")
        db_ok = False

    # 2. Internet Check (Ping GitHub or Google DNS)
    internet_ok = False
    try:
        # Connect to 8.8.8.8 port 53 (Google Public DNS) - reliable and fast
        socket.create_connection(("8.8.8.8", 53), timeout=3)
        internet_ok = True
    except OSError:
        internet_ok = False

    # 3. Disk Usage
    total, used, free = shutil.disk_usage(".")
    disk_total_gb = round(total / (2**30), 2)
    disk_free_gb = round(free / (2**30), 2)
    disk_percent = round((used / total) * 100, 1)

    # 4. Version Check (Fetch latest tag from GitHub)
    latest_version = "Unknown"
    update_available = False
    if internet_ok:
        try:
            with urllib.request.urlopen("https://api.github.com/repos/FaserF/Solumati/releases/latest", timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode())
                    latest_version = data.get("tag_name", "Unknown").lstrip('v')
                    if latest_version != "Unknown" and latest_version != CURRENT_VERSION:
                        update_available = True
        except Exception as e:
            logger.warning(f"Diagnostics: Could not fetch latest version: {e}")

    return {
        "current_version": CURRENT_VERSION,
        "latest_version": latest_version,
        "update_available": update_available,
        "internet_connected": internet_ok,
        "disk_total_gb": disk_total_gb,
        "disk_free_gb": disk_free_gb,
        "disk_percent": disk_percent,
        "database_connected": db_ok,
        "api_reachable": True
    }

@app.get("/admin/changelog", response_model=List[schemas.ChangelogRelease])
def get_changelog(current_admin: models.User = Depends(require_admin)):
    """Fetches the last 5 releases from GitHub."""
    try:
        url = "https://api.github.com/repos/FaserF/Solumati/releases?per_page=5"
        req = urllib.request.Request(url, headers={"User-Agent": "Solumati-Backend"})
        with urllib.request.urlopen(req, timeout=5) as response:
             if response.status == 200:
                 data = json.loads(response.read().decode())
                 return data
    except Exception as e:
        logger.error(f"Failed to fetch changelog: {e}")
    return []


@app.get('/api/i18n/{lang}')
async def get_i18n(lang: str):
    translations = i18n.get_translations(i18n.normalize_lang_code(lang))
    return {"lang": lang, "translations": translations}

@app.get('/health')
async def health_check():
    return {"status": "ok"}