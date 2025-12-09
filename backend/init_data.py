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

        # Define promotional data
        promo_about = (
            "👋 Hey, welcome to the Solumati Universe!\n\n"
            "I'm your virtual guide, giving you a sneak peek of what's possible.\n"
            "Here, real values and personality count, not just fast swipes. 🧠❤️\n\n"
            "🚀 Ready for the Real Thing?\n"
            "Sign up now to unleash full potential:\n"
            "► Chat with real humans\n"
            "► Find someone who truly gets you\n"
            "► Join our community\n\n"
            "Your perfect match is waiting! What are you waiting for? ✨"
        )
        promo_intent = "Solumati Explorer 🌟"

        if not guest:
            logger.info("Creating Guest User (ID 0)...")
            guest = models.User(
                id=0, email="guest@solumati.local",
                hashed_password=hash_password("NOPASSWORD"),
                real_name="Guest Explorer", username="Guest",
                about_me=promo_about,
                is_active=True, is_verified=True, is_guest=True,
                intent=promo_intent,
                answers=json.dumps({str(i): 1 for i in range(1, 51)}),
                created_at=datetime.utcnow(), role='guest',
                is_visible_in_matches=False
            )
            db.add(guest)
        else:
            # Force update promotional fields
            if guest.about_me != promo_about or guest.intent != promo_intent or guest.real_name != "Guest Explorer":
                guest.about_me = promo_about
                guest.intent = promo_intent
                guest.real_name = "Guest Explorer"
                # guest.username = "Guest" # Keep username stable if possible, or update? User said "Guest" header.
                logger.info("Updated Guest User profile with promotional content.")

        db.commit()
        logger.info("Guest user ensured.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create or update guest user: {e}")

def ensure_support_user(db: Session):
    try:
        support = db.query(models.User).filter(models.User.id == 3).first()
        target_about = "Your direct line to the Solumati Team. 🛠️ We've got your back!"

        if not support:
            logger.info("Creating Support User (ID 3)...")
            support = models.User(
                id=3, email="support@solumati.local",
                hashed_password=hash_password(secrets.token_urlsafe(16)),
                real_name="Support", username="Support",
                about_me=target_about,
                is_active=True, is_verified=True, is_guest=False, intent="system",
                answers=json.dumps({}),
                created_at=datetime.utcnow(), role='moderator',
                is_visible_in_matches=False
            )
            db.add(support)
            db.commit()
            logger.info("Support user created.")
        else:
            if support.about_me != target_about:
                support.about_me = target_about
                db.commit()
                logger.info("Updated Support User description.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create Support user: {e}")

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
                    about_me="System-Status: Online. 🟢 Der Wächter über Bits und Bytes.",
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

        else:
            # Admin exists, ensure description is up to date
            target_about = "System Status: Online. 🟢 The Guardian of Bits and Bytes."
            if admin.about_me != target_about:
                admin.about_me = target_about
                db.commit()
                logger.info("Updated Admin User description.")

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
    """Generates 20 random dummy users if TEST_MODE is active and database is nearly empty."""
    if not TEST_MODE:
        return

    # Check if we already have enough users (e.g. > 5) to skip
    if db.query(models.User).count() > 5:
        logger.info(f"TEST_MODE active but data exists, skipping dummy generation.")
        return

    logger.info("Generating 20 random dummy users for TEST_MODE with Archetypes...")

    try:
        from questions_content import QUESTIONS_SKELETON
        import random
        import secrets

        # 1. Define Archetypes for variation
        archetypes = [
            {"name": "Soulmate", "base_diff": 0.05, "intent": "casual"},
            {"name": "Bestie", "base_diff": 0.2, "intent": "friendship"},
            {"name": "Opposite", "base_diff": 0.9, "intent": "longterm"},
            {"name": "Wildcard", "base_diff": -1, "intent": "speeddate"},
        ]

        # 2. Reference Answers (Guest typically has all 1s)
        guest_answers = {str(i): 1 for i in range(1, 51)}

        first_names = [
            "Fabian", "Marina", "Samuel", "Kai", "Adrian", "Maximilian", "Michelle", "Hannah",
            "Janina", "Lena", "David", "Barbara", "Richard", "Florian", "Andreas", "Jessica",
            "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
            "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"
        ]

        created_dummies = []

        for i in range(20):
            # Select Random Archetype for this user
            arch = random.choice(archetypes)

            # Name & Auth
            fname = random.choice(first_names)
            # Ensure unique username
            username = f"{fname}_{secrets.token_hex(2)}"
            email = f"{username.lower()}@solumati.local"

            raw_pw = secrets.token_urlsafe(8)
            hashed = hash_password(raw_pw)

            # Generate Answers based on Archetype
            user_answers = {}
            for q in QUESTIONS_SKELETON:
                qid = str(q["id"])
                opt_count = q.get("option_count", 4)
                guest_ans = guest_answers.get(qid, 1)

                if arch["base_diff"] == -1:
                    # Random
                    ans = random.randint(0, opt_count - 1)
                else:
                    # Calculate based on difficulty/diff
                    if random.random() > arch["base_diff"]:
                        ans = guest_ans # Match Guest
                    else:
                        # Pick different option
                        options = [x for x in range(opt_count) if x != guest_ans]
                        ans = random.choice(options) if options else guest_ans

                user_answers[qid] = ans

            # Create User
            user = models.User(
                email=email,
                hashed_password=hashed,
                real_name=f"{fname} Dummy",
                username=username,
                about_me=f"I am a generated '{arch['name']}' type ({i+1}). I like {random.choice(['Pizza', 'Travel', 'Music', 'Coding'])}. What do you think about {random.choice(['Traveling', 'Arts', 'Modern Music', 'AI'])}.",
                is_active=True,
                is_verified=True,
                is_guest=False,
                role="test",
                intent=arch["intent"],
                answers=json.dumps(user_answers),
                created_at=datetime.utcnow(),
                is_visible_in_matches=True
            )
            db.add(user)
            created_dummies.append(f"{username} ({arch['name']}) -> {raw_pw}")

        db.commit()

        sep = "=" * 60
        logger.info(f"\n{sep}\nGENERATED {len(created_dummies)} DUMMY USERS (Role: 'test')\n{sep}")
        for creds in created_dummies:
            print(f"Dummy: {creds}")
        print(sep)

    except Exception as e:
        logger.error(f"Failed to create dummy users: {e}")
        db.rollback()
