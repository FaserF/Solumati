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

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from utils import get_setting

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Allow whitelisted paths
        if request.url.path.startswith(("/login", "/auth", "/admin", "/static", "/docs", "/openapi.json", "/public-config")) or request.method == "OPTIONS":
            return await call_next(request)

        # Check Admin Token (Basic heuristics for example, or just let /auth pass and admin endpoints pass)
        # Better: Check DB setting efficiently
        # Issue: DB access in middleware needs Session.
        # Quick hack: We use a lightweight check or just rely on the frontend to block UI,
        # BUT user wanted backend enforcement.
        # Ideally we fetch setting.

        try:
            db = next(get_db())
            reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
            if reg_config.maintenance_mode:
                # Check if user is admin?
                # Hard to check user without full auth dependency here.
                # So we block EVERYTHING except login/admin paths.
                # The Admin UI runs on /admin routes (if we had dedicated admin routes, but we use /api/...)
                # Our Admin UI is React based consuming API.
                # We need to allow API calls for Admin.
                # We can't easily distinguish Admin from User without decoding token.
                # Let's allow login and assume AdminPanel handles logic, OR decode token.

                # Simplified: Block all non-essential API calls with 503.
                # Frontend will handle 503.
                 pass
                 # For now, let's implement the soft block:
                 # If path not in whitelist ...
                 # But we need to allow Admin actions.
                 # Let's decode token 'role' if present?
                 pass

            # RE-IMPLEMENTATION:
            # We will just allow specific prefixes. Admin actions usually go to /admin/* or /users/*.
            # If we block /users/*, Admin can't work.
            # So real Maintenance Mode usually allows Admins.
            # We will skip valid token check here for complexity and just block if not admin later in dependencies?
            # Or just block general access and rely on frontend "Maintenance Screen" for normal users.
            # BUT user asked for backend enforcement.
            # Let's decode token role simply.

            from jose import jwt
            from config import SECRET_KEY, ALGORITHM
            import shlex

            auth_header = request.headers.get('Authorization')
            is_admin = False
            if auth_header:
                try:
                    scheme, token = auth_header.split()
                    if scheme.lower() == 'bearer':
                        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                        if payload.get("role") == "admin":
                            is_admin = True
                except:
                    pass

            if reg_config.maintenance_mode and not is_admin:
                 return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})

        except Exception as e:
            # logger.error(f"Middleware Error: {e}")
            pass # Fail open or closed? Fail open to avoid lockouts.

        return await call_next(request)

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