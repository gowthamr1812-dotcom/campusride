from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User, UserRole
from app.schemas.settings import (
    AdminUserCreate,
    AdminUserUpdate,
    AdminUserResponse,
    AdminUserListResponse
)
from app.services.settings import UserService

router = APIRouter(prefix="/users", tags=["User Administration (Admin Only)"])


@router.get(
    "",
    response_model=AdminUserListResponse,
    status_code=status.HTTP_200_OK,
    summary="List All System Users",
    description="Retrieve paginated list of accounts across all roles with status and search filters (Admin only)."
)
async def list_users(
    search: Optional[str] = Query(None, description="Search by full name, email, username, phone"),
    role: Optional[UserRole] = Query(None, description="Filter by UserRole"),
    is_active: Optional[bool] = Query(None, description="Filter by active/inactive status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return UserService.list_users(
        db=db,
        search=search,
        role=role,
        is_active=is_active,
        page=page,
        page_size=page_size
    )


@router.post(
    "",
    response_model=AdminUserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create New User Account",
    description="Provision a new user account with designated role and credentials (Admin only)."
)
async def create_user(
    data: AdminUserCreate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return UserService.create_user(db=db, data=data)


@router.put(
    "/{user_id}",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Update User Account",
    description="Modify account credentials, role designation, or profile details (Admin only)."
)
async def update_user(
    user_id: int,
    data: AdminUserUpdate,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return UserService.update_user(db=db, user_id=user_id, data=data)


@router.post(
    "/{user_id}/toggle-status",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle User Active Status",
    description="Activates or suspends a user's platform access (Admin only)."
)
async def toggle_user_status(
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return UserService.toggle_user_status(db=db, user_id=user_id)


@router.post(
    "/{user_id}/unlock",
    response_model=AdminUserResponse,
    status_code=status.HTTP_200_OK,
    summary="Unlock User Account",
    description="Resets failed login count and removes lockout on account (Admin only)."
)
async def unlock_user(
    user_id: int,
    current_user: User = Depends(require_roles([UserRole.ADMIN])),
    db: Session = Depends(get_db)
):
    return UserService.unlock_user(db=db, user_id=user_id)
