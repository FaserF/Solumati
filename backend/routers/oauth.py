from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from config import APP_BASE_URL
from utils import get_setting
from datetime import datetime
import logging

# FastAPI SSO
from fastapi_sso.sso.github import GithubSSO
from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.microsoft import MicrosoftSSO

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# --- Dynamic SSO Initializer ---
def get_provider_sso(provider: str, db: Session):
    config = get_setting(db, "oauth", schemas.OAuthConfig().dict())

    # Normalize to dict if needed (get_setting might return dict or object depending on implementation,
    # but here we pass default dict, so usually we get a dict back if it's stored as JSON)
    if not isinstance(config, dict):
        # Should not happen with get_setting utils usually returning dict/list
        pass

    # Extract provider config
    p_conf = config.get(provider, {})
    client_id = p_conf.get('client_id')
    client_secret = p_conf.get('client_secret')

    if not client_id or not client_secret:
        return None

    callback_url = f"{APP_BASE_URL}/api/auth/oauth/{provider}/callback"

    if provider == 'github':
        return GithubSSO(client_id, client_secret, callback_url)
    elif provider == 'google':
        return GoogleSSO(client_id, client_secret, callback_url)
    elif provider == 'microsoft':
        return MicrosoftSSO(client_id, client_secret, callback_url)
    return None

async def process_oauth_login(user_info, provider: str, db: Session):
    """Common logic for processing OAuth user info"""
    email = user_info.email
    if not email:
         raise HTTPException(400, "Provider did not return an email address.")

    # 1. Check if user exists by email
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user:
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
async def github_login(db: Session = Depends(get_db)):
    sso = get_provider_sso('github', db)
    if not sso: raise HTTPException(501, "GitHub auth not configured")
    return await sso.get_login_redirect()

@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('github', db)
    if not sso: raise HTTPException(501, "GitHub auth not configured")
    user_info = await sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "github", db)
    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Google ---
@router.get("/google/login")
async def google_login(db: Session = Depends(get_db)):
    sso = get_provider_sso('google', db)
    if not sso: raise HTTPException(501, "Google auth not configured")
    return await sso.get_login_redirect()

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('google', db)
    if not sso: raise HTTPException(501, "Google auth not configured")
    user_info = await sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "google", db)
    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Microsoft ---
@router.get("/microsoft/login")
async def microsoft_login(db: Session = Depends(get_db)):
    sso = get_provider_sso('microsoft', db)
    if not sso: raise HTTPException(501, "Microsoft auth not configured")
    return await sso.get_login_redirect()

@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('microsoft', db)
    if not sso: raise HTTPException(501, "Microsoft auth not configured")
    user_info = await sso.verify_and_process(request)
    user = await process_oauth_login(user_info, "microsoft", db)
    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")
