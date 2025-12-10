from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.db import models, schemas
from app.core.config import APP_BASE_URL
from app.services.utils import get_setting
from app.core.security import hash_password
from app.api.dependencies import get_current_user_from_header
from datetime import datetime
import logging
import secrets
from typing import List, Optional

# FastAPI SSO
from fastapi_sso.sso.github import GithubSSO
from fastapi_sso.sso.google import GoogleSSO
from fastapi_sso.sso.microsoft import MicrosoftSSO

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/oauth", tags=["OAuth"])

# --- Helper ---
def generate_oauth_password():
    # As requested: GithubUser + RepoName + 10 random chars
    # Defaults inferred from user context
    repo_user = "FaserF"
    repo_name = "Solumati"
    suffix = secrets.token_urlsafe(10)
    return f"{repo_user}{repo_name}{suffix}"

# --- Dynamic SSO Initializer ---
def get_provider_sso(provider: str, db: Session):
    config = get_setting(db, "oauth", schemas.OAuthConfig().dict())

    if not isinstance(config, dict):
        pass

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

async def process_oauth_login(user_info, provider: str, db: Session, link_user_id: Optional[int] = None):
    """
    Common logic for processing OAuth user info.
    If link_user_id is provided, we try to LINK the account to that user.
    Otherwise we try to LOGIN (or register/migrate).
    """
    email = user_info.email
    provider_uid = str(user_info.id) if user_info.id else email

    if not email:
         raise HTTPException(400, "Provider did not return an email address.")

    # --- Mode: LINKING ---
    if link_user_id:
        target_user = db.query(models.User).filter(models.User.id == link_user_id).first()
        if not target_user:
            logger.warning(f"OAuth Link attempt for unknown user {link_user_id}")
            raise HTTPException(404, "Target user not found")

        # Check if already linked to SOMEONE ELSE
        existing_link = db.query(models.LinkedAccount).filter(
            models.LinkedAccount.provider == provider,
            models.LinkedAccount.provider_user_id == provider_uid
        ).first()

        if existing_link:
            if existing_link.user_id == link_user_id:
                return target_user # Already linked to me
            else:
                raise HTTPException(400, f"This {provider} account is already linked to another user.")

        # Create Link
        new_link = models.LinkedAccount(
            user_id=link_user_id,
            provider=provider,
            provider_user_id=provider_uid,
            email=email
        )
        db.add(new_link)
        db.commit()
        logger.info(f"Linked {provider} account ({email}) to User {link_user_id}")
        return target_user

    # --- Mode: LOGIN / REGISTER ---

    # 1. Check Linked Accounts
    linked = db.query(models.LinkedAccount).filter(
        models.LinkedAccount.provider == provider,
        models.LinkedAccount.provider_user_id == provider_uid
    ).first()

    if linked:
        user = db.query(models.User).filter(models.User.id == linked.user_id).first()
        if user:
            user.last_login = datetime.utcnow()
            db.commit()
            return user
        else:
            db.delete(linked)
            db.commit()

    # 2. Check Legacy Email Match (Migration)
    user = db.query(models.User).filter(models.User.email == email).first()

    if user:
        # Create Link for future
        new_link = models.LinkedAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_uid,
            email=email
        )
        db.add(new_link)
        db.commit()
        logger.info(f"Migrated legacy OAuth user {user.username} (ID {user.id}) to LinkedAccount {provider}")

        user.last_login = datetime.utcnow()
        db.commit()
        return user

    # 3. Create New User
    username = user_info.display_name or email.split('@')[0]
    if db.query(models.User).filter(models.User.username == username).first():
        username = f"{username}_{int(datetime.utcnow().timestamp())}"

    # Custom Password Generation
    raw_pw = generate_oauth_password()
    hashed_pw = hash_password(raw_pw)

    user = models.User(
        email=email,
        username=username,
        hashed_password=hashed_pw,
        role="user",
        is_active=True,
        is_verified=True # OAuth emails are trusted
    )
    db.add(user)
    db.commit()
    db.refresh(user) # Get ID

    # Create Link
    new_link = models.LinkedAccount(
        user_id=user.id,
        provider=provider,
        provider_user_id=provider_uid,
        email=email
    )
    db.add(new_link)
    db.commit()

    logger.info(f"Created new user via {provider}: {username}")
    return user

