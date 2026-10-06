from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from app.models.user import UserRole


class LoginRequest(BaseModel):
    username_or_email: str = Field(..., examples=["admin@campusride.edu"])
    password: str = Field(..., min_length=4, examples=["Admin@123"])


class RefreshRequest(BaseModel):
    refresh_token: str = Field(..., examples=["eyJhbGciOiJIUzI1..."])


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int
    user: UserResponse
    permissions: List[str]


class SessionResponse(BaseModel):
    id: int
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    is_revoked: bool
    expires_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class LoginHistoryResponse(BaseModel):
    id: int
    attempted_email: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    success: bool
    failure_reason: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=4)
    new_password: str = Field(..., min_length=6)
