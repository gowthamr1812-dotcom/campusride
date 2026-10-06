from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class SystemSetting(BaseModel):
    __tablename__ = "system_settings"

    key = Column(String(100), unique=True, index=True, nullable=False)
    value = Column(Text, nullable=False)
    category = Column(String(50), default="GENERAL", nullable=False)  # GENERAL, TIMETABLE, TELEMATICS, SECURITY, AI
    description = Column(String(255), nullable=True)
    updated_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    def __repr__(self):
        return f"<SystemSetting {self.key}='{self.value}'>"


class UserPreference(BaseModel):
    __tablename__ = "user_preferences"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    language = Column(String(10), default="en", nullable=False)  # en, ta, hi
    theme = Column(String(20), default="light", nullable=False)  # light, dark, system
    email_alerts = Column(Boolean, default=True, nullable=False)
    sms_alerts = Column(Boolean, default=True, nullable=False)
    push_alerts = Column(Boolean, default=True, nullable=False)
    sound_effects = Column(Boolean, default=True, nullable=False)

    user = relationship("User", foreign_keys=[user_id])

    def __repr__(self):
        return f"<UserPreference User:{self.user_id} Lang:{self.language}>"
