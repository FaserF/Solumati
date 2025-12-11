import re
import hashlib
import httpx
import logging

logger = logging.getLogger(__name__)

def validate_password_complexity(password: str) -> None:
    """
    Validates password complexity rules:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*)
    """
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")

    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")

    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")

    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit.")

    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValueError("Password must contain at least one special character.")

def check_pwned_password(password: str) -> None:
    """
    Checks if the password has been leaked using Have I Been Pwned API (k-anonymity).
    Do NOT send the full password. Only the first 5 chars of SHA-1 hash.
    """
    try:
        sha1_password = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        prefix = sha1_password[:5]
        suffix = sha1_password[5:]

        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        headers = {
            "User-Agent": "Solumati-Password-Check"
        }

        # Use a short timeout to fail open if API is slow
        with httpx.Client(timeout=3.0) as client:
            response = client.get(url, headers=headers)

        if response.status_code != 200:
            logger.warning(f"HIBP API returned status {response.status_code}. Skipping leak check.")
            return

        # Response format: SUFFIX:COUNT
        hashes = (line.split(':') for line in response.text.splitlines())
        for h, count in hashes:
            if h == suffix:
                raise ValueError(f"This password has been exposed in a data breach (seen {count} times). Please choose a different one.")

    except httpx.RequestError as e:
        logger.warning(f"HIBP API Request failed: {e}. Skipping leak check.")
    except ValueError:
        raise # Re-raise security validation errors
    except Exception as e:
        logger.error(f"Unexpected error in password leak check: {e}")
        # Fail open: ensure user can still register if our check fails technically
