from datetime import datetime, timezone, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.config import settings
from app.core.exceptions import UnauthorizedException, ForbiddenException
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.core.permissions import get_role_permissions
from app.models.user import User, UserSession, LoginHistory, UserRole
from app.schemas.auth import TokenResponse, UserResponse


class AuthService:
    @staticmethod
    def authenticate_user(
        db: Session,
        username_or_email: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> TokenResponse:
        now = datetime.now(timezone.utc)
        
        # Query user by email or username
        user = db.query(User).filter(
            or_(
                User.email == username_or_email.lower().strip(),
                User.username == username_or_email.strip()
            )
        ).first()

        # Check account lockout
        if user and user.locked_until and user.locked_until > now:
            remaining = int((user.locked_until - now).total_seconds() / 60)
            failure_reason = f"Account locked. Try again in {remaining} minute(s)."
            
            # Record failed login
            history = LoginHistory(
                user_id=user.id,
                attempted_email=username_or_email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason=failure_reason,
                timestamp=now
            )
            db.add(history)
            db.commit()
            raise UnauthorizedException(failure_reason)

        # Validate password
        if not user or not verify_password(password, user.hashed_password):
            failure_reason = "Invalid email/username or password."
            if user:
                user.failed_login_attempts += 1
                if user.failed_login_attempts >= 5:
                    user.locked_until = now + timedelta(minutes=15)
                    failure_reason = "Too many failed attempts. Account temporarily locked for 15 minutes."

            history = LoginHistory(
                user_id=user.id if user else None,
                attempted_email=username_or_email,
                ip_address=ip_address,
                user_agent=user_agent,
                success=False,
                failure_reason=failure_reason,
                timestamp=now
            )
            db.add(history)
            db.commit()
            raise UnauthorizedException("Invalid email/username or password.")

        if not user.is_active:
            raise ForbiddenException("Account is inactive. Please contact your administrator.")

        # Successful authentication: reset failed attempts
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login_at = now

        # Create session record
        session_expires_at = now + timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
        raw_refresh_token = create_refresh_token(subject=user.id)
        
        new_session = UserSession(
            user_id=user.id,
            refresh_token=raw_refresh_token,
            ip_address=ip_address,
            user_agent=user_agent,
            is_revoked=False,
            expires_at=session_expires_at
        )
        db.add(new_session)
        db.flush()  # assign ID to new_session

        # Create access token binding session ID
        access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            session_id=new_session.id
        )

        # Record successful login history
        history = LoginHistory(
            user_id=user.id,
            attempted_email=username_or_email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=True,
            failure_reason=None,
            timestamp=now
        )
        db.add(history)
        db.commit()

        permissions = get_role_permissions(user.role)

        return TokenResponse(
            access_token=access_token,
            refresh_token=raw_refresh_token,
            token_type="Bearer",
            expires_in_minutes=settings.JWT_ACCESS_EXPIRE_MINUTES,
            user=UserResponse.model_validate(user),
            permissions=permissions
        )

    @staticmethod
    def refresh_user_session(db: Session, refresh_token_str: str) -> TokenResponse:
        now = datetime.now(timezone.utc)
        payload = decode_token(refresh_token_str)
        
        if payload.get("type") != "refresh":
            raise UnauthorizedException("Invalid token type. Expected refresh token.")

        session = db.query(UserSession).filter(
            UserSession.refresh_token == refresh_token_str,
            UserSession.is_revoked == False
        ).first()

        if not session:
            raise UnauthorizedException("Session revoked or not found.")

        # Ensure naive/aware comparison compatibility
        session_expiry = session.expires_at
        if session_expiry.tzinfo is None:
            session_expiry = session_expiry.replace(tzinfo=timezone.utc)

        if session_expiry < now:
            session.is_revoked = True
            db.commit()
            raise UnauthorizedException("Session expired. Please log in again.")

        user = db.query(User).filter(User.id == session.user_id).first()
        if not user or not user.is_active:
            raise UnauthorizedException("User no longer exists or is inactive.")

        access_token = create_access_token(
            subject=user.id,
            role=user.role.value,
            session_id=session.id
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="Bearer",
            expires_in_minutes=settings.JWT_ACCESS_EXPIRE_MINUTES,
            user=UserResponse.model_validate(user),
            permissions=get_role_permissions(user.role)
        )

    @staticmethod
    def logout_session(db: Session, user: User, session_id: Optional[int] = None) -> bool:
        query = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_revoked == False
        )
        if session_id:
            query = query.filter(UserSession.id == session_id)
        
        sessions = query.all()
        for s in sessions:
            s.is_revoked = True
        db.commit()
        return True

    @staticmethod
    def logout_all_sessions(db: Session, user: User) -> int:
        sessions = db.query(UserSession).filter(
            UserSession.user_id == user.id,
            UserSession.is_revoked == False
        ).all()
        count = len(sessions)
        for s in sessions:
            s.is_revoked = True
        db.commit()
        return count

    @staticmethod
    def get_user_sessions(db: Session, user: User) -> List[UserSession]:
        return db.query(UserSession).filter(
            UserSession.user_id == user.id
        ).order_by(UserSession.created_at.desc()).all()

    @staticmethod
    def get_login_history(db: Session, user: User, limit: int = 50) -> List[LoginHistory]:
        query = db.query(LoginHistory)
        if user.role != UserRole.ADMIN:
            query = query.filter(LoginHistory.user_id == user.id)
        return query.order_by(LoginHistory.timestamp.desc()).limit(limit).all()
