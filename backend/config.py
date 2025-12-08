import os
import json
import logging
from logging_config import logger

# --- CONFIGURATION ---
TEST_MODE = os.getenv("TEST_MODE", "false").lower() in ("true", "1", "yes")
APP_BASE_URL = os.getenv("APP_BASE_URL", "http://localhost:3000")

# --- OAUTH CONFIG ---
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
MICROSOFT_CLIENT_ID = os.getenv("MICROSOFT_CLIENT_ID")
MICROSOFT_CLIENT_SECRET = os.getenv("MICROSOFT_CLIENT_SECRET")

def get_app_version():
    """Reads the version from the frontend package.json to keep backend/frontend in sync."""
    try:
        pkg_path = "/app/frontend_package.json"
        if os.path.exists(pkg_path):
            with open(pkg_path, 'r') as f:
                data = json.load(f)
                version = data.get('version')
                if version:
                    logger.info(f"Version synced from package.json: {version}")
                    return version
    except Exception as e:
        logger.warning(f"Could not read version from package.json: {e}")
    return "0.0.0"

# Independent Backend Version (can be overriden by env or file)
def get_backend_version():
    return os.getenv("BACKEND_VERSION", "2025.12.0-dev")

FRONTEND_VERSION = get_app_version()
BACKEND_VERSION = get_backend_version()
# Compatibility alias if needed, or just let main.py use BACKEND_VERSION
CURRENT_VERSION = BACKEND_VERSION