# --- Management Endpoints ---

@router.get("/connections", response_model=List[schemas.LinkedAccountDisplay])
def get_connections(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """List all Oauth connections for the current user."""
    return user.linked_accounts

@router.delete("/connections/{provider}")
def delete_connection(provider: str, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Unlink a provider."""
    link = db.query(models.LinkedAccount).filter(
        models.LinkedAccount.user_id == user.id,
        models.LinkedAccount.provider == provider
    ).first()

    if not link:
        raise HTTPException(404, "Connection not found")

    db.delete(link)
    db.commit()
    return {"status": "unlinked"}

# --- GitHub ---
@router.get("/github/login")
async def github_login(state: Optional[str] = None, db: Session = Depends(get_db)):
    sso = get_provider_sso('github', db)
    if not sso: raise HTTPException(501, "GitHub auth not configured")
    # Pass state (which might contain 'link:USER_ID')
    return await sso.get_login_redirect(state=state)

@router.get("/github/callback")
async def github_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('github', db)
    if not sso: raise HTTPException(501, "GitHub auth not configured")

    user_info = await sso.verify_and_process(request)

    # Extract Logic for Linking
    state = request.query_params.get("state")
    link_user_id = None
    if state and state.startswith("link:"):
        try:
             link_user_id = int(state.split(":")[1])
        except:
             pass

    user = await process_oauth_login(user_info, "github", db, link_user_id)

    # If linking, redirect back to settings
    if link_user_id:
        return RedirectResponse(f"{APP_BASE_URL}/settings?tab=account")

    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Google ---
@router.get("/google/login")
async def google_login(state: Optional[str] = None, db: Session = Depends(get_db)):
    sso = get_provider_sso('google', db)
    if not sso: raise HTTPException(501, "Google auth not configured")
    return await sso.get_login_redirect(state=state)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('google', db)
    if not sso: raise HTTPException(501, "Google auth not configured")

    user_info = await sso.verify_and_process(request)

    state = request.query_params.get("state")
    link_user_id = None
    if state and state.startswith("link:"):
        try:
             link_user_id = int(state.split(":")[1])
        except:
             pass

    user = await process_oauth_login(user_info, "google", db, link_user_id)

    if link_user_id:
        return RedirectResponse(f"{APP_BASE_URL}/settings?tab=account")

    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")

# --- Microsoft ---
@router.get("/microsoft/login")
async def microsoft_login(state: Optional[str] = None, db: Session = Depends(get_db)):
    sso = get_provider_sso('microsoft', db)
    if not sso: raise HTTPException(501, "Microsoft auth not configured")
    return await sso.get_login_redirect(state=state)

@router.get("/microsoft/callback")
async def microsoft_callback(request: Request, db: Session = Depends(get_db)):
    sso = get_provider_sso('microsoft', db)
    if not sso: raise HTTPException(501, "Microsoft auth not configured")

    user_info = await sso.verify_and_process(request)

    state = request.query_params.get("state")
    link_user_id = None
    if state and state.startswith("link:"):
        try:
             link_user_id = int(state.split(":")[1])
        except:
             pass

    user = await process_oauth_login(user_info, "microsoft", db, link_user_id)

    if link_user_id:
        return RedirectResponse(f"{APP_BASE_URL}/settings?tab=account")

    return RedirectResponse(f"{APP_BASE_URL}/login?oauth_user={user.username}&oauth_id={user.id}&oauth_role={user.role}")
