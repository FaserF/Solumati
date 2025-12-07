from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, BackgroundTasks, Header, Request
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
import asyncio
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr

# SECURITY: Use bcrypt directly for future-proof hashing
import bcrypt
# 2FA Libraries
import pyotp
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorAttachment,
)

# Import local modules
from database import engine, Base, get_db, SessionLocal
import models, schemas
import i18n
from logging_config import logger

# --- LOGGING CONFIGURATION ---
logging.basicConfig(level=logging.INFO)
# Ensure we use the logger configured in logging_config
logger = logging.getLogger(__name__)

TEST_MODE = os.getenv("TEST_MODE", "false").lower() in ("true", "1", "yes")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

# --- SECURITY HELPER FUNCTIONS ---
def hash_password(password: str) -> str:
    """Hashes a password using bcrypt with a generated salt."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode('utf-8')
        hash_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except ValueError:
        return False
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False

# --- VERSION SYNC ---
def get_app_version():
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
    return "0.5.3"

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

# --- Background Tasks ---
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
    except Exception as e:
        logger.error(f"Error during user cleanup task: {e}")
        db.rollback()
    finally:
        db.close()

async def periodic_cleanup_task():
    while True:
        await cleanup_unverified_users()
        await asyncio.sleep(86400)

# --- Startup: DB Migration & Tasks ---
@app.on_event("startup")
async def startup_check_schema():
    db = next(get_db())
    try:
        # DB Migration Checks
        columns_to_check = {
            "is_visible_in_matches": "BOOLEAN DEFAULT TRUE",
            "verification_code": "VARCHAR",
            "two_factor_method": "VARCHAR DEFAULT 'none'",
            "totp_secret": "VARCHAR",
            "email_2fa_code": "VARCHAR",
            "email_2fa_expires": "TIMESTAMP",
            "webauthn_credentials": "TEXT DEFAULT '[]'",
            "webauthn_challenge": "VARCHAR"
        }

        for col, definition in columns_to_check.items():
            try:
                db.execute(text(f"SELECT {col} FROM users LIMIT 1"))
            except Exception:
                db.rollback()
                logger.warning(f"Column '{col}' missing in 'users'. Adding it.")
                db.execute(text(f"ALTER TABLE users ADD COLUMN {col} {definition}"))
                db.commit()
                logger.info(f"Migration successful: Added '{col}'.")

    except Exception as e:
        logger.error(f"Schema check failed: {e}")
    finally:
        db.close()

    asyncio.create_task(periodic_cleanup_task())

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
        logger.warning(f"Unauthorized admin access attempt by {user.username}")
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user

def require_moderator_or_admin(user: models.User = Depends(get_current_user_from_header)):
    if user.role not in ['admin', 'moderator']:
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

# --- 2FA Logic Helpers ---
def generate_email_2fa_code(user: models.User, db: Session):
    code = str(random.randint(100000, 999999))
    user.email_2fa_code = code
    user.email_2fa_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Send Mail
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))

    html = f"""
    <p>Your Solumati verification code is:</p>
    <h1>{code}</h1>
    <p>Valid for 10 minutes.</p>
    """

    send_mail_sync(user.email, "Solumati Login Verification", html, db)
    logger.info(f"Sent Email 2FA code to {user.email}")

# --- HTML Email Helper ---
def create_html_email(title: str, content: str, action_url: str = None, action_text: str = None, server_domain: str = ""):
    if server_domain.endswith("/"): server_domain = server_domain[:-1]
    logo_src = f"{server_domain}/logo/Solumati.png"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: Helvetica, Arial, sans-serif; background-color: #f4f4f7; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 30px; text-align: center; }}
            .content {{ padding: 40px 30px; line-height: 1.6; color: #51545E; }}
            .button {{ display: inline-block; background-color: #ec4899; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 5px; font-weight: bold; margin-top: 20px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2 style="color: white; margin: 0;">Solumati</h2>
            </div>
            <div class="content">
                <h1>{title}</h1>
                <p>{content}</p>
                {f'<div style="text-align: center;"><a href="{action_url}" class="button">{action_text}</a></div>' if action_url else ''}
            </div>
        </div>
    </body>
    </html>
    """
    return html

