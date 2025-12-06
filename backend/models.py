from sqlalchemy import Column, Integer, String, Boolean, ARRAY, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    """
    SQLAlchemy model representing the 'users' table in the database.
    Updated with admin and profile fields.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    # New fields for requirements
    real_name = Column(String) # The name input by user
    username = Column(String, unique=True, index=True) # Generated: Name#123

    is_admin = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True) # Soft delete/ban status

    intent = Column(String) # "longterm" or "casual"
    answers = Column(ARRAY(Integer)) # Personality vector

    is_guest = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Message(Base):
    """
    SQLAlchemy model representing the 'messages' table.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_id = Column(Integer, ForeignKey("users.id"))
    receiver_id = Column(Integer, ForeignKey("users.id"))
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)

    # Flag to track the 7000 message limit rule
    is_final_contact = Column(Boolean, default=False)

class Report(Base):
    """
    Table for reported users or content (Admin Panel feature).
    """
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id"))
    reported_user_id = Column(Integer, ForeignKey("users.id"))
    reason = Column(Text)
    resolved = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)