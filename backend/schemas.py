from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict
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
    answers: List[int]

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

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    about_me: str

class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_verified: Optional[bool] = None
    is_visible_in_matches: Optional[bool] = None

class MatchResult(BaseModel):
    user_id: int
    username: str
    image_url: Optional[str] = None
    about_me: Optional[str] = None
    score: float

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
    reporter_name: Optional[str] = "Unknown"
    reported_name: Optional[str] = "Unknown"

    class Config:
        from_attributes = True

class MailConfig(BaseModel):
    enabled: bool = False
    smtp_host: str = "smtp.solumati.local"
    smtp_port: int = 587
    smtp_user: str = "user@solumati.local"
    smtp_password: str = "secret"
    smtp_ssl: bool = False
    smtp_tls: bool = True
    from_email: str = "noreply@solumati.local"
    sender_name: str = "Solumati"

class TestMailRequest(BaseModel):
    target_email: str

class RegistrationConfig(BaseModel):
    enabled: bool = True
    allowed_domains: str = ""
    blocked_domains: str = ""
    require_verification: bool = True
    # Domain used for generating links in emails (e.g., https://mysolumati.com)
    server_domain: str = "http://localhost:3000"

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig

class PublicConfig(BaseModel):
    registration_enabled: bool
    test_mode: bool = False

class SystemDiagnostics(BaseModel):
    current_version: str
    latest_version: Optional[str] = "Unknown"
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