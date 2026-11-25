from datetime import datetime
from typing import Any

from email_validator import EmailNotValidError, validate_email
from pydantic import BaseModel, EmailStr, field_validator


class UserBase(BaseModel):
    email: str
    intent: str | None = None
    real_name: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v: str) -> str:
        if v.endswith("@solumati.local"):
            return v
        try:
            valid = validate_email(v, check_deliverability=False)
            return valid.normalized
        except EmailNotValidError as e:
            raise ValueError(str(e))


class UserCreate(UserBase):
    password: str
    answers: dict[str, int] | list[int] | None = {}
    captcha_token: str | None = None


class UserLogin(BaseModel):
    login: str
    password: str
    captcha_token: str | None = None


class UserDisplay(UserBase):
    id: int
    username: str
    about_me: str | None = None
    image_url: str | None = None
    is_guest: bool
    is_active: bool
    is_verified: bool
    is_visible_in_matches: bool = True
    role: str
    created_at: datetime | None = None
    last_login: datetime | None = None
    deactivation_reason: str | None = None
    ban_reason_text: str | None = None
    banned_until: datetime | None = None
    two_factor_method: str | None = "none"

    # 2FA Status
    has_totp: bool = False
    has_passkeys: bool = False

    # New fields
    app_settings: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email_address(cls, v: str) -> str:
        # In Admin Display, we should not crash if email is invalid in DB.
        # Just return it as is.
        return v

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    about_me: str | None = None
    intent: str | None = None
    answers: dict[str, int] | list[int] | None = None


class UserAdminUpdate(BaseModel):
    username: str | None = None
    email: EmailStr | None = None
    password: str | None = None
    is_verified: bool | None = None
    is_visible_in_matches: bool | None = None
    two_factor_method: str | None = None
    role: str | None = None


class LinkedAccountDisplay(BaseModel):
    provider: str
    email: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class UserCreateAdmin(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"


class UserSettingsUpdate(BaseModel):
    notifications_enabled: bool | None = None
    theme: str | None = None
    push_subscription: dict[str, Any] | None = None
    email_notifications: dict[str, bool] | None = (
        None  # e.g., {"login_alerts": true, "security_alerts": true}
    )


class MatchResult(BaseModel):
    user_id: int
    username: str
    image_url: str | None = None
    about_me: str | None = None
    score: float
    match_details: list[str] = []


class AdminPunishAction(BaseModel):
    action: str
    reason_type: str | None = "AdminDeactivation"
    custom_reason: str | None = None
    duration_hours: int | None = None


class MailConfig(BaseModel):
    enabled: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_ssl: bool = False
    smtp_tls: bool = True
    sender_name: str | None = "Solumati"
    from_email: str | None = None


class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "system"
    link: str | None = None


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationDisplay(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class PushSubscription(BaseModel):
    endpoint: str
    keys: dict[str, str]


class RegistrationConfig(BaseModel):
    enabled: bool = True
    require_verification: bool = False
    maintenance_mode: bool = False
    email_2fa_enabled: bool = False
    server_domain: str | None = None
    allowed_domains: str | None = None
    blocked_domains: str | None = None
    allow_password_registration: bool = True


class LegalConfig(BaseModel):
    enabled_imprint: bool = True
    enabled_privacy: bool = True
    company_name: str = ""
    ceo_name: str = ""
    address_street: str = ""
    address_zip_city: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    register_court: str = ""
    register_number: str = ""
    vat_id: str = ""


# --- OAuth Dynamic Config ---


class OAuthProviderConfig(BaseModel):
    enabled: bool = False
    client_id: str | None = ""
    client_secret: str | None = ""


class OAuthConfig(BaseModel):
    github: OAuthProviderConfig = OAuthProviderConfig()
    google: OAuthProviderConfig = OAuthProviderConfig()
    microsoft: OAuthProviderConfig = OAuthProviderConfig()


class OAuthProviders(BaseModel):
    github: bool = False
    google: bool = False
    microsoft: bool = False


class SupportChatConfig(BaseModel):
    enabled: bool = False
    email_target: str | None = ""


class SupportPageConfig(BaseModel):
    enabled: bool = True
    contact_info: str | None = ""


class RegistrationNotificationConfig(BaseModel):
    enabled: bool = False
    email_target: str | None = ""


class CaptchaConfig(BaseModel):
    enabled: bool = False
    provider: str = "cloudflare"  # cloudflare, google, hcaptcha
    site_key: str | None = None
    secret_key: str | None = None
    failed_attempts_threshold: int = 5
    lockout_minutes: int = 10


class CaptchaPublicConfig(BaseModel):
    enabled: bool = False
    provider: str = "cloudflare"
    site_key: str | None = None


class PublicConfig(BaseModel):
    registration_enabled: bool
    email_2fa_enabled: bool
    test_mode: bool
    maintenance_mode: bool
    backend_version: str
    legal: LegalConfig
    oauth_providers: OAuthProviders
    allow_password_registration: bool | None = True
    support_chat_enabled: bool = False
    support_page: SupportPageConfig = SupportPageConfig()
    support_email: str | None = None
    marketing_enabled: bool = False
    mail_enabled: bool = False
    captcha: CaptchaPublicConfig = CaptchaPublicConfig()


class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig
    legal: LegalConfig
    oauth: OAuthConfig = OAuthConfig()
    support_chat: SupportChatConfig = SupportChatConfig()
    support_page: SupportPageConfig = SupportPageConfig()
    registration_notification: RegistrationNotificationConfig = (
        RegistrationNotificationConfig()
    )
    captcha: CaptchaConfig = CaptchaConfig()
    assetlinks: list[dict[str, Any]] = []
    maintenance_mode: bool = False
    update_channel: str = "stable"  # stable, beta, alpha


class SystemDiagnostics(BaseModel):
    current_version: str
    latest_version: str
    update_available: bool
    beta_update_available: bool | None = False
    latest_beta_version: str | None = None
    internet_connected: bool
    disk_total_gb: float
    disk_free_gb: float
    disk_percent: float
    database_connected: bool
    api_reachable: bool


class ChangelogRelease(BaseModel):
    tag_name: str
    name: str | None
    body: str | None
    published_at: str | None
    html_url: str | None


# --- 2FA SCHEMAS ---


class TotpSetupResponse(BaseModel):
    secret: str
    uri: str


class TotpVerifyRequest(BaseModel):
    token: str


class TwoFactorAuthRequest(BaseModel):
    user_id: int
    code: str | None = None


class TwoFactorLoginResponse(BaseModel):
    require_2fa: bool
    user_id: int | None = None
    method: str | None = None
    available_methods: list[str] = []
    username: str | None = None
    role: str | None = None
    is_guest: bool | None = None
    is_admin: bool | None = None
    is_profile_complete: bool | None = None
    app_settings: str | None = None
    about_me: str | None = None
    image_url: str | None = None
    intent: str | None = None


# WebAuthn DTOs
class WebAuthnRegistrationOptions(BaseModel):
    options: dict[str, Any]


class WebAuthnRegistrationResponse(BaseModel):
    credential: dict[str, Any]


class WebAuthnAuthOptions(BaseModel):
    options: dict[str, Any]


class WebAuthnAuthResponse(BaseModel):
    credential: dict[str, Any]
    user_id: int


class ReportCreate(BaseModel):
    reason: str


class ReportDisplay(BaseModel):
    id: int
    reporter_username: str
    reported_username: str
    reason: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class UserPublicDisplay(BaseModel):
    id: int
    username: str
    about_me: str | None = None
    image_url: str | None = None
    intent: str | None = None
    answers: dict[str, Any] | list[int] | str | None = None

    class Config:
        from_attributes = True
