import logging
import secrets
import random
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from security import hash_password
from config import TEST_MODE

logger = logging.getLogger(__name__)

def check_schema(db: Session):
    """Checks and migrates the database schema for missing columns."""
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
            "webauthn_challenge": "VARCHAR",
            "reset_token": "VARCHAR",
            "reset_token_expires": "TIMESTAMP",
            "app_settings": "TEXT DEFAULT '{}'",
            "push_subscription": "TEXT"
        }

        for col, definition in columns_to_check.items():
            try:
                db.execute(text(f"SELECT {col} FROM users LIMIT 1"))
            except Exception:
                db.rollback()
                logger.warning(f"Column '{col}' missing. Attempting to add it.")
                db.execute(text(f"ALTER TABLE users ADD COLUMN {col} {definition}"))
                db.commit()
                logger.info(f"Migration successful: Added '{col}'.")

    except Exception as e:
        logger.error(f"Schema check failed: {e}")

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
            logger.info("Guest user created.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create or update guest user: {e}")

def ensure_admin_user(db: Session):
    try:
        # Check by ID 1 first (strict requirement: Admin = 1)
        admin = db.query(models.User).filter(models.User.id == 1).first()

        if not admin:
            # Check by username if ID 1 not found (migration scenario)
            admin_by_name = db.query(models.User).filter(models.User.username == "admin").first()

            if admin_by_name:
                if admin_by_name.id != 1:
                    logger.warning(f"Admin user exists but ID is {admin_by_name.id}, not 1. Skipping ID enforcement to prevent data corruption.")
                else:
                    logger.info("Admin user exists with ID 1.")
            else:
                logger.info("No 'admin' user found. Creating initial admin account with ID 1...")
                initial_password = secrets.token_urlsafe(16)
                admin = models.User(
                    id=1,
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
                logger.warning(f"\n{sep}\nINITIAL ADMIN USER CREATED (ID: 1)\nUsername: admin\nEmail: admin@solumati.local\nPassword: {initial_password}\nPLEASE CHANGE THIS PASSWORD LATER\n{sep}\n")

        try:
            db.execute(text("SELECT setval('users_id_seq', 10000, false);"))
            db.commit()
            logger.info("Database sequence 'users_id_seq' adjusted to start at 10000.")
        except Exception as seq_e:
            logger.warning(f"Could not adjust sequence (might be first run or unsupported DB): {seq_e}")
            db.rollback()

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to ensure admin user: {e}")

def generate_dummy_data(db: Session):
    """Generates dummy users if TEST_MODE is active and database is nearly empty."""
    if not TEST_MODE:
        return

    if db.query(models.User).count() > 5:
        logger.info("TEST_MODE active but data exists, skipping dummy generation.")
        return

    logger.info("Generating dummy users for TEST_MODE...")
    intents = ["casual", "longterm", "friendship"]

    # List of names for realistic dummies
    first_names = [
        "Anna", "Max", "Julia", "Lukas", "Sarah", "Felix", "Laura", "Tim", "Lisa", "Jan", "Lorenz", "Niklas", "Michelle",
        "Maria", "Paul", "Sophie", "Jonas", "Lena", "Leon", "Emily", "David", "Hannah", "Thomas", "Fabian", "Kai", "Adrian"
    ]

    try:
        for i, name in enumerate(first_names):
            email = f"{name.lower()}_dummy@solumati.local"
            username = f"{name}Dummy"

            # Skip if already exists
            if db.query(models.User).filter(models.User.email == email).first():
                continue

            dummy = models.User(
                email=email,
                hashed_password=hash_password("dummy"),
                real_name=f"{name} Dummy",
                username=username,
                about_me=f"Hallo! Ich bin {name}, ein generierter Test-User. Ich mag Pizza und Code.",
                is_active=True,
                is_verified=True,
                is_guest=False,
                role="test",
                intent=random.choice(intents),
                answers=[random.randint(1, 5) for _ in range(4)],
                created_at=datetime.utcnow(),
                is_visible_in_matches=True
            )
            db.add(dummy)

        db.commit()
        logger.info("Dummy users created successfully.")
    except Exception as e:
        logger.error(f"Failed to create dummy users: {e}")
        db.rollback()