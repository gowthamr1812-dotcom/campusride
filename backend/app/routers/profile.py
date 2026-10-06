from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.settings import (
    UserProfileResponse,
    UserProfileUpdate,
    UserPasswordChangeRequest
)
from app.services.settings import ProfileService

router = APIRouter(prefix="/profile", tags=["User Profile"])


@router.get(
    "",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Current User Profile",
    description="Returns profile details, active login sessions, and assigned transit entity."
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ProfileService.get_profile(db=db, current_user=current_user)


@router.put(
    "",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Profile Contacts",
    description="Modifies full name and personal contact phone number."
)
async def update_my_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return ProfileService.update_profile(db=db, current_user=current_user, data=data)


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change Account Password",
    description="Validates current credentials and updates to new password."
)
async def change_password(
    data: UserPasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ProfileService.change_password(db=db, current_user=current_user, data=data)
    return {"message": "Password updated successfully."}
