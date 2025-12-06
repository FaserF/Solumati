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

# Create database tables on startup (if they don't exist)
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables verified/created successfully.")
except Exception as e:
    logger.error(f"Error creating database tables: {e}")

app = FastAPI(title="Solumati API", version="0.1.0")

# CORS Setup - Allow Frontend to communicate with Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # In production, restrict this to the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Business Logic / Algorithms ---

def calculate_compatibility(user_a: models.User, user_b: models.User) -> float:
    """
    Calculates a compatibility score (0-100) based on answer vectors.
    Returns 0.0 if intents do not match.
    """
    if user_a.intent != user_b.intent:
        logger.debug(f"Intent mismatch between User {user_a.id} and {user_b.id}")
        return 0.0

    # Calculate Manhattan distance (sum of absolute differences)
    diff_sum = sum(abs(a - b) for a, b in zip(user_a.answers, user_b.answers))
    # Max possible difference: 20 questions * 4 (max diff per q: 5-1=4) = 80
    max_diff = len(user_a.answers) * 4

    # Invert distance to get similarity percentage
    match_percentage = 100 - ((diff_sum / max_diff) * 100)
    return round(max(0, match_percentage), 2)

# --- API Endpoints ---

@app.post("/users/", response_model=schemas.UserDisplay)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Registers a new user.
    """
    logger.info(f"Attempting to register user: {user.email}")

    # Check if email exists
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        logger.warning(f"Registration failed: Email {user.email} already exists.")
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user instance
    # SECURITY NOTE: In a real app, hash the password using bcrypt!
    new_user = models.User(
        email=user.email,
        hashed_password=user.password + "notreallyhashed",
        intent=user.intent,
        answers=user.answers
    )

    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        logger.info(f"User {new_user.id} created successfully.")
        return new_user
    except Exception as e:
        logger.error(f"Database error during registration: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.post("/login")
def login(login_data: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Simplified login for MVP. Returns user ID on success.
    """
    logger.info(f"Login attempt for: {login_data.email}")
    user = db.query(models.User).filter(models.User.email == login_data.email).first()

    # Simple password check (again, use hashing in prod)
    if not user or user.hashed_password != (login_data.password + "notreallyhashed"):
        logger.warning("Invalid credentials provided.")
        raise HTTPException(status_code=404, detail="Invalid credentials")

    return {"user_id": user.id, "email": user.email, "intent": user.intent}

@app.get("/matches/{user_id}", response_model=List[schemas.MatchResult])
def get_matches(user_id: int, db: Session = Depends(get_db)):
    """
    Returns a sorted list of compatible matches.
    """
    logger.info(f"Fetching matches for User {user_id}")
    current_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not current_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get all other users
    all_users = db.query(models.User).filter(models.User.id != user_id).all()
    matches = []

    for other in all_users:
        try:
            score = calculate_compatibility(current_user, other)
            if score > 0:
                matches.append(schemas.MatchResult(
                    user_id=other.id,
                    email=f"User #{other.id}", # Anonymized for initial match list
                    score=score
                ))
        except Exception as e:
            logger.error(f"Error calculating match for {other.id}: {e}")
            continue

    # Sort by score descending
    matches.sort(key=lambda x: x.score, reverse=True)
    return matches


@app.get('/api/i18n/{lang}', summary='Return UI translations for requested language')
async def get_i18n(lang: str):
    """Return the translation dictionary for the requested language.
    The frontend (PWA) should fetch this and use it for UI strings.
    """
    normalized = i18n.normalize_lang_code(lang)
    translations = i18n.get_translations(normalized)
    if not translations:
        # Fallback to default language if requested not available
        translations = i18n.get_translations(i18n.DEFAULT_LANG)
        normalized = i18n.DEFAULT_LANG
    logger.info(f"Serving translations for language: {normalized}")
    return {"lang": normalized, "translations": translations}


@app.get('/api/i18n', summary='Return available languages')
async def list_i18n():
    langs = i18n.get_available_languages()
    logger.info(f"Available languages requested: {langs}")
    return {"available": langs}


def _parse_db_host_port(db_url: str):
    try:
        parsed = urlparse(db_url)
        host = parsed.hostname or 'db'
        port = parsed.port or 5432
        return host, port
    except Exception:
        return 'db', 5432


@app.get('/health', summary='Basic health check; verifies DB TCP connectivity')
async def health_check():
    db_url = os.getenv('DATABASE_URL', '')
    host, port = _parse_db_host_port(db_url)
    # Try to connect to DB TCP port
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(2)
    try:
        sock.connect((host, int(port)))
        sock.close()
        return {"status": "ok", "db": f"{host}:{port}"}
    except Exception as ex:
        logger.error(f"Health check failed: cannot reach DB at {host}:{port}: {ex}")
        raise HTTPException(status_code=503, detail="Database not reachable")


# Simple root endpoint
@app.get('/')
async def root():
    return {"message": "Solumati API running"}