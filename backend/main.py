from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import logging
import os
import asyncio

# Local modules
from database import engine, Base, get_db
import models, schemas
from logging_config import logger
from config import CURRENT_VERSION, TEST_MODE
from init_data import check_schema, ensure_guest_user, ensure_admin_user, generate_dummy_data
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

app = FastAPI(title="Solumati API", version=CURRENT_VERSION)

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
        db = next(get_db())

        # 1. Check Schema Migrations
        check_schema(db)

        # 2. Ensure Core Data
        ensure_guest_user(db)
        ensure_admin_user(db)

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

@app.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    legal_config = schemas.LegalConfig(**get_setting(db, "legal", {}))

    # Determine which providers are configured
    from config import GITHUB_CLIENT_ID, GOOGLE_CLIENT_ID, MICROSOFT_CLIENT_ID
    providers = schemas.OAuthProviders(
        github=bool(GITHUB_CLIENT_ID),
        google=bool(GOOGLE_CLIENT_ID),
        microsoft=bool(MICROSOFT_CLIENT_ID)
    )

    return {
        "registration_enabled": reg_config.enabled,
        "email_2fa_enabled": reg_config.email_2fa_enabled,
        "test_mode": TEST_MODE,
        "maintenance_mode": reg_config.maintenance_mode,
        "backend_version": CURRENT_VERSION,
        "legal": legal_config,
        "oauth_providers": providers,
        "allow_password_registration": reg_config.allow_password_registration
    }

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(system.router)
app.include_router(oauth.router)