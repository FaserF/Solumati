from pydantic import BaseModel, field_validator, EmailStr
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
from app.core.config import PROJECT_NAME

class UserBase(BaseModel):
    email: str
    intent: Optional[str] = None
    real_name: Optional[str] = None

    @field_validator('email')
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
    answers: Optional[Union[Dict[str, int], List[int]]] = {}
    captcha_token: Optional[str] = None

class UserLogin(BaseModel):
    login: str
    password: str
    captcha_token: Optional[str] = None

class UserDisplay(UserBase):
    id: int
    username: str
    about_me: Optional[str] = None
    image_url: Optional[str] = None
    is_guest: bool
    is_active: bool
    is_verified: bool
    is_visible_in_matches: bool = True
    role: str
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    deactivation_reason: Optional[str] = None
    ban_reason_text: Optional[str] = None
    banned_until: Optional[datetime] = None
    two_factor_method: Optional[str] = 'none'

    # 2FA Status
    has_totp: bool = False
    has_passkeys: bool = False

    # New fields
    app_settings: Optional[str] = None


    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    about_me: Optional[str] = None
    intent: Optional[str] = None
    answers: Optional[Union[Dict[str, int], List[int]]] = None

class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_verified: Optional[bool] = None
    is_visible_in_matches: Optional[bool] = None
    two_factor_method: Optional[str] = None
    role: Optional[str] = None

class LinkedAccountDisplay(BaseModel):
    provider: str
    email: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class UserCreateAdmin(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"

class UserSettingsUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    theme: Optional[str] = None
    push_subscription: Optional[Dict[str, Any]] = None
    email_notifications: Optional[Dict[str, bool]] = None  # e.g., {"login_alerts": true, "security_alerts": true}

class MatchResult(BaseModel):
    user_id: int
    username: str
    image_url: Optional[str] = None
    about_me: Optional[str] = None
    score: float
    match_details: List[str] = []

class AdminPunishAction(BaseModel):
    action: str
    reason_type: Optional[str] = "AdminDeactivation"
    custom_reason: Optional[str] = None
    duration_hours: Optional[int] = None

class ReportCreate(BaseModel):
    reported_user_id: int
    reason: str
    reported_message_id: Optional[int] = None

class ReportDisplay(BaseModel):
    id: int
    reporter_id: int
    reported_user_id: int
    reported_message_id: Optional[int]
    reason: str
    timestamp: datetime
    company_name: str = ""
    address_street: str = ""
    address_zip_city: str = ""
    contact_email: str = ""
    contact_phone: str = ""
    ceo_name: str = ""
    register_court: str = ""
    register_number: str = ""
    vat_id: str = ""

class MailConfig(BaseModel):
    enabled: bool = False
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_ssl: bool = False
    smtp_tls: bool = True
    sender_name: Optional[str] = "Solumati"
    from_email: Optional[str] = None

class NotificationBase(BaseModel):
    title: str
    message: str
    type: str = "system"
    link: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: int

class NotificationDisplay(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime

    class Config:
        orm_mode = True

class PushSubscription(BaseModel):
    endpoint: str
    keys: Dict[str, str]

class RegistrationConfig(BaseModel):
    enabled: bool = True
    require_verification: bool = False
    maintenance_mode: bool = False
    email_2fa_enabled: bool = False
    server_domain: Optional[str] = None
    allowed_domains: Optional[str] = None
    blocked_domains: Optional[str] = None
    allow_password_registration: bool = True

class LegalConfig(BaseModel):
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
    client_id: Optional[str] = ""
    client_secret: Optional[str] = ""

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
    email_target: Optional[str] = ""

class RegistrationNotificationConfig(BaseModel):
    enabled: bool = False
    email_target: Optional[str] = ""

class CaptchaConfig(BaseModel):
    enabled: bool = False
    provider: str = "cloudflare"  # cloudflare, google, hcaptcha
    site_key: Optional[str] = None
    secret_key: Optional[str] = None
    failed_attempts_threshold: int = 5
    lockout_minutes: int = 10

class CaptchaPublicConfig(BaseModel):
    enabled: bool = False
    provider: str = "cloudflare"
    site_key: Optional[str] = None

class PublicConfig(BaseModel):
    registration_enabled: bool
    email_2fa_enabled: bool
    test_mode: bool
    maintenance_mode: bool
    backend_version: str
    legal: LegalConfig
    oauth_providers: OAuthProviders
    allow_password_registration: Optional[bool] = True
    support_chat_enabled: bool = False
    captcha: CaptchaPublicConfig = CaptchaPublicConfig()

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig
    legal: LegalConfig
    oauth: OAuthConfig = OAuthConfig()
    support_chat: SupportChatConfig = SupportChatConfig()
    registration_notification: RegistrationNotificationConfig = RegistrationNotificationConfig()
    captcha: CaptchaConfig = CaptchaConfig()
    assetlinks: List[Dict[str, Any]] = []

class SystemDiagnostics(BaseModel):
    current_version: str
    latest_version: str
    update_available: bool
    beta_update_available: Optional[bool] = False
    latest_beta_version: Optional[str] = None
    internet_connected: bool
    disk_total_gb: float
    disk_free_gb: float
    disk_percent: float
    database_connected: bool
    api_reachable: bool

class ChangelogRelease(BaseModel):
    tag_name: str
    name: Optional[str]
    body: Optional[str]
    published_at: Optional[str]
    html_url: Optional[str]

# --- 2FA SCHEMAS ---

class TotpSetupResponse(BaseModel):
    secret: str
    uri: str

class TotpVerifyRequest(BaseModel):
    token: str

class TwoFactorAuthRequest(BaseModel):
    user_id: int
    code: Optional[str] = None

class TwoFactorLoginResponse(BaseModel):
    require_2fa: bool
    user_id: Optional[int] = None
    method: Optional[str] = None
    available_methods: List[str] = []
    username: Optional[str] = None
    role: Optional[str] = None
    is_guest: Optional[bool] = None
    is_admin: Optional[bool] = None
    is_profile_complete: Optional[bool] = None
    app_settings: Optional[str] = None

# WebAuthn DTOs
class WebAuthnRegistrationOptions(BaseModel):
    options: Dict[str, Any]

class WebAuthnRegistrationResponse(BaseModel):
    credential: Dict[str, Any]

class WebAuthnAuthOptions(BaseModel):
    options: Dict[str, Any]

class WebAuthnAuthResponse(BaseModel):
    credential: Dict[str, Any]
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
    about_me: Optional[str] = None
    image_url: Optional[str] = None
    intent: Optional[str] = None
    answers: Optional[Union[Dict[str, Any], List[int], str]] = None

    class Config:
        from_attributes = True
