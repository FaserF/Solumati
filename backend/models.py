from sqlalchemy import Column, Integer, String, Boolean, ARRAY, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class User(Base):
    """
    SQLAlchemy model representing the 'users' table in the database.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String) # In a real prod app, use bcrypt hashing
    intent = Column(String) # "longterm" or "casual"

    # Postgres specific feature: Storing integers array directly
    answers = Column(ARRAY(Integer))

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