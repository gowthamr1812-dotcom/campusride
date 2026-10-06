from typing import List
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.permissions import get_role_permissions
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    TokenResponse,
    UserResponse,
    SessionResponse,
    LoginHistoryResponse,
    ChangePasswordRequest
)
from app.services.auth import AuthService
from app.core.security import verify_password, get_password_hash, decode_token
from app.core.exceptions import UnauthorizedException

router = APIRouter(prefix="/auth", tags=["Authentication & Access"])


@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="User Login",
    description="Authenticates credentials, generates JWT access and refresh tokens, and tracks login history."
)
async def login(
    login_data: LoginRequest,
    request: Request,
    db: Session = Depends(get_db)
) -> TokenResponse:
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    
    return AuthService.authenticate_user(
        db=db,
        username_or_email=login_data.username_or_email,
        password=login_data.password,
        ip_address=ip_address,
        user_agent=user_agent
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Refresh Access Token",
    description="Exchanges an unrevoked refresh token for a newly signed access token."
)
async def refresh_token(
    refresh_data: RefreshRequest,
    db: Session = Depends(get_db)
) -> TokenResponse:
    return AuthService.refresh_user_session(db=db, refresh_token_str=refresh_data.refresh_token)


@router.get(
    "/me",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Current User Profile",
    description="Returns current authenticated user details along with role-assigned permissions."
)
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "user": UserResponse.model_validate(current_user),
        "permissions": get_role_permissions(current_user.role)
    }


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Logout Session",
    description="Revokes the active user session associated with the current bearer token."
)
async def logout(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Attempt to extract session_id from token claims
    auth_header = request.headers.get("authorization", "")
    session_id = None
    if auth_header.startswith("Bearer "):
        try:
            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            session_id = payload.get("session_id")
        except Exception:
            pass

    AuthService.logout_session(db=db, user=current_user, session_id=session_id)
    return {"success": True, "message": "Logged out successfully."}


@router.post(
    "/logout-all",
    status_code=status.HTTP_200_OK,
    summary="Logout All Devices",
    description="Revokes all active sessions for the current user."
)
async def logout_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    revoked_count = AuthService.logout_all_sessions(db=db, user=current_user)
    return {
        "success": True,
        "message": f"Successfully revoked {revoked_count} active session(s)."
    }


@router.get(
    "/sessions",
    response_model=List[SessionResponse],
    status_code=status.HTTP_200_OK,
    summary="Active Sessions",
    description="Returns list of sessions for current user."
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[SessionResponse]:
    sessions = AuthService.get_user_sessions(db=db, user=current_user)
    return [SessionResponse.model_validate(s) for s in sessions]


@router.get(
    "/login-history",
    response_model=List[LoginHistoryResponse],
    status_code=status.HTTP_200_OK,
    summary="Login History Audit",
    description="Returns login attempt audit logs (self for normal users, global for admin)."
)
async def list_login_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[LoginHistoryResponse]:
    history = AuthService.get_login_history(db=db, user=current_user)
    return [LoginHistoryResponse.model_validate(h) for h in history]


@router.post(
    "/change-password",
    status_code=status.HTTP_200_OK,
    summary="Change Password",
    description="Updates the user password and invalidates all existing sessions."
)
async def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(data.old_password, current_user.hashed_password):
        raise UnauthorizedException("Incorrect old password.")

    current_user.hashed_password = get_password_hash(data.new_password)
    # Revoke other sessions on password update
    AuthService.logout_all_sessions(db=db, user=current_user)
    db.commit()

    return {"success": True, "message": "Password changed successfully. Please log in again."}
