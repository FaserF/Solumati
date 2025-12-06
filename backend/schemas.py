from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Pydantic Models for Data Validation ---

# Base User Data shared across creation and reading
class UserBase(BaseModel):
    email: EmailStr
    intent: str

# Data required to create a user (Registration)
class UserCreate(UserBase):
    password: str
    answers: List[int]

# Data returned to the frontend (excludes password)
class UserDisplay(UserBase):
    id: int
    is_guest: bool

    class Config:
        from_attributes = True # Allows Pydantic to read from SQLAlchemy models

# Schema for matching results
class MatchResult(BaseModel):
    user_id: int
    email: str # Or generic username for privacy
    score: float

# Schema for sending messages
class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    is_final_contact: bool = False