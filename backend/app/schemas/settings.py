from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from app.models.user import UserRole


# ==================== ADMIN USER MANAGEMENT ====================

class AdminUserCreate(BaseModel):
    email: EmailStr = Field(..., description="Unique user corporate/campus email")
    username: str = Field(..., description="Unique alphanumeric username")
    password: str = Field(..., description="Initial plaintext password")
    full_name: str = Field(..., description="Full legal name of the user")
    phone: Optional[str] = Field(None, description="Primary contact phone number")
    role: UserRole = Field(UserRole.STUDENT, description="Assigned authorization role")
    is_active: bool = Field(True, description="Account active status")


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None


class AdminUserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    last_login_at: Optional[datetime] = None
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserListResponse(BaseModel):
    total: int
    items: List[AdminUserResponse]


# ==================== USER PROFILE ====================

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    phone: Optional[str] = None
    role: UserRole
    last_login_at: Optional[datetime] = None
    active_sessions_count: int = 1
    
    # Enriched transit context
    assigned_bus: Optional[str] = None
    assigned_route: Optional[str] = None
    assigned_stop_or_license: Optional[str] = None
    assigned_seat: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str


# ==================== PREFERENCES & SYSTEM SETTINGS ====================

class UserPreferenceUpdate(BaseModel):
    language: Optional[str] = None
    theme: Optional[str] = None
    email_alerts: Optional[bool] = None
    sms_alerts: Optional[bool] = None
    push_alerts: Optional[bool] = None
    sound_effects: Optional[bool] = None


class UserPreferenceResponse(BaseModel):
    user_id: int
    language: str = "en"
    theme: str = "light"
    email_alerts: bool = True
    sms_alerts: bool = True
    push_alerts: bool = True
    sound_effects: bool = True

    model_config = ConfigDict(from_attributes=True)


class SystemSettingsResponse(BaseModel):
    settings: Dict[str, Any]


class SystemSettingsUpdate(BaseModel):
    settings: Dict[str, Any]
