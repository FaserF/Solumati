from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    intent: Optional[str] = None
    real_name: Optional[str] = None

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

class UserAccountUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    current_password: str # Required for security

class MatchResult(BaseModel):
    user_id: int
    username: str
    image_url: Optional[str] = None
    about_me: Optional[str] = None
    score: float

class AdminLogin(BaseModel):
    password: str

class AdminPunishAction(BaseModel):
    action: str # "deactivate", "reactivate", "ban", "delete", "verify"
    reason_type: Optional[str] = "AdminDeactivation"
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
    sender_name: str = "Solumati" # New

class MailTestRequest(BaseModel):
    target_email: EmailStr

class RegistrationConfig(BaseModel):
    enabled: bool = True
    allowed_domains: str = ""
    require_verification: bool = True
    guest_mode_enabled: bool = True
    server_domain: str = "" # New: e.g. "myserver.com"

class LegalConfig(BaseModel):
    imprint: str = "Impressum hier eintragen."
    privacy: str = "Datenschutzerklärung hier eintragen."

class SystemSettings(BaseModel):
    mail: MailConfig
    registration: RegistrationConfig
    legal: Optional[LegalConfig] = LegalConfig()

class PublicConfig(BaseModel):
    registration_enabled: bool