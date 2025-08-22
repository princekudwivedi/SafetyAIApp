from app.models.base import BaseDBModel, PyObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from enum import Enum
from datetime import datetime

class UserRole(str, Enum):
    ADMINISTRATOR = "Administrator"
    SUPERVISOR = "Supervisor"
    SAFETY_OFFICER = "SafetyOfficer"
    OPERATOR = "Operator"

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    role: UserRole
    site_id: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    site_id: Optional[str] = None
    is_active: Optional[bool] = None

class UserInDB(UserBase):
    password_hash: str
    site_id: Optional[str] = None
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class User(UserBase, BaseDBModel):
    pass

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None
