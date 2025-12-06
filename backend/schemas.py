from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    intent: Optional[str] = None # Relaxed validation
    real_name: Optional[str] = None # Relaxed validation

class UserCreate(UserBase):
    password: str
    answers: List[int]

class UserLogin(BaseModel):
    email: str
    password: str

class UserDisplay(UserBase):
    id: int
    username: str
    about_me: Optional[str] = None
    image_url: Optional[str] = None
    is_guest: bool
    is_active: bool
    is_verified: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    # Admin fields
    deactivation_reason: Optional[str] = None
    banned_until: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    about_me: str

class MatchResult(BaseModel):
    user_id: int
    username: str
    image_url: Optional[str] = None
    about_me: Optional[str] = None
    score: float

class AdminLogin(BaseModel):
    password: str

# Schema for taking action against a user
class AdminPunishAction(BaseModel):
    action: str # "deactivate", "reactivate", "ban", "delete"
    reason_type: Optional[str] = "AdminDeactivation" # Reported, UserDeactivation, etc.
    duration_hours: Optional[int] = None # Only for temp ban

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
    # We include usernames for convenience in the UI
    reporter_name: Optional[str] = "Unknown"
    reported_name: Optional[str] = "Unknown"

    class Config:
        from_attributes = True

# --- Settings Schemas ---

class MailConfig(BaseModel):
    enabled: bool = False
    smtp_host: str = "smtp.example.com"
    smtp_port: int = 587
    smtp_user: str = "user@example.com"
    smtp_password: str = "secret"
    smtp_ssl: bool = False
    smtp_tls: bool = True
    from_email: str = "noreply@example.com"

class RegistrationConfig(BaseModel):
    enabled: bool = True
    allowed_domains: str = ""
    require_verification: bool = True
    guest_mode_enabled: bool = True

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig

class PublicConfig(BaseModel):
    registration_enabled: bool