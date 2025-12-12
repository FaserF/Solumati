import logging
import secrets
import random
import json
import os
import asyncio
import httpx
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from app.db import models
from app.core.security import hash_password
from app.core.config import TEST_MODE

logger = logging.getLogger(__name__)

async def fetch_dummy_image(client: httpx.AsyncClient, username: str) -> str:
    """
    Fetches a random AI person image from thispersondoesnotexist.com
    and saves it to static/images/dummies/{username}.jpg
    Falls back to UI Avatars if AI generation fails.
    Returns the relative path for the DB.
    """
    save_dir = "static/images/dummies"
    os.makedirs(save_dir, exist_ok=True)
    filename = f"{username}.jpg"
    file_path = os.path.join(save_dir, filename)

    # Try AI-generated image first
    url = "https://thispersondoesnotexist.com/"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

    try:
        resp = await client.get(url, headers=headers, follow_redirects=True, timeout=15.0)
        if resp.status_code == 200:
            content_type = resp.headers.get("content-type", "")
            if "image" in content_type:
                with open(file_path, "wb") as f:
                    f.write(resp.content)
                logger.info(f"Downloaded AI profile pic for {username}")
                return f"/static/images/dummies/{filename}"
            else:
                logger.warning(f"Invalid content type for {username}: {content_type}")
        else:
            logger.warning(f"Failed to fetch AI image for {username}: Status {resp.status_code}")
    except Exception as e:
        logger.warning(f"Error fetching AI image for {username}: {e}")

    # Fallback: Use UI Avatars API
    try:
        fallback_url = f"https://ui-avatars.com/api/?name={username}&size=256&background=random&color=fff&bold=true&format=png"
        resp = await client.get(fallback_url, timeout=10.0)
        if resp.status_code == 200:
            png_filename = f"{username}.png"
            png_path = os.path.join(save_dir, png_filename)
            with open(png_path, "wb") as f:
                f.write(resp.content)
            logger.info(f"Downloaded fallback avatar for {username}")
            return f"/static/images/dummies/{png_filename}"
    except Exception as e:
        logger.error(f"Fallback avatar failed for {username}: {e}")

    return None

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
            "Hey! 🚀 I'm the Solumati Explorer, your sneak peek into a world where real vibes matter more than fast swipes.\n\n"
            "**Sign up to unlock the full experience:**\n"
            "✨ Chat with real people\n"
            "✨ Discover your true soulmate\n"
            "✨ Join a community that values YOU\n\n"
            "Don't just watch—be part of the story. Your match is waiting! ❤️"
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
            # Force update promotional fields always
            guest.about_me = promo_about
            guest.intent = promo_intent
            guest.real_name = "Guest Explorer"
            logger.info("Updated Guest User profile with promotional content.")

        db.commit()
        logger.info("Guest user ensured.")
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create or update guest user: {e}")

def ensure_support_user(db: Session):
    try:
        support = db.query(models.User).filter(models.User.id == 3).first()
        target_about = "We are Solumati. 🛠️\nQuestions? Bugs? Ideas?\n\nWe're here to make your experience smooth and awesome. Drop us a message, and we'll get back to you ASAP.\n\n*Your Team Solumati*"

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
                    about_me="System Status: **Operational** 🟢\n\nGuardian of the Codebase. Keeping the servers running and the vibes flowing.\nif (problem) { fix_it(); }",
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
            target_about = "System Status: **Operational** 🟢\n\nGuardian of the Codebase. Keeping the servers running and the vibes flowing.\nif (problem) { fix_it(); }"
            if admin.about_me != target_about:
                admin.about_me = target_about
                db.commit()
                logger.info("Updated Admin User description.")

        try:
            # Fix sequence to prevent UniqueViolation on restart if users > 10000 exist
            db.execute(text("SELECT setval('users_id_seq', GREATEST(10000, (SELECT MAX(id) FROM users)), true);"))
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
        from app.services.utils import get_setting, save_setting
        from app.db import models
        import json

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


def fix_dummy_user_roles(db: Session):
    """
    Ensures that all dummy users (identified by suffix ' Dummy' in real_name)
    have the role 'test'.
    """
    try:
        # Find users ending with ' Dummy' who do not have role 'test'
        # Also check for NULL roles just in case
        dummies = db.query(models.User).filter(
            models.User.real_name.like("% Dummy"),
            or_(models.User.role != "test", models.User.role == None)
        ).all()

        count = 0
        fixed_names = []
        for u in dummies:
            # Safety check: skip system users if they somehow match
            if u.id in [0, 1, 3]:
                continue

            u.role = "test"
            fixed_names.append(u.username)
            count += 1

        if count > 0:
            db.commit()
            logger.info(f"Fixed role for {count} dummy users: {', '.join(fixed_names)} -> Set to 'test'.")
        else:
            logger.debug("No dummy users needed role fixing.")

    except Exception as e:
        logger.error(f"Failed to fix dummy user roles: {e}")
        db.rollback()


