from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Pydantic Models for Data Validation ---

# Base User Data shared across creation and reading
class UserBase(BaseModel):
    email: EmailStr
    intent: str
    real_name: str # Added real name for generation

# Data required to create a user (Registration)
class UserCreate(UserBase):
    password: str
    answers: List[int]

# Data for login (simplified)
class UserLogin(BaseModel):
    email: str
    password: str

# Data returned to the frontend
class UserDisplay(UserBase):
    id: int
    username: str # Display the generated handle
    is_guest: bool
    is_active: bool

    class Config:
        from_attributes = True

# Schema for matching results
class MatchResult(BaseModel):
    user_id: int
    username: str # Show username instead of email
    score: float
    is_blurred: bool = False # For guest view logic if handled by backend

# Schema for admin login
class AdminLogin(BaseModel):
    password: str

# Schema for admin actions
class AdminAction(BaseModel):
    action: str # "delete", "deactivate", "reactivate"