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

    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    intent = Column(String)
    answers = Column(ARRAY(Integer))

    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

    deactivation_reason = Column(String, nullable=True) # "Reported", "Admin", "TempBan", etc.
    deactivated_at = Column(DateTime, nullable=True)
    banned_until = Column(DateTime, nullable=True) # If set, user is temp-banned until this time

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

    # Relationships for easier query handling in Admin Panel
    reporter = relationship("User", foreign_keys=[reporter_id])
    reported_user = relationship("User", foreign_keys=[reported_user_id])

class SystemSetting(Base):
    __tablename__ = "system_settings"
    key = Column(String, primary_key=True, index=True)
    value = Column(String)