def send_mail_sync(to_email: str, subject: str, html_body: str, db: Session):
    try:
        config_dict = get_setting(db, "mail", schemas.MailConfig())
        config = schemas.MailConfig(**config_dict)
        if not config.enabled:
            logger.info(f"Mail sending disabled. To: {to_email}")
            return

        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr((config.sender_name, config.from_email))
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

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
            guest = models.User(
                id=0, email="guest@solumati.local",
                hashed_password=hash_password("NOPASSWORD"),
                real_name="Gast", username="Gast", about_me="System Guest",
                is_active=True, is_verified=True, is_guest=True, intent="casual",
                answers=[3,3,3,3], created_at=datetime.utcnow(), role='guest',
                is_visible_in_matches=False
            )
            db.add(guest)
            db.commit()
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to ensure guest user: {e}")

def ensure_admin_user(db: Session):
    try:
        admin = db.query(models.User).filter(models.User.username == "admin").first()
        if not admin:
            logger.info("No 'admin' user found. Creating initial admin account...")
            initial_password = secrets.token_urlsafe(16)
            admin = models.User(
                email="admin@solumati.local",
                hashed_password=hash_password(initial_password),
                real_name="Administrator", username="admin",
                about_me="System Administrator",
                is_active=True, is_verified=True, is_guest=False, role="admin",
                intent="admin", answers=[3,3,3,3], created_at=datetime.utcnow(),
                is_visible_in_matches=False
            )
            db.add(admin)
            db.commit()
            sep = "=" * 60
            logger.warning(f"\n{sep}\nINITIAL ADMIN USER CREATED\nPassword: {initial_password}\nPLEASE CHANGE LATER\n{sep}\n")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to ensure admin user: {e}")

@app.on_event("startup")
def startup_event():
    logger.info("Starting up Solumati Backend...")
    try:
        db = next(get_db())
        ensure_guest_user(db)
        ensure_admin_user(db)
        # Init settings if missing
        for key, schema in [("registration", schemas.RegistrationConfig), ("mail", schemas.MailConfig), ("legal", schemas.LegalConfig)]:
            if get_setting(db, key, None) is None:
                save_setting(db, key, schema().dict())
    except Exception as e:
        logger.critical(f"Startup failed: {e}")

# --- API Endpoints ---

@app.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    return {
        "registration_enabled": reg_config.enabled,
        "test_mode": TEST_MODE
    }

@app.get("/public/legal", response_model=schemas.LegalConfig)
def get_public_legal(db: Session = Depends(get_db)):
    # Simple pass-through without generation logic for brevity, frontend handles empty logic
    config = schemas.LegalConfig(**get_setting(db, "legal", {}))
    return config

# --- 2FA Setup Endpoints ---

@app.post("/users/2fa/setup/totp", response_model=schemas.TotpSetupResponse)
def setup_totp(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Generates a TOTP secret and returns it along with a provisioning URI."""
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name="Solumati")
    return {"secret": secret, "uri": uri}

@app.post("/users/2fa/verify/totp")
def verify_totp_setup(req: schemas.TotpVerifyRequest, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Verifies the code to finalize TOTP setup."""
    if not user.totp_secret:
        raise HTTPException(400, "TOTP setup not initiated.")

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(req.token):
        user.two_factor_method = 'totp'
        db.commit()
        return {"status": "enabled"}
    else:
        raise HTTPException(400, "Invalid code")

@app.post("/users/2fa/setup/email")
def setup_email_2fa(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Enables Email 2FA if allowed globally."""
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not reg_config.email_2fa_enabled:
        raise HTTPException(403, "Email 2FA is currently disabled by administrator.")

    user.two_factor_method = 'email'
    db.commit()
    return {"status": "enabled"}

@app.post("/users/2fa/disable")
def disable_2fa(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    user.two_factor_method = 'none'
    user.totp_secret = None
    user.webauthn_credentials = "[]"
    db.commit()
    return {"status": "disabled"}

# --- WebAuthn Setup ---

@app.post("/users/2fa/setup/webauthn/register/options")
def webauthn_register_options(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Generate WebAuthn registration options."""
    # Retrieve existing credentials to prevent re-registration
    existing_creds = json.loads(user.webauthn_credentials or "[]")

    options = generate_registration_options(
        rp_id="localhost", # IMPORTANT: Must match the domain. In dev it is localhost.
        rp_name="Solumati",
        user_id=str(user.id).encode(),
        user_name=user.email,
        exclude_credentials=[
            RegistrationCredential(
                id=base64url_to_bytes(cred["id"]),
                transports=cred.get("transports")
            ) for cred in existing_creds
        ],
        authenticator_selection=AuthenticatorSelectionCriteria(
            authenticator_attachment=AuthenticatorAttachment.CROSS_PLATFORM,
            user_verification=UserVerificationRequirement.PREFERRED
        )
    )

    user.webauthn_challenge = options.challenge.decode('utf-8') if isinstance(options.challenge, bytes) else options.challenge
    db.commit()

    return json.loads(options_to_json(options))

@app.post("/users/2fa/setup/webauthn/register/verify")
def webauthn_register_verify(req: schemas.WebAuthnRegistrationResponse, request: Request, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Verify WebAuthn registration response."""
    if not user.webauthn_challenge:
        raise HTTPException(400, "No registration challenge found")

    try:
        verification = verify_registration_response(
            credential=req.credential,
            expected_challenge=base64url_to_bytes(user.webauthn_challenge),
            expected_origin=APP_BASE_URL, # "http://localhost:3000"
            expected_rp_id="localhost",
            require_user_verification=False # Simplifying for dev
        )

        # Save Credential
        existing_creds = json.loads(user.webauthn_credentials or "[]")

        # Convert credential to dict safe for JSON
        new_cred = {
            "id": verification.credential_id.decode('utf-8') if isinstance(verification.credential_id, bytes) else verification.credential_id,
            "public_key": verification.credential_public_key.decode('utf-8') if isinstance(verification.credential_public_key, bytes) else verification.credential_public_key.decode('latin-1'), # encoding trick for bytes
            "sign_count": verification.sign_count,
            "transports": req.credential.get("response", {}).get("transports", [])
        }
        # In a real app we need to store public key bytes properly. For simplicity here assuming base64 usage in library.
        # Actually verify_registration_response returns bytes. We must serialize them.
        import base64
        new_cred["id"] = base64.urlsafe_b64encode(verification.credential_id).decode().rstrip("=")
        new_cred["public_key"] = base64.urlsafe_b64encode(verification.credential_public_key).decode().rstrip("=")

        existing_creds.append(new_cred)
        user.webauthn_credentials = json.dumps(existing_creds)
        user.two_factor_method = 'passkey'
        user.webauthn_challenge = None
        db.commit()
        return {"status": "verified", "method": "passkey"}

    except Exception as e:
        logger.error(f"WebAuthn verification failed: {e}")
        raise HTTPException(400, f"Verification failed: {str(e)}")


# --- WebAuthn Authentication (Login) ---

@app.post("/auth/2fa/webauthn/options")
def webauthn_auth_options(body: dict, db: Session = Depends(get_db)):
    """Get auth options for a user (Login Step 1)."""
    user_id = body.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")

    existing_creds = json.loads(user.webauthn_credentials or "[]")

    options = generate_authentication_options(
        rp_id="localhost",
        allow_credentials=[
            AuthenticationCredential(id=base64url_to_bytes(cred["id"]))
            for cred in existing_creds
        ]
    )

    user.webauthn_challenge = options.challenge.decode('utf-8') if isinstance(options.challenge, bytes) else options.challenge
    db.commit()

    return json.loads(options_to_json(options))

@app.post("/auth/2fa/webauthn/verify")
def webauthn_auth_verify(req: schemas.WebAuthnAuthResponse, db: Session = Depends(get_db)):
    """Verify Passkey Assertion (Login Step 2)."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user or not user.webauthn_challenge:
        raise HTTPException(400, "Invalid challenge state")

    try:
        import base64
        existing_creds = json.loads(user.webauthn_credentials or "[]")

        # Find the credential used
        cred_id_input = req.credential.get("id")
        credential_data = next((c for c in existing_creds if c["id"] == cred_id_input), None)

        if not credential_data:
            raise HTTPException(400, "Credential not known")

        verification = verify_authentication_response(
            credential=req.credential,
            expected_challenge=base64url_to_bytes(user.webauthn_challenge),
            expected_origin=APP_BASE_URL,
            expected_rp_id="localhost",
            credential_public_key=base64.urlsafe_b64decode(credential_data["public_key"] + "=="),
            credential_current_sign_count=credential_data["sign_count"]
        )

        # Update sign count
        credential_data["sign_count"] = verification.new_sign_count
        user.webauthn_credentials = json.dumps(existing_creds)
        user.webauthn_challenge = None
        user.last_login = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "is_guest": user.is_guest,
            "is_admin": user.role == 'admin'
        }
    except Exception as e:
        logger.error(f"Passkey auth failed: {e}")
        raise HTTPException(400, f"Authentication failed: {str(e)}")


# --- MAIN AUTH FLOWS ---

@app.post("/login", response_model=schemas.TwoFactorLoginResponse)
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for: {creds.login}")
    user = db.query(models.User).filter(
        or_(models.User.email == creds.login, models.User.username == creds.login)
    ).first()

    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    # Check Ban Status
    if not user.is_active:
        if user.banned_until and user.banned_until <= datetime.utcnow():
            user.is_active = True
            user.banned_until = None
            db.commit()
        else:
            raise HTTPException(403, "Account deactivated or banned.")

    # Check 2FA
    if user.two_factor_method != 'none':
        # Trigger email code if method is email
        if user.two_factor_method == 'email':
            generate_email_2fa_code(user, db)

        return {
            "require_2fa": True,
            "user_id": user.id,
            "method": user.two_factor_method
        }

    # No 2FA:
    user.last_login = datetime.utcnow()
    db.commit()
    return {
        "require_2fa": False,
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "is_guest": user.is_guest,
        "is_admin": user.role == 'admin'
    }

@app.post("/auth/2fa/verify")
def verify_2fa_login(req: schemas.TwoFactorAuthRequest, db: Session = Depends(get_db)):
    """Verifies TOTP or Email Code for Login."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user: raise HTTPException(404, "User not found")

    valid = False

    if user.two_factor_method == 'totp':
        if not user.totp_secret: raise HTTPException(400, "TOTP not set up")
        totp = pyotp.TOTP(user.totp_secret)
        if totp.verify(req.code):
            valid = True

    elif user.two_factor_method == 'email':
        if not user.email_2fa_code: raise HTTPException(400, "No code generated")
        if user.email_2fa_expires and datetime.utcnow() > user.email_2fa_expires:
             raise HTTPException(400, "Code expired")
        if req.code == user.email_2fa_code:
            valid = True
            user.email_2fa_code = None # Consume code

    elif user.two_factor_method == 'passkey':
        # Passkey handled via specific endpoint, this is fallback or error
        raise HTTPException(400, "Use WebAuthn endpoint for passkeys")
    else:
        # Fallback if method is none but we are here (should not happen)
        valid = True

    if valid:
        user.last_login = datetime.utcnow()
        db.commit()
        return {
            "status": "success",
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "is_guest": user.is_guest,
            "is_admin": user.role == 'admin'
        }
    else:
        raise HTTPException(401, "Invalid 2FA Code")

@app.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not reg_config.enabled: raise HTTPException(403, "Registration disabled.")

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(400, "Email already registered.")

    hashed_pw = hash_password(user.password)
    secure_code = secrets.token_urlsafe(32)
    is_verified = not reg_config.require_verification
    verification_code = secure_code if reg_config.require_verification else None

    new_user = models.User(
        email=user.email,
        hashed_password=hashed_pw,
        real_name=user.real_name, username=generate_unique_username(db, user.real_name),
        intent=user.intent, answers=user.answers,
        is_active=True, is_verified=is_verified, verification_code=verification_code,
        role="user", created_at=datetime.utcnow()
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if reg_config.require_verification and not new_user.is_verified:
        server_url = reg_config.server_domain.rstrip('/')
        link = f"{server_url}/verify?id={new_user.id}&code={secure_code}"
        html = create_html_email("Verify your Account", "Welcome to Solumati!", link, "Verify Email", server_url)
        background_tasks.add_task(send_mail_sync, user.email, "Verify your Solumati Account", html, db)

    return new_user

@app.post("/verify")
def verify_email(id: int, code: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user: raise HTTPException(404, "User not found")
    if user.is_verified: return {"message": "User already verified", "status": "already_verified"}
    if not code or not user.verification_code or not secrets.compare_digest(code, user.verification_code):
        raise HTTPException(400, "Invalid code")
    user.is_verified = True
    user.verification_code = None
    db.commit()
    return {"message": "Success", "status": "verified"}

@app.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
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

@app.get("/admin/users", response_model=List[schemas.UserDisplay])
def admin_get_users(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    return db.query(models.User).order_by(models.User.id).all()

@app.put("/admin/users/{user_id}")
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
    return {"status": "success"}

@app.put("/admin/users/{user_id}/punish")
def admin_punish_user(user_id: int, action: schemas.AdminPunishAction, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user: raise HTTPException(404, "User not found")
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
    elif action.action == "promote_moderator": user.role = "moderator"
    elif action.action == "demote_user": user.role = "user"
    elif action.action == "verify": user.is_verified = True
    db.commit()
    return {"status": "success"}

@app.get("/admin/settings", response_model=schemas.SystemSettings)
def get_admin_settings(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    return {
        "mail": get_setting(db, "mail", schemas.MailConfig()),
        "registration": get_setting(db, "registration", schemas.RegistrationConfig()),
        "legal": get_setting(db, "legal", schemas.LegalConfig())
    }

@app.put("/admin/settings")
def update_admin_settings(settings: schemas.SystemSettings, db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    save_setting(db, "mail", settings.mail.dict())
    save_setting(db, "registration", settings.registration.dict())
    save_setting(db, "legal", settings.legal.dict())
    return {"status": "updated"}

@app.get("/admin/diagnostics", response_model=schemas.SystemDiagnostics)
def get_diagnostics(db: Session = Depends(get_db), current_admin: models.User = Depends(require_admin)):
    total, used, free = shutil.disk_usage(".")
    return {
        "current_version": CURRENT_VERSION,
        "latest_version": "Unknown",
        "update_available": False,
        "internet_connected": True,
        "disk_total_gb": round(total / (2**30), 2),
        "disk_free_gb": round(free / (2**30), 2),
        "disk_percent": round((used / total) * 100, 1),
        "database_connected": True,
        "api_reachable": True
    }

@app.get('/api/i18n/{lang}')
async def get_i18n(lang: str):
    return {"lang": lang, "translations": i18n.get_translations(i18n.normalize_lang_code(lang))}

@app.get('/health')
async def health_check():
    return {"status": "ok"}