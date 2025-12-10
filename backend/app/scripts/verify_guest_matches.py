import sys
import os

# Ensure we can import from backend root
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.db import models
from app.api.routers.users import get_matches
from sqlalchemy import or_

def verify_guest_matches():
    db = SessionLocal()
    try:
        # 1. Ensure a 'test' user exists
        test_user = db.query(models.User).filter(models.User.role == 'test').first()
        if not test_user:
            print("Creating dummy test user...")
            test_user = models.User(
                email="test_dummy@solumati.com",
                role="test",
                is_active=True,
                is_visible_in_matches=False, # Hidden!
                username="test_dummy",
                answers="{}",
                intent="longterm"
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)
        else:
            # Ensure it is hidden to test the logic properly
            test_user.is_visible_in_matches = False
            db.commit()

        print(f"Test User ID: {test_user.id}, Role: {test_user.role}, Visible: {test_user.is_visible_in_matches}")

        # 2. Run get_matches as Guest (id=0)
        try:
            matches = get_matches(user_id=0, db=db)
            print(f"Guest Matches Found: {len(matches)}")

            found_test_user = False
            for m in matches:
                if m.user_id == test_user.id:
                    found_test_user = True
                    print(f"SUCCESS: Found Test User in Guest Matches! Score: {m.score}")
                    if m.score >= 95:
                        print("SUCCESS: Score is boosted!")
                    else:
                        print(f"FAILURE: Score is NOT boosted (Score: {m.score})")

            if not found_test_user:
                print("FAILURE: Test user NOT found in Guest matches.")
                return False

            return True

        except Exception as e:
            print(f"Error running get_matches: {e}")
            return False

    finally:
        db.close()

if __name__ == "__main__":
    success = verify_guest_matches()
    sys.exit(0 if success else 1)
