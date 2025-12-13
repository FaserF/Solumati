import logging

import bcrypt

logger = logging.getLogger(__name__)


# --- SECURITY HELPER FUNCTIONS ---
def hash_password(password: str) -> str:
    """Hashes a password using bcrypt with a generated salt."""
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against the stored bcrypt hash."""
    try:
        pwd_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(pwd_bytes, hash_bytes)
    except ValueError:
        return False
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False
