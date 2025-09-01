from app.models.base import BaseDBModel, PyObjectId
from pydantic import BaseModel, Field, EmailStr
from typing import Optional, List
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
    first_name: str = Field(..., min_length=1, max_length=50)
    last_name: str = Field(..., min_length=1, max_length=50)
    role: UserRole
    site_id: Optional[str] = None
    is_active: bool = True
    permissions: List[str] = Field(default_factory=list)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=50)
    last_name: Optional[str] = Field(None, min_length=1, max_length=50)
    role: Optional[UserRole] = None
    site_id: Optional[str] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None
    password: Optional[str] = Field(None, min_length=8)

class UserInDB(UserBase, BaseDBModel):
    password_hash: str
    site_id: Optional[str] = None
    last_login: Optional[datetime] = None

class User(UserBase, BaseDBModel):
    last_login: Optional[datetime] = None

class UserLogin(BaseModel):
    username: str
    password: str
    remember_me: Optional[bool] = False

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_expires_in: int

class RefreshToken(BaseModel):
    refresh_token: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class UserListResponse(BaseModel):
    users: List[User]
    total: int
    page: int
    limit: int
    total_pages: int
