from sqlalchemy import Column, Integer, String, Boolean, ARRAY, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    real_name = Column(String)
    username = Column(String, unique=True, index=True)
    about_me = Column(Text, default="Ich bin neu hier!")
    image_url = Column(String, nullable=True)

    # Roles: 'user', 'moderator', 'admin'
    role = Column(String, default="user")

    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Secure verification code (random string), cleared after successful verification
    verification_code = Column(String, nullable=True)

    # Password Reset Token
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # New Flag: Controls if user appears in matches.
    is_visible_in_matches = Column(Boolean, default=True)

    intent = Column(String)
    answers = Column(ARRAY(Integer))

    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    # Ban system extensions
    deactivation_reason = Column(String, nullable=True)
    ban_reason_text = Column(Text, nullable=True)
    deactivated_at = Column(DateTime, nullable=True)
    banned_until = Column(DateTime, nullable=True)

    # --- 2FA Extensions ---
    # Methods: 'none', 'totp', 'email', 'passkey'
    two_factor_method = Column(String, default='none')

    # TOTP Secret (Base32)
    totp_secret = Column(String, nullable=True)

    # Email 2FA (Temporary code storage)
    email_2fa_code = Column(String, nullable=True)
    email_2fa_expires = Column(DateTime, nullable=True)

    # WebAuthn / Passkey Credentials (Stored as JSON string)
    webauthn_credentials = Column(Text, nullable=True, default="[]")
    # Temporary challenge for WebAuthn ceremonies
    webauthn_challenge = Column(String, nullable=True)

    @property
    def is_admin(self):
        return self.role == 'admin'

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    is_final_contact = Column(Boolean, default=False)

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    reported_user_id = Column(Integer, ForeignKey("users.id"))

    reported_message_id = Column(Integer, ForeignKey("messages.id"), nullable=True)

    reason = Column(Text)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

    reporter = relationship("User", foreign_keys=[reporter_id])
    reported_user = relationship("User", foreign_keys=[reported_user_id])

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)