async def generate_dummy_data(db: Session):
    """Generates 20 random dummy users if TEST_MODE is active and no test users exist."""
    if not TEST_MODE:
        return

    # Check if we already have test users (dummy data was generated before)
    existing_test_users = db.query(models.User).filter(models.User.role == 'test').count()
    if existing_test_users > 0:
        logger.info(f"TEST_MODE active but {existing_test_users} test users already exist, skipping dummy generation.")
        return

    logger.info("Generating 20 random dummy users for TEST_MODE with Archetypes...")

    try:
        from app.services.questions_content import QUESTIONS_SKELETON
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
        user_objects = []

        # Prepare HTTP Client for parallel fetching
        async with httpx.AsyncClient() as client:
            tasks = []

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

                # Create User Object (but don't add to session yet to avoid long transaction blocks if async fails??
                # Actually we need them for tasks. Let's just create metadata dicts first)

                user_data = {
                    "email": email,
                    "hashed_password": hashed,
                    "real_name": f"{fname} Dummy",
                    "username": username,
                    "about_me": f"I am a generated '{arch['name']}' type ({i+1}). I like {random.choice(['Pizza', 'Travel', 'Music', 'Coding'])}. What do you think about {random.choice(['Traveling', 'Arts', 'Modern Music', 'AI'])}.",
                    "is_active": True,
                    "is_verified": True,
                    "is_guest": False,
                    "role": "test",
                    "intent": arch["intent"],
                    "answers": json.dumps(user_answers),
                    "created_at": datetime.utcnow(),
                    "is_visible_in_matches": True
                }

                user_objects.append(user_data)
                created_dummies.append(f"{username} ({arch['name']}) -> {raw_pw}")

                # Schedule Image Fetch
                tasks.append(fetch_dummy_image(client, username))

            # Execute all image fetches in parallel
            logger.info("Fetching AI profile pictures...")
            image_paths = await asyncio.gather(*tasks)

            # Now insert into DB
            for idx, udata in enumerate(user_objects):
                # Assign image path if download was successful
                if image_paths[idx]:
                    udata["image_url"] = image_paths[idx]

                user = models.User(**udata)
                db.add(user)

        db.commit()

        sep = "=" * 60
        logger.info(f"\n{sep}\nGENERATED {len(created_dummies)} DUMMY USERS (Role: 'test')\n{sep}")
        for creds in created_dummies:
            print(f"Dummy: {creds}")
        print(sep)

    except Exception as e:
        logger.error(f"Failed to create dummy users: {e}")
        db.rollback()


async def ensure_showcase_dummies(db: Session):
    """
    Ensures a small set of 'Showcase' dummy users exist for Guest Mode (role='test').
    These are always created, even in production, to ensure Guests have something to see.
    """
    try:
        # Check if we already have enough test users
        existing_count = db.query(models.User).filter(models.User.role == 'test').count()
        if existing_count >= 5:
            logger.info(f"Showcase dummies exist ({existing_count}). Skipping generation.")
            return

        logger.info("Generating Showcase Dummies for Guest Mode...")
        from app.services.questions_content import QUESTIONS_SKELETON
        import random
        import secrets

        # Fixed set to be consistent
        showcase_users = [
            {"name": "Alice", "intent": "longterm", "desc": "Looking for something serious."},
            {"name": "Bob", "intent": "casual", "desc": "Just here to meet new people."},
            {"name": "Charlie", "intent": "speeddate", "desc": "Fast and furious!"},
            {"name": "Diana", "intent": "friendship", "desc": "New in town, looking for friends."},
            {"name": "Ethan", "intent": "longterm", "desc": "Ready to settle down."}
        ]

        async with httpx.AsyncClient() as client:
            tasks = []
            created_users = []

            for u_def in showcase_users:
                username = f"{u_def['name']}_Showcase"
                email = f"{username.lower()}@solumati.local"

                # Check if exists
                existing_user = db.query(models.User).filter(models.User.email == email).first()
                if existing_user:
     # Ensure they are active but HIDDEN (so only Guest/Admin see them via role check)
                     existing_user.is_active = True
                     existing_user.is_visible_in_matches = False
                     existing_user.role = "test" # Force role
                     db.add(existing_user) # Mark for update
                     continue

                raw_pw = secrets.token_urlsafe(8)
                hashed = hash_password(raw_pw)

                # Generate Random Answers
                user_answers = {}
                for q in QUESTIONS_SKELETON:
                    qid = str(q["id"])
                    opt_count = q.get("option_count", 4)
                    user_answers[qid] = random.randint(0, opt_count - 1)

                user_data = {
                    "email": email,
                    "hashed_password": hashed,
                    "real_name": f"{u_def['name']} (Demo)",
                    "username": username,
                    "about_me": f"{u_def['desc']}\n(This is a demo user for Guest Mode)",
                    "is_active": True,
                    "is_verified": True,
                    "is_guest": False,
                    "role": "test",
                    "intent": u_def["intent"],
                    "answers": json.dumps(user_answers),
                    "created_at": datetime.utcnow(),
                    "is_visible_in_matches": False # Hidden by default, visible only to Guest/Admin via role check
                }

                # Schedule Image Fetch
                tasks.append(fetch_dummy_image(client, username))
                created_users.append(user_data)

            if tasks:
                 logger.info(f"Fetching images for {len(tasks)} showcase users...")
                 image_paths = await asyncio.gather(*tasks)

                 for idx, udata in enumerate(created_users):
                     if image_paths[idx]:
                         udata["image_url"] = image_paths[idx]

                     user = models.User(**udata)
                     db.add(user)

            db.commit()
            logger.info("Showcase dummies created successfully.")

    except Exception as e:
        logger.error(f"Failed to ensure showcase dummies: {e}")
        db.rollback()
