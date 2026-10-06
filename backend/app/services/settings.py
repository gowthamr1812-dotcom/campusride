from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.models.user import User, UserRole, UserSession
from app.models.people import Driver, BusIncharge, Student
from app.models.settings import SystemSetting, UserPreference
from app.core.security import get_password_hash, verify_password
from app.schemas.settings import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    AdminUserListResponse,
    UserProfileUpdate,
    UserProfileResponse,
    UserPasswordChangeRequest,
    UserPreferenceUpdate,
    UserPreferenceResponse,
    SystemSettingsResponse,
    SystemSettingsUpdate
)

DEFAULT_SYSTEM_SETTINGS = {
    "college_name": "Apollo Institute of Technology",
    "academic_year": "2025-2026",
    "contact_email": "transport@campusride.edu",
    "contact_phone": "+91 98401 11000",
    "morning_departure_time": "07:15 AM",
    "evening_departure_time": "04:45 PM",
    "campus_geofence_radius_meters": 500,
    "gps_ping_interval_seconds": 10,
    "max_failed_logins": 5,
    "ai_assistant_enabled": True
}


class UserService:

    @staticmethod
    def list_users(
        db: Session,
        search: Optional[str] = None,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        page: int = 1,
        page_size: int = 20
    ) -> AdminUserListResponse:
        query = db.query(User)

        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    User.full_name.ilike(s),
                    User.email.ilike(s),
                    User.username.ilike(s),
                    User.phone.ilike(s)
                )
            )

        if role:
            query = query.filter(User.role == role)

        if is_active is not None:
            query = query.filter(User.is_active == is_active)

        total = query.count()
        offset = (page - 1) * page_size
        users = query.order_by(User.id.asc()).offset(offset).limit(page_size).all()

        return AdminUserListResponse(
            total=total,
            items=[AdminUserResponse.model_validate(u) for u in users]
        )

    @staticmethod
    def create_user(db: Session, data: AdminUserCreate) -> AdminUserResponse:
        existing = db.query(User).filter(
            or_(User.email == data.email, User.username == data.username)
        ).first()
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"User with email '{data.email}' or username '{data.username}' already exists."
            )

        user = User(
            email=data.email,
            username=data.username,
            full_name=data.full_name,
            phone=data.phone,
            role=data.role,
            is_active=data.is_active,
            hashed_password=get_password_hash(data.password),
            is_verified=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Initialize default user preferences
        pref = UserPreference(user_id=user.id, language="en", theme="light")
        db.add(pref)
        db.commit()

        return AdminUserResponse.model_validate(user)

    @staticmethod
    def update_user(db: Session, user_id: int, data: AdminUserUpdate) -> AdminUserResponse:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

        if data.email and data.email != user.email:
            conflict = db.query(User).filter(User.email == data.email).first()
            if conflict:
                raise HTTPException(status_code=400, detail="Email is already taken by another account.")
            user.email = data.email

        if data.full_name is not None:
            user.full_name = data.full_name
        if data.phone is not None:
            user.phone = data.phone
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.password:
            user.hashed_password = get_password_hash(data.password)

        db.commit()
        db.refresh(user)
        return AdminUserResponse.model_validate(user)

    @staticmethod
    def toggle_user_status(db: Session, user_id: int) -> AdminUserResponse:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

        user.is_active = not user.is_active
        db.commit()
        db.refresh(user)
        return AdminUserResponse.model_validate(user)

    @staticmethod
    def unlock_user(db: Session, user_id: int) -> AdminUserResponse:
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail=f"User with ID {user_id} not found.")

        user.failed_login_attempts = 0
        user.locked_until = None
        db.commit()
        db.refresh(user)
        return AdminUserResponse.model_validate(user)


class ProfileService:

    @staticmethod
    def get_profile(db: Session, current_user: User) -> UserProfileResponse:
        active_sessions = db.query(UserSession).filter(
            UserSession.user_id == current_user.id,
            UserSession.is_revoked == False
        ).count()

        assigned_bus = None
        assigned_route = None
        assigned_stop_or_license = None
        assigned_seat = None

        if current_user.role == UserRole.STUDENT:
            student = db.query(Student).filter(
                (Student.user_id == current_user.id) |
                (Student.phone == current_user.phone) |
                (Student.student_id == current_user.username)
            ).first()
            if student:
                assigned_bus = student.bus
                assigned_route = student.route
                assigned_stop_or_license = student.stop
                assigned_seat = student.seat

        elif current_user.role == UserRole.DRIVER:
            driver = db.query(Driver).filter(
                (Driver.user_id == current_user.id) | (Driver.driver_id == current_user.username)
            ).first()
            if driver:
                assigned_bus = driver.assigned_bus
                assigned_route = driver.assigned_route
                assigned_stop_or_license = driver.license_number

        elif current_user.role == UserRole.BUS_INCHARGE:
            incharge = db.query(BusIncharge).filter(
                (BusIncharge.user_id == current_user.id) | (BusIncharge.incharge_id == current_user.username)
            ).first()
            if incharge:
                assigned_bus = incharge.assigned_bus
                assigned_route = incharge.assigned_route
                assigned_stop_or_license = incharge.employee_id

        return UserProfileResponse(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            phone=current_user.phone,
            role=current_user.role,
            last_login_at=current_user.last_login_at,
            active_sessions_count=max(1, active_sessions),
            assigned_bus=assigned_bus,
            assigned_route=assigned_route,
            assigned_stop_or_license=assigned_stop_or_license,
            assigned_seat=assigned_seat
        )

    @staticmethod
    def update_profile(db: Session, current_user: User, data: UserProfileUpdate) -> UserProfileResponse:
        if data.full_name is not None:
            current_user.full_name = data.full_name
        if data.phone is not None:
            current_user.phone = data.phone

        db.commit()
        db.refresh(current_user)
        return ProfileService.get_profile(db, current_user)

    @staticmethod
    def change_password(db: Session, current_user: User, data: UserPasswordChangeRequest) -> bool:
        if not verify_password(data.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password does not match.")

        if len(data.new_password) < 6:
            raise HTTPException(status_code=400, detail="New password must be at least 6 characters.")

        current_user.hashed_password = get_password_hash(data.new_password)
        db.commit()
        return True


class SettingsService:

    @staticmethod
    def get_user_preferences(db: Session, user_id: int) -> UserPreferenceResponse:
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not pref:
            pref = UserPreference(user_id=user_id, language="en", theme="light")
            db.add(pref)
            db.commit()
            db.refresh(pref)

        return UserPreferenceResponse.model_validate(pref)

    @staticmethod
    def update_user_preferences(
        db: Session,
        user_id: int,
        data: UserPreferenceUpdate
    ) -> UserPreferenceResponse:
        pref = db.query(UserPreference).filter(UserPreference.user_id == user_id).first()
        if not pref:
            pref = UserPreference(user_id=user_id)
            db.add(pref)

        if data.language is not None:
            pref.language = data.language
        if data.theme is not None:
            pref.theme = data.theme
        if data.email_alerts is not None:
            pref.email_alerts = data.email_alerts
        if data.sms_alerts is not None:
            pref.sms_alerts = data.sms_alerts
        if data.push_alerts is not None:
            pref.push_alerts = data.push_alerts
        if data.sound_effects is not None:
            pref.sound_effects = data.sound_effects

        db.commit()
        db.refresh(pref)
        return UserPreferenceResponse.model_validate(pref)

    @staticmethod
    def get_system_settings(db: Session) -> SystemSettingsResponse:
        rows = db.query(SystemSetting).all()
        if not rows:
            # Initialize defaults in database
            for k, v in DEFAULT_SYSTEM_SETTINGS.items():
                val_str = str(v) if not isinstance(v, bool) else ("true" if v else "false")
                db.add(SystemSetting(key=k, value=val_str, category="GENERAL"))
            db.commit()
            rows = db.query(SystemSetting).all()

        settings_dict = {}
        for r in rows:
            val = r.value
            if val.lower() == "true":
                settings_dict[r.key] = True
            elif val.lower() == "false":
                settings_dict[r.key] = False
            elif val.isdigit():
                settings_dict[r.key] = int(val)
            else:
                settings_dict[r.key] = val

        return SystemSettingsResponse(settings=settings_dict)

    @staticmethod
    def update_system_settings(
        db: Session,
        data: SystemSettingsUpdate,
        updated_by_id: int
    ) -> SystemSettingsResponse:
        for k, v in data.settings.items():
            val_str = str(v) if not isinstance(v, bool) else ("true" if v else "false")
            existing = db.query(SystemSetting).filter(SystemSetting.key == k).first()
            if existing:
                existing.value = val_str
                existing.updated_by_id = updated_by_id
            else:
                db.add(SystemSetting(key=k, value=val_str, updated_by_id=updated_by_id))

        db.commit()
        return SettingsService.get_system_settings(db)
