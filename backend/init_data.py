import logging
import secrets
import random
import json
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
                answers=json.dumps({str(i): 1 for i in range(1, 51)}), # Default answers
                created_at=datetime.utcnow(), role='guest',
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
                    intent="admin", answers=json.dumps({}), created_at=datetime.utcnow(),
                    is_visible_in_matches=False
                )
                db.add(admin)
                db.commit()
                sep = "=" * 60
                msg = f"\n{sep}\nINITIAL ADMIN USER CREATED (ID: 1)\nUsername: admin\nEmail: admin@solumati.local\nPassword: {initial_password}\nPLEASE CHANGE THIS PASSWORD LATER\n{sep}\n"
                logger.warning(msg)
                print(msg)  # Ensure visibility in Docker logs

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

def check_emergency_reset(db: Session):
    """Checks if an emergency admin reset was requested."""
    try:
        from utils import get_setting, save_setting
        import models, json

        target_id_str = get_setting(db, "admin_emergency_reset_target", None)
        if not target_id_str: return

        try:
            target_id = int(target_id_str)
        except:
            return

        user = db.query(models.User).filter(models.User.id == target_id).first()
        if not user or user.role != 'admin':
            logger.warning(f"Emergency reset requested for ID {target_id}, but user not found or not admin.")
            return

        # Perform Reset
        new_pw = secrets.token_urlsafe(16)
        user.hashed_password = hash_password(new_pw)
        user.two_factor_method = 'none'
        user.totp_secret = None
        user.webauthn_credentials = "[]"
        user.webauthn_challenge = None

        # Clear Flag (by saving None or empty?)
        # get_setting gets a value. We need to DELETE it or set to empty.
        # SystemSetting is a simple Key-Value. We can delete the row.
        db.query(models.SystemSetting).filter(models.SystemSetting.key == "admin_emergency_reset_target").delete()

        db.commit()

        sep = "#" * 60
        msg = f"\n{sep}\nEMERGENCY RESET COMPLETED FOR USER: {user.username}\nNEW PASSWORD: {new_pw}\n{sep}\n"
        print(msg) # Print to stdout for Docker logs
        logger.critical(msg)

    except Exception as e:
        logger.error(f"Error during emergency reset check: {e}")
        db.rollback()

def generate_dummy_data(db: Session):
    """Generates dummy users if TEST_MODE is active and database is nearly empty."""
    if not TEST_MODE:
        return

    user_count = db.query(models.User).count()
    if user_count > 5:
        logger.info(f"TEST_MODE active but data exists (Users: {user_count}), skipping dummy generation.")
        return

    logger.info("Generating dummy users for TEST_MODE...")
    intents = ["casual", "longterm", "friendship"]

    # List of names for realistic dummies
    first_names = [
        "Anna", "Max", "Julia", "Lukas", "Sarah", "Felix", "Laura", "Tim", "Lisa", "Jan", "Lorenz", "Niklas", "Michelle",
        "Maria", "Paul", "Sophie", "Jonas", "Lena", "Leon", "Emily", "David", "Hannah", "Thomas", "Fabian", "Kai", "Adrian"
    ]

    try:
        created_dummies = []
        for i, name in enumerate(first_names):
            email = f"{name.lower()}_dummy@solumati.local"
            username = f"{name}Dummy"

            # Skip if already exists
            if db.query(models.User).filter(models.User.email == email).first():
                continue

            pw = secrets.token_urlsafe(10)

            # Generate answers for all 50 questions
            from questions_content import QUESTIONS_SKELETON
            import random

            dummy_answers = {}
            for q in QUESTIONS_SKELETON:
                # option_count is now in the skeleton
                cnt = q.get("option_count", 3)
                # Store random index 0 to cnt-1
                dummy_answers[str(q["id"])] = random.randint(0, cnt - 1)

            dummy = models.User(
                email=email,
                hashed_password=hash_password(pw),
                real_name=f"{name} Dummy",
                username=username,
                about_me=f"Hallo! Ich bin {name}, ein generierter Test-User. Ich mag Pizza und Code.",
                is_active=True,
                is_verified=True,
                is_guest=False,
                role="test",
                intent=random.choice(intents),
                answers=json.dumps(dummy_answers),
                created_at=datetime.utcnow(),
                is_visible_in_matches=True
            )
            db.add(dummy)
            created_dummies.append(f"{username} -> {pw}")

        db.commit()
        if created_dummies:
            logger.info("Dummy users created successfully. Credentials:")
            for d in created_dummies:
                logger.info(d)
                print(f"Dummy User: {d}") # Print for visibility
    except Exception as e:
        logger.error(f"Failed to create dummy users: {e}")
        db.rollback()