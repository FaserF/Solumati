from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import i18n
from database import get_db
from utils import get_setting
import schemas
from config import TEST_MODE

router = APIRouter()

@router.get("/public-config", response_model=schemas.PublicConfig)
def get_public_config(db: Session = Depends(get_db)):
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    return {
        "registration_enabled": reg_config.enabled,
        "email_2fa_enabled": reg_config.email_2fa_enabled,
        "test_mode": TEST_MODE
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