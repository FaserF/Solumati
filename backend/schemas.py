from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime
from email_validator import validate_email, EmailNotValidError

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
    answers: Dict[str, int]

class UserLogin(BaseModel):
    login: str
    password: str

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

    # New fields
    app_settings: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    about_me: Optional[str] = None
    intent: Optional[str] = None
    answers: Optional[Dict[str, int]] = None

class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_verified: Optional[bool] = None
    is_visible_in_matches: Optional[bool] = None
    two_factor_method: Optional[str] = None

class UserSettingsUpdate(BaseModel):
    notifications_enabled: Optional[bool] = None
    theme: Optional[str] = None
    push_subscription: Optional[Dict[str, Any]] = None

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

class OAuthProviders(BaseModel):
    github: bool
    google: bool
    microsoft: bool

class PublicConfig(BaseModel):
    registration_enabled: bool
    email_2fa_enabled: bool
    test_mode: bool
    maintenance_mode: bool
    backend_version: str
    legal: LegalConfig
    oauth_providers: OAuthProviders
    allow_password_registration: Optional[bool] = True

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig
    legal: LegalConfig

class SystemDiagnostics(BaseModel):
    current_version: str
    latest_version: str
    update_available: bool
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
    username: Optional[str] = None
    role: Optional[str] = None
    is_guest: Optional[bool] = None
    is_admin: Optional[bool] = None
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