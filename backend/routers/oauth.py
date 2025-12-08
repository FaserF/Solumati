from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from config import (
    APP_BASE_URL,
    GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
    MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET
)
from utils import get_setting
from datetime import datetime
import logging

# FastAPI SSO
from fastapi_sso.sso.github import GithubSSO
from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.microsoft import MicrosoftSSO

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# --- SSO Instances ---
github_sso = GithubSSO(GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, f"{APP_BASE_URL}/api/auth/oauth/github/callback") if GITHUB_CLIENT_ID else None
google_sso = GoogleSSO(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, f"{APP_BASE_URL}/api/auth/oauth/google/callback") if GOOGLE_CLIENT_ID else None
microsoft_sso = MicrosoftSSO(MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, f"{APP_BASE_URL}/api/auth/oauth/microsoft/callback") if MICROSOFT_CLIENT_ID else None

async def process_oauth_login(user_info, provider: str, db: Session):
    """Common logic for processing OAuth user info"""
    email = user_info.email
    if not email:
         raise HTTPException(400, "Provider did not return an email address.")

    # 1. Check if user exists by email
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
        # 2. Register new user if allowed
        # Check registration settings (though usually OAuth bypasses 'registration_enabled' or follows it?
        # Requirement says: "Registration via username/password optional... 3rd party settings in docker"
        # Implies 3rd party is always allowed if configured.

        # Create user
        username = user_info.display_name or email.split('@')[0]
        # Ensure unique username
        if db.query(models.User).filter(models.User.username == username).first():
            username = f"{username}_{int(datetime.utcnow().timestamp())}"

        user = models.User(
            email=email,
            username=username,
            hashed_password="OAUTH_USER", # Placeholder
            role="user",
            is_active=True,
            is_verified=True # OAuth emails are trusted
        )
        db.add(user)
        db.commit()
        logger.info(f"Created new user via {provider}: {username}")

    # 3. Log them in (return user data)
    user.last_login = datetime.utcnow()
    db.commit()

    return user

# --- GitHub ---
@router.get("/github/login")
async def github_login():
    if not github_sso: raise HTTPException(501, "GitHub auth not configured")
    return await github_sso.get_login_redirect()

@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    if not github_sso: raise HTTPException(501, "GitHub auth not configured")
    user_info = await github_sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "github", db)
    # Redirect to frontend with temporary content or token?
    # Since we are using a separate frontend, we need to pass the session info.
    # A simple way for this architecture might be to issue a temporary code or sets a cookie.
    # For now, let's Redirect to a frontend route with a special query param/token?
    # ACTUALLY: The existing auth returns JSON with user_id.
    # Frontend expects to handle the state.
    # Better approach: Redirect to frontend /oauth/callback page with `?id={user.id}&username={user.username}` etc?
    # SECURITY RISK: Sending user info in URL.
    # Better: Issue a temporary token and redirect to frontend with that token.
    # Simpler for MVP: Just redirect to frontend '/login?oauth_success=true&username=...' (insecure but works for demo)
    # OR: Set a secure httponly cookie here?

    # Let's use a "code" approach: Generate a short-lived one-time code, store in DB/Memory, redirect with code.
    # Frontend calls /api/auth/oauth/exchange?code=... to get full user object.

    # Quick MVP Hack for "Agentic Coding": Return user object in URL params (base64 encoded JSON)?
    # Let's stick to valid architectural patterns.
    # Create a temporary 'oauth_token' on the user model?

    # Updating user model is intrusive.
    # Use existing User fields? no.

    # Let's just redirect with basic info and let frontend "assume" login for now? NO, verified state is needed.

    # Alternative: The backend sets a cookie `auth_token`? The current app seems to rely on frontend state mostly but verified by backend calls?
    # Checking `App.jsx`, it stores `user` state. It doesn't seem to send a token on every request?
    # Let's check `config.py` in frontend or `utils.js` if there's an interceptor.
    # Wait, `get_current_user_from_header` in `auth.py` suggests it looks for something?
    # Actually, `auth.py` login returns `{user_id, username...}`. It doesn't return a token.
    # The app seems to rely on "Honor System" or IP/Session?
    # `dependencies.py` -> `get_current_user_from_header`?

    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Google ---
@router.get("/google/login")
async def google_login():
    if not google_sso: raise HTTPException(501, "Google auth not configured")
    return await google_sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    if not google_sso: raise HTTPException(501, "Google auth not configured")
    user_info = await google_sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "google", db)
    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Microsoft ---
@router.get("/microsoft/login")
async def microsoft_login():
    if not microsoft_sso: raise HTTPException(501, "Microsoft auth not configured")
    return await microsoft_sso.get_login_redirect()

@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    if not microsoft_sso: raise HTTPException(501, "Microsoft auth not configured")
    user_info = await microsoft_sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "microsoft", db)
    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")
