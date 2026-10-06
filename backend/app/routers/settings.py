from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_roles
from app.models.user import User, UserRole
from app.schemas.settings import (
    UserPreferenceResponse,
    UserPreferenceUpdate,
    SystemSettingsResponse,
    SystemSettingsUpdate
)
from app.services.settings import SettingsService

router = APIRouter(prefix="/settings", tags=["System & User Settings"])


@router.get(
    "/preferences",
    response_model=UserPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Get User Preferences",
    description="Returns language preference, theme mode, and push notification toggles."
)
async def get_user_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SettingsService.get_user_preferences(db=db, user_id=current_user.id)


@router.put(
    "/preferences",
    response_model=UserPreferenceResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User Preferences",
    description="Updates user interface language (English, Tamil, Hindi), dark mode, and alert preferences."
)
async def update_user_preferences(
    data: UserPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SettingsService.update_user_preferences(
        db=db, user_id=current_user.id, data=data
    )


@router.get(
    "/system",
    response_model=SystemSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Institutional System Settings",
    description="Retrieves operational parameters, departure timetables, geofence radius, and AI configuration."
)
async def get_system_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return SettingsService.get_system_settings(db=db)


@router.put(
    "/system",
    response_model=SystemSettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Institutional System Settings",
    description="Modifies college branding, departure schedules, geofencing, and AI features (Admin only)."
)
async def update_system_settings(
    data: SystemSettingsUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return SettingsService.update_system_settings(
        db=db, data=data, updated_by_id=current_user.id
    )
