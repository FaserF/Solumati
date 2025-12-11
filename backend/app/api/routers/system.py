from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.services import i18n
from app.core.database import get_db
from app.services.utils import get_setting
from app.db import schemas
from app.core.config import TEST_MODE, CURRENT_VERSION

router = APIRouter()

@router.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    legal_config = schemas.LegalConfig(**get_setting(db, "legal", {}))
    raw_oauth = get_setting(db, "oauth", {})
    oauth_config = schemas.OAuthProviders(
        github=raw_oauth.get('github', {}).get('enabled', False),
        google=raw_oauth.get('google', {}).get('enabled', False),
        microsoft=raw_oauth.get('microsoft', {}).get('enabled', False)
    )
    maint_mode = get_setting(db, "maintenance_mode", False)
    support_conf = get_setting(db, "support_chat", {"enabled": False})

    # CAPTCHA public config (site key only, no secret)
    raw_captcha = get_setting(db, "captcha", {})
    captcha_config = schemas.CaptchaPublicConfig(
        enabled=raw_captcha.get('enabled', False),
        provider=raw_captcha.get('provider', 'cloudflare'),
        site_key=raw_captcha.get('site_key')
    )

    return {
        "registration_enabled": reg_config.enabled,
        "email_2fa_enabled": reg_config.email_2fa_enabled,
        "test_mode": TEST_MODE,
        "maintenance_mode": bool(maint_mode),
        "backend_version": CURRENT_VERSION,
        "legal": legal_config,
        "oauth_providers": oauth_config,
        "support_chat_enabled": support_conf.get("enabled", False),
        "support_email": support_conf.get("email_target") if support_conf.get("enabled", False) else None,
        "captcha": captcha_config
    }

@router.get("/public/legal", response_model=schemas.LegalConfig)
def get_public_legal(db: Session = Depends(get_db)):
    config = schemas.LegalConfig(**get_setting(db, "legal", {}))
    return config

@router.get('/api/i18n/{lang}')
async def get_i18n(lang: str):
    return {"lang": lang, "translations": i18n.get_translations(i18n.normalize_lang_code(lang))}

@router.get('/health')
async def health_check():
    return {"status": "ok"}

@router.get("/.well-known/assetlinks.json")
def get_assetlinks(db: Session = Depends(get_db)):
    """Serves the Digital Asset Links JSON for Android TWA verification."""
    # Fetch from System Settings
    links = get_setting(db, "assetlinks", [])
    return links