from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import logging
import os
import socket
from urllib.parse import urlparse

# Import local modules
from database import engine, Base, get_db
import models, schemas
import i18n
from logging_config import logger

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables on startup
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(title="Solumati API", version="0.2.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Business Logic / Helpers ---

def calculate_compatibility(user_a: models.User, user_b: models.User) -> float:
    """Calculates compatibility score (0-100)."""
    if user_a.intent != user_b.intent:
        return 0.0
    # Manhattan distance
    diff_sum = sum(abs(a - b) for a, b in zip(user_a.answers, user_b.answers))
    max_diff = len(user_a.answers) * 4
    match_percentage = 100 - ((diff_sum / max_diff) * 100)
    return round(max(0, match_percentage), 2)

def generate_unique_username(db: Session, real_name: str) -> str:
    """
    Generates a username like 'Max#1'.
    Finds count of users with same base name and increments.
    """
    base = real_name.strip()
    # Simple counting strategy. In high-load, use sequences or optimistic locking.
    # We look for usernames starting with the name to approximate the suffix.
    # A safer way is simply count how many users have this real_name.
    count = db.query(models.User).filter(models.User.real_name == base).count()
    suffix = count + 1

    # Ensure uniqueness loop (edge case handling)
    while True:
        candidate = f"{base}#{suffix}"
        if not db.query(models.User).filter(models.User.username == candidate).first():
            return candidate
        suffix += 1

# --- API Endpoints ---

@app.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Registers a new user with auto-generated username."""
    logger.info(f"Registering: {user.email}")

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    username = generate_unique_username(db, user.real_name)

    new_user = models.User(
        email=user.email,
        hashed_password=user.password + "salt", # Simplified hashing
        real_name=user.real_name,
        username=username,
        intent=user.intent,
        answers=user.answers,
        is_active=True
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"Created user {username} ({new_user.id})")
        return new_user
    except Exception as e:
        logger.error(f"DB Error: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Server Error")

@app.post("/login")
def login(creds: schemas.UserLogin, db: Session = Depends(get_db)):
    """Standard Login."""
    user = db.query(models.User).filter(models.User.email == creds.email).first()

    # Check password and active status
    if not user or user.hashed_password != (creds.password + "salt"):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_active:
         raise HTTPException(status_code=403, detail="Account deactivated by Admin")

    return {"user_id": user.id, "username": user.username, "is_admin": user.is_admin}

@app.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
def get_matches(user_id: int, db: Session = Depends(get_db)):
    """Returns matches with usernames."""
    current_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    all_users = db.query(models.User).filter(models.User.id != user_id, models.User.is_active == True).all()
    matches = []

    for other in all_users:
        score = calculate_compatibility(current_user, other)
        if score > 0:
            matches.append(schemas.MatchResult(
                user_id=other.id,
                username=other.username,
                score=score
            ))

    matches.sort(key=lambda x: x.score, reverse=True)
    return matches

# --- Admin Endpoints ---

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "SuperSafePassword123!") # In prod, use env var

@app.post("/admin/login")
def admin_login(creds: schemas.AdminLogin):
    """Validates admin password."""
    if creds.password != ADMIN_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"status": "authenticated", "token": "dummy_admin_token"}

@app.get("/admin/users", response_model=List[schemas.UserDisplay])
def admin_get_users(db: Session = Depends(get_db)):
    """List all users for the panel."""
    return db.query(models.User).all()

@app.put("/admin/users/{user_id}")
def admin_manage_user(user_id: int, action: schemas.AdminAction, db: Session = Depends(get_db)):
    """Admin actions: delete, deactivate, reactivate."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if action.action == "delete":
        db.delete(user)
        msg = "User deleted"
    elif action.action == "deactivate":
        user.is_active = False
        msg = "User deactivated"
    elif action.action == "reactivate":
        user.is_active = True
        msg = "User reactivated"
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    return {"message": msg, "user_id": user_id}

# --- Infrastructure ---

@app.get('/api/i18n/{lang}')
async def get_i18n(lang: str):
    normalized = i18n.normalize_lang_code(lang)
    translations = i18n.get_translations(normalized)
    return {"lang": normalized, "translations": translations}

@app.get('/health')
async def health_check():
    return {"status": "ok"}