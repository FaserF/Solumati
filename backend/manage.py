import argparse
import os
import secrets
import sys

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.db import models


def reset_admin_password(username: str):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            print(f"Error: User '{username}' not found.")
            return

        if user.role != "admin":
            print(
                f"Warning: User '{username}' is not an admin (Role: {user.role}). Proceeding anyway..."
            )

        # Generate random password
        new_password = secrets.token_urlsafe(12)
        # Enforce complexity just in case (add symbol manually if needed, but urlsafe usually ok or mixed)
        # Actually random token might not satisfy strict policy if it lacks special chars
        # Let's simple append a special char to ensure it passes potential future validators logic
        new_password += "!"

        user.hashed_password = hash_password(new_password)
        db.commit()

        print(f"✅ Success! Password for '{username}' has been reset.")
        print(f"🔑 New Password: {new_password}")
        print("Please copy this password immediately. It will not be shown again.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Solumati Admin Management Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Command: reset-password
    reset_parser = subparsers.add_parser(
        "reset-password", help="Reset an admin's password"
    )
    reset_parser.add_argument("username", help="Username of the admin to reset")

    args = parser.parse_args()

    if args.command == "reset-password":
        reset_admin_password(args.username)
    else:
        parser.print_help()
