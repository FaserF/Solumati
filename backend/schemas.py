from pydantic import BaseModel, field_validator
from typing import List, Optional
from datetime import datetime
from email_validator import validate_email, EmailNotValidError

class UserBase(BaseModel):
    # CHANGED: EmailStr to str + custom validator to allow .local domains
    email: str
    intent: Optional[str] = None
    real_name: Optional[str] = None

    @field_validator('email')
    @classmethod
    def validate_email_address(cls, v: str) -> str:
        # Whitelist our local domain specifically
        if v.endswith("@solumati.local"):
            return v

        # For all other emails, use strict validation but don't crash on deliverability checks
        try:
            valid = validate_email(v, check_deliverability=False)
            return valid.normalized
        except EmailNotValidError as e:
            raise ValueError(str(e))

class UserCreate(UserBase):
    password: str
    answers: List[int]

class UserLogin(BaseModel):
    login: str # Can be email or username
    password: str

class UserDisplay(UserBase):
    id: int
    username: str
    # email inherited from UserBase
    about_me: Optional[str] = None
    image_url: Optional[str] = None
    is_guest: bool
    is_active: bool
    is_verified: bool
    role: str
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    # Admin fields
    deactivation_reason: Optional[str] = None
    ban_reason_text: Optional[str] = None
    banned_until: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    about_me: str

# New Schema for Admin editing users
class UserAdminUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None # Plaintext password to be hashed
    is_verified: Optional[bool] = None

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
    sender_name: str = "Solumati" # Added Sender Name

class TestMailRequest(BaseModel):
    target_email: str

class RegistrationConfig(BaseModel):
    enabled: bool = True
    allowed_domains: str = ""
    require_verification: bool = True
    # guest_mode_enabled removed, logic now depends on Guest User (ID 0) status

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig

class PublicConfig(BaseModel):
    registration_enabled: bool