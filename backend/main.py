from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os
import asyncio

# Local modules
from database import engine, Base, get_db, SessionLocal
import models, schemas
from logging_config import logger
from config import CURRENT_VERSION, TEST_MODE, PROJECT_NAME
from init_data import check_schema, ensure_guest_user, ensure_admin_user, generate_dummy_data, check_emergency_reset
from tasks import periodic_cleanup_task

# Routers
from routers import auth, users, admin, system, oauth

# --- LOGGING CONFIGURATION ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize DB Tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(title=f"{PROJECT_NAME} API", version=CURRENT_VERSION)

from middleware.maintenance import MaintenanceMiddleware

app.add_middleware(MaintenanceMiddleware)

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

# --- Startup ---
@app.on_event("startup")
def startup_event():
    logger.info("Starting up Solumati Backend...")
    try:
        try:
            db = next(get_db())

            # 1. Check Schema Migrations
            check_schema(db)

            # Check Maintenance Mode
            from utils import get_setting
            reg_config_dict = get_setting(db, "registration", {})
            reg_config = schemas.RegistrationConfig(**reg_config_dict)
            if reg_config.maintenance_mode:
                logger.warning(f"!!! MAITENANCE MODE IS ENABLED !!!")
                logger.warning(f"The system will block non-admin requests.")

            # 2. Ensure Core Data
            ensure_guest_user(db)
            ensure_admin_user(db)
            check_emergency_reset(db)

            # 3. Test Data
            if TEST_MODE:
                generate_dummy_data(db)
        except Exception as db_exc:
            logger.error(f"Startup DB Error (Non-critical for server start): {db_exc}")

        # 3. Test Data
        if TEST_MODE:
            generate_dummy_data(db)

        # 4. Background Tasks
        asyncio.create_task(periodic_cleanup_task())

    except Exception as e:
        logger.critical(f"Startup failed: {e}")

from fastapi import Depends
from sqlalchemy.orm import Session
from utils import get_setting

@app.get("/public-config")
def public_config():
    # Defaults
    reg_enabled = True
    allow_pw = True
    email_2fa = False
    maint_mode = False
    legal_conf = {}
    providers = {}

    try:
        # Try to connect to DB
        db = SessionLocal()
        try:
            reg_config_dict = get_setting(db, "registration", {})
            reg_config = schemas.RegistrationConfig(**reg_config_dict)

            reg_enabled = reg_config.enabled
            allow_pw = reg_config.allow_password_registration
            email_2fa = reg_config.email_2fa_enabled
            maint_mode = reg_config.maintenance_mode

            legal_conf = get_setting(db, "legal", {})

            # OAuth providers
            from routers.oauth import get_provider_sso
            for p in ["github", "google", "microsoft"]:
                if get_provider_sso(p, db):
                    providers[p] = True
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Public Config DB Error (using defaults): {e}")

    return {
        "registration_enabled": reg_enabled,
        "email_2fa_enabled": email_2fa,
        "test_mode": TEST_MODE,
        "maintenance_mode": maint_mode,
        "backend_version": CURRENT_VERSION,
        "legal": legal_conf,
        "oauth_providers": providers,
        "allow_password_registration": allow_pw
    }

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(system.router)
app.include_router(oauth.router)