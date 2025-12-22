"""
Settings Service
Centralized, typed access to system settings with caching.
"""

import json
import logging
from functools import lru_cache
from typing import Any, Dict, Optional, Type, TypeVar

from app.db import models, schemas
from pydantic import BaseModel
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# In-memory cache for settings (simple implementation)
_settings_cache: Dict[str, Dict[str, Any]] = {}


class SettingsService:
    """
    Provides typed, cached access to system settings.
    Single Responsibility: Settings CRUD operations.
    """

    @staticmethod
    def get(db: Session, key: str, default: Optional[T] = None) -> Dict[str, Any]:
        """
        Get a setting by key. Returns default if not found.

        Args:
            db: Database session
            key: Setting key (e.g., "mail", "registration", "oauth")
            default: Default value if setting doesn't exist

        Returns:
            Setting value as dictionary
        """
        # Check cache first
        if key in _settings_cache:
            return _settings_cache[key]

        try:
            record = (
                db.query(models.SystemSetting)
                .filter(models.SystemSetting.key == key)
                .first()
            )
            if record:
                value = (
                    json.loads(record.value)
                    if isinstance(record.value, str)
                    else record.value
                )
                _settings_cache[key] = value
                return value
        except Exception as e:
            logger.error(f"Error loading setting '{key}': {e}")

        # Return default as dict
        if default is None:
            return {}
        if isinstance(default, BaseModel):
            return default.model_dump()
        if isinstance(default, dict):
            return default
        return {}

    @staticmethod
    def get_typed(db: Session, key: str, schema: Type[T]) -> T:
        """
        Get a setting and validate it against a Pydantic schema.

        Args:
            db: Database session
            key: Setting key
            schema: Pydantic model class for validation

        Returns:
            Validated Pydantic model instance
        """
        data = SettingsService.get(db, key, schema())
        return schema(**data)

    @staticmethod
    def save(db: Session, key: str, value: Dict[str, Any]) -> bool:
        """
        Save a setting. Creates or updates as needed.

        Args:
            db: Database session
            key: Setting key
            value: Setting value as dictionary

        Returns:
            True if successful
        """
        try:
            record = (
                db.query(models.SystemSetting)
                .filter(models.SystemSetting.key == key)
                .first()
            )
            value_json = json.dumps(value)

            if record:
                record.value = value_json
            else:
                record = models.SystemSetting(key=key, value=value_json)
                db.add(record)

            db.commit()

            # Update cache
            _settings_cache[key] = value
            return True

        except Exception as e:
            logger.error(f"Error saving setting '{key}': {e}")
            db.rollback()
            return False

    @staticmethod
    def invalidate_cache(key: Optional[str] = None) -> None:
        """
        Invalidate settings cache.

        Args:
            key: Specific key to invalidate, or None for all
        """
        if key:
            _settings_cache.pop(key, None)
        else:
            _settings_cache.clear()

    # --- Convenience Methods for Common Settings ---

    @staticmethod
    def get_mail_config(db: Session) -> schemas.MailConfig:
        """Get mail configuration."""
        return SettingsService.get_typed(db, "mail", schemas.MailConfig)

    @staticmethod
    def get_registration_config(db: Session) -> schemas.RegistrationConfig:
        """Get registration configuration."""
        return SettingsService.get_typed(db, "registration", schemas.RegistrationConfig)

    @staticmethod
    def get_oauth_config(db: Session) -> schemas.OAuthConfig:
        """Get OAuth configuration."""
        return SettingsService.get_typed(db, "oauth", schemas.OAuthConfig)

    @staticmethod
    def get_captcha_config(db: Session) -> schemas.CaptchaConfig:
        """Get CAPTCHA configuration."""
        return SettingsService.get_typed(db, "captcha", schemas.CaptchaConfig)

    @staticmethod
    def get_legal_config(db: Session) -> schemas.LegalConfig:
        """Get legal configuration."""
        return SettingsService.get_typed(db, "legal", schemas.LegalConfig)

    @staticmethod
    def get_support_chat_config(db: Session) -> schemas.SupportChatConfig:
        """Get support chat configuration."""
        return SettingsService.get_typed(db, "support_chat", schemas.SupportChatConfig)

    @staticmethod
    def is_maintenance_mode(db: Session) -> bool:
        """Check if maintenance mode is enabled."""
        reg = SettingsService.get(db, "registration", {})
        return reg.get("maintenance_mode", False)

    @staticmethod
    def is_mail_enabled(db: Session) -> bool:
        """Check if mail service is enabled and configured."""
        mail = SettingsService.get_mail_config(db)
        return mail.enabled and bool(mail.smtp_host)


# Singleton-like access
settings_service = SettingsService()
