import asyncio
import logging
import os

# Routers
from app.api.routers import (admin, auth, backup, chat, demo, notifications, oauth,
                             system, users)
from app.core.config import CURRENT_VERSION, PROJECT_NAME, TEST_MODE
# Local modules
from app.core.database import Base, SessionLocal, engine, get_db
from app.core.logging_config import logger
from app.db import models, schemas
from app.scripts.init_data import (check_emergency_reset, check_schema,
                                   ensure_admin_user, ensure_guest_user,
                                   ensure_showcase_dummies,
                                   ensure_support_user, fix_dummy_user_roles,
                                   generate_dummy_data)
from app.services.scheduler import start_scheduler
from app.services.tasks import periodic_cleanup_task
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

# --- App Initialization ---
app = FastAPI(title=PROJECT_NAME, version=CURRENT_VERSION)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static Files ---
os.makedirs("static/images", exist_ok=True)
os.makedirs("static/images/dummies", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


# --- Startup Event ---
# --- Startup Event ---
@app.on_event("startup")
async def startup_event():
    logger.info(f"Starting {PROJECT_NAME} v{CURRENT_VERSION}")

    # DEBUG: Print Routes
    for route in app.routes:
        if hasattr(route, "path"):
            print(f"ROUTE: {route.path}")

    # Create DB Session for Init
    db = SessionLocal()
    try:
        # Create Tables if they don't exist
        Base.metadata.create_all(bind=engine)

        # Check DB Schema
        check_schema(db)

        # Initialize Data
        ensure_admin_user(db)
        ensure_guest_user(db)
        ensure_support_user(db)
        check_emergency_reset(db)

        # Initialize Scheduler
        start_scheduler()

        # Always ensure showcase dummies are present for guest mode
        await ensure_showcase_dummies(db)

        if TEST_MODE:
            logger.warning(f"TEST MODE ACTIVE: Generating Dummy Data...")
            await generate_dummy_data(db=db)

        fix_dummy_user_roles(db)

    finally:
        db.close()

    # Allow cleaner shutdown of background tasks if any
    app.state.cleanup_task = asyncio.create_task(periodic_cleanup_task())


@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down...")
    if hasattr(app.state, "cleanup_task"):
        app.state.cleanup_task.cancel()


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(admin.router)
app.include_router(system.router)
app.include_router(oauth.router)
app.include_router(chat.router, tags=["chat"])
app.include_router(notifications.router, tags=["notifications"])

app.include_router(backup.router, tags=["backup"])
app.include_router(demo.router)
