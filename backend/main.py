from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from typing import List, Optional
import logging
import os
import random
import shutil
import json
import smtplib
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
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "SuperSafePassword123!")
# Default fallback if no domain is configured
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

# Initialize DB Tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(title="Solumati API", version="0.6.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

os.makedirs("static/images", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

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
        # Use configured sender name + email
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
        # Re-raise for manual tests to catch errors in UI
        if "Test Mail" in subject:
             raise e

# --- Core Logic Helpers ---
def get_server_domain(db: Session) -> str:
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if reg_config.server_domain:
        return reg_config.server_domain.strip()
    return "example.com" # Default fallback for generating emails if nothing set

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

# --- Startup ---
def ensure_guest_user(db: Session):
    try:
        guest = db.query(models.User).filter(models.User.id == 0).first()
        domain = get_server_domain(db)
        if not guest:
            logger.info("Creating Guest User (ID 0)...")
            guest = models.User(
                id=0, email=f"guest@{domain}", hashed_password="NOPASSWORD",
                real_name="Gast", username="Gast", about_me="System Guest",
                is_active=True, is_verified=True, is_guest=True, intent="casual",
                answers=[3,3,3,3], created_at=datetime.utcnow()
            )
            db.add(guest)
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create guest user: {e}")

@app.on_event("startup")
def startup_event():
    logger.info("Starting up Solumati Backend...")
    try:
        db = next(get_db())
        # Init settings if missing
        if get_setting(db, "registration", None) is None:
            save_setting(db, "registration", schemas.RegistrationConfig().dict())
        if get_setting(db, "mail", None) is None:
            save_setting(db, "mail", schemas.MailConfig().dict())
        if get_setting(db, "legal", None) is None:
            save_setting(db, "legal", schemas.LegalConfig().dict())

        ensure_guest_user(db)

        if TEST_MODE and db.query(models.User).count() < 20:
            logger.info("Generating dummy users...")
            intents = ["longterm", "casual"]
            names = ["Anna", "Ben", "Clara", "David", "Emma", "Fabian"]
            domain = get_server_domain(db)
            for i, name in enumerate(names):
                email = f"dummy{i}_{name.lower()}@{domain}"
                if not db.query(models.User).filter(models.User.email == email).first():
                    u = models.User(
                        email=email, hashed_password="pw", real_name=name,
                        username=generate_unique_username(db, name),
                        intent=random.choice(intents), answers=[random.randint(1,5) for _ in range(4)],
                        is_active=True, is_verified=True, created_at=datetime.utcnow()
                    )
                    db.add(u)
            db.commit()
    except Exception as e:
        logger.critical(f"Startup failed: {e}")

# --- Public Endpoints ---

@app.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    return {"registration_enabled": reg_config.enabled}

@app.get("/public/legal", response_model=schemas.LegalConfig)
def get_public_legal(db: Session = Depends(get_db)):
    return get_setting(db, "legal", schemas.LegalConfig())

@app.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not reg_config.enabled: raise HTTPException(403, "Registration disabled.")

    # Domain Check
    if reg_config.allowed_domains:
        domain = user.email.split('@')[-1].lower()
        if domain not in [d.strip().lower() for d in reg_config.allowed_domains.split(',')]:
            raise HTTPException(403, f"Domain '{domain}' not allowed.")

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Email already registered.")

    new_user = models.User(
        email=user.email, hashed_password=user.password + "salt",
        real_name=user.real_name, username=generate_unique_username(db, user.real_name),
        intent=user.intent, answers=user.answers,
        is_active=True, is_verified=not reg_config.require_verification,
        created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if not new_user.is_verified:
        # Use server_domain for link generation if set, else APP_BASE_URL
        base = APP_BASE_URL
        if reg_config.server_domain:
            base = f"https://{reg_config.server_domain}" if not reg_config.server_domain.startswith("http") else reg_config.server_domain

        link = f"{base}/verify?id={new_user.id}&code=dummy"
        background_tasks.add_task(send_mail_sync, user.email, "Solumati Verify", f"Please verify your account: <a href='{link}'>{link}</a>", db)

    return new_user

@app.post("/login")
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == creds.email).first()
    if not user or user.hashed_password != (creds.password + "salt"):
        raise HTTPException(401, "Invalid credentials")

    if not user.is_active:
        if user.banned_until and user.banned_until <= datetime.utcnow():
            user.is_active = True
            user.banned_until = None
            user.deactivation_reason = None
            db.commit()
        else:
            reason = user.deactivation_reason or "Locked"
            raise HTTPException(403, detail=f"Account inactive: {reason}")

    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not user.is_verified and reg_config.require_verification:
        raise HTTPException(403, "Please verify your email address.")

    user.last_login = datetime.utcnow()
    db.commit()
    return {"user_id": user.id, "username": user.username, "is_admin": user.is_admin}

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
        reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
        if not reg_config.guest_mode_enabled: raise HTTPException(403, "Guest mode disabled")
        curr_answ, curr_int, exc_id = [3,3,3,3], "longterm", 0
    else:
        u = db.query(models.User).filter(models.User.id == user_id).first()
        if not u: raise HTTPException(404, "User not found")
        curr_answ, curr_int, exc_id = u.answers, u.intent, user_id

    res = []
    # Exclude guest user (id=0) from matches
    for other in db.query(models.User).filter(models.User.id != exc_id, models.User.is_active == True, models.User.id != 0).all():
        s = calculate_compatibility(curr_answ, other.answers, curr_int, other.intent)
        if s > 0: res.append(schemas.MatchResult(user_id=other.id, username=other.username, about_me=other.about_me, image_url=other.image_url, score=s))
    res.sort(key=lambda x: x.score, reverse=True)
    return res

# --- User Profile & Account Settings ---

@app.get("/users/{user_id}", response_model=schemas.UserDisplay)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
    return user

@app.put("/users/{user_id}/profile", response_model=schemas.UserDisplay)
def update_profile(user_id: int, update: schemas.UserUpdate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")
    user.about_me = update.about_me
    db.commit()
    db.refresh(user)
    return user

@app.put("/users/{user_id}/account")
def update_account(user_id: int, update: schemas.UserAccountUpdate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")

    # Verify current password
    if user.hashed_password != (update.current_password + "salt"):
        raise HTTPException(401, "Wrong password")

    if update.password:
        user.hashed_password = update.password + "salt"
        logger.info(f"User {user.username} changed password.")

    if update.email and update.email != user.email:
        # Check if email taken
        if db.query(models.User).filter(models.User.email == update.email).first():
            raise HTTPException(400, "Email already taken")

        user.email = update.email
        user.is_verified = False # Reset verification
        logger.info(f"User {user.username} changed email. Re-verification needed.")

        # Send new verification email
        reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
        base = APP_BASE_URL
        if reg_config.server_domain:
             base = f"https://{reg_config.server_domain}" if not reg_config.server_domain.startswith("http") else reg_config.server_domain

        link = f"{base}/verify?id={user.id}&code=dummy"
        background_tasks.add_task(send_mail_sync, user.email, "Solumati Verify New Email", f"Verify your new email: <a href='{link}'>{link}</a>", db)

    db.commit()
    return {"status": "updated", "reverify_needed": not user.is_verified}

@app.delete("/users/{user_id}")
def delete_own_account(user_id: int, password: str = Body(..., embed=True), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "Not found")

    if user.hashed_password != (password + "salt"):
        raise HTTPException(401, "Wrong password")

    logger.info(f"User {user.username} deleted their own account.")
    db.delete(user)
    db.commit()
    return {"status": "deleted"}

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

@app.post("/admin/login")
def admin_login(creds: schemas.AdminLogin):
    if creds.password != ADMIN_SECRET:
        raise HTTPException(401, "Unauthorized")
    return {"status": "authenticated"}

@app.get("/admin/users", response_model=List[schemas.UserDisplay])
def admin_get_users(db: Session = Depends(get_db)):
    return db.query(models.User).order_by(models.User.id).all()

@app.put("/admin/users/{user_id}/punish")
def admin_user_action(user_id: int, action: schemas.AdminPunishAction, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    if action.action == "delete":
        db.delete(user)
    elif action.action == "verify":
        user.is_verified = True
    elif action.action == "reactivate":
        user.is_active = True
        user.deactivation_reason = None
        user.banned_until = None
    elif action.action == "deactivate":
        user.is_active = False
        user.deactivation_reason = action.reason_type
        user.deactivated_at = datetime.utcnow()
        if action.reason_type and action.reason_type.startswith("TempBan") and action.duration_hours:
            user.banned_until = datetime.utcnow() + timedelta(hours=action.duration_hours)
            user.deactivation_reason = f"TempBan{action.duration_hours}"

    db.commit()
    return {"status": "success"}

@app.get("/admin/reports", response_model=List[schemas.ReportDisplay])
def admin_get_reports(db: Session = Depends(get_db)):
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
def admin_resolve_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(models.Report).filter(models.Report.id == report_id).first()
    if report:
        db.delete(report)
        db.commit()
    return {"status": "resolved"}

@app.get("/admin/settings", response_model=schemas.SystemSettings)
def get_admin_settings(db: Session = Depends(get_db)):
    mail = get_setting(db, "mail", schemas.MailConfig())
    reg = get_setting(db, "registration", schemas.RegistrationConfig())
    legal = get_setting(db, "legal", schemas.LegalConfig())
    return {"mail": mail, "registration": reg, "legal": legal}

@app.put("/admin/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db)):
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    save_setting(db, "legal", settings.legal.dict())
    return {"status": "updated"}

@app.post("/admin/test-mail")
def send_test_mail(req: schemas.MailTestRequest, db: Session = Depends(get_db)):
    try:
        send_mail_sync(req.target_email, "Solumati Test Mail", "<h1>It Works!</h1><p>Your SMTP settings are correct.</p>", db)
        return {"status": "sent"}
    except Exception as e:
        logger.error(f"SMTP Test Failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.get('/api/i18n/{lang}')
async def get_i18n(lang: str):
    translations = i18n.get_translations(i18n.normalize_lang_code(lang))
    return {"lang": lang, "translations": translations}

@app.get('/health')
async def health_check():
    return {"status": "ok"}