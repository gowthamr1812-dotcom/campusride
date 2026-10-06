from typing import List, Optional
from fastapi import Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.security import decode_token
from app.core.permissions import has_permission
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Validates the Bearer JWT token and retrieves the current authenticated user."""
    if not credentials:
        raise UnauthorizedException("Authentication token is required.")

    payload = decode_token(credentials.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise UnauthorizedException("Invalid token payload: missing subject identifier.")

    try:
        user_id = int(user_id_str)
    except ValueError:
        raise UnauthorizedException("Invalid subject identifier format.")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User associated with this token no longer exists.")

    if not user.is_active:
        raise ForbiddenException("User account is inactive. Please contact support.")

    return user


def require_roles(allowed_roles: List[UserRole]):
    """Dependency factory restricting access to users with specified roles."""
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Action restricted to roles: {[r.value for r in allowed_roles]}. Your role: {current_user.role.value}"
            )
        return current_user
    return role_checker


def require_permission(permission: str):
    """Dependency factory checking whether current user possesses the required permission."""
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise ForbiddenException(
                f"Missing required permission '{permission}' for role '{current_user.role.value}'."
            )
        return current_user
    return permission_checker
