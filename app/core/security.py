"""Authentication and authorization utilities."""

from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import User, UserRole

settings = get_settings()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ROLE_PERMISSIONS = {
    UserRole.SYSADMIN: {"*"},
    UserRole.SUPPORT_MANAGER: {
        "incidents:*", "events:read", "dashboard:*", "major:*",
        "broadcast:*", "knowledge:*", "ai:*", "journeys:read",
    },
    UserRole.SUPPORT_L2: {
        "incidents:read", "incidents:update", "events:read",
        "dashboard:read", "knowledge:*", "ai:*", "journeys:read",
    },
    UserRole.SUPPORT_L1: {
        "incidents:read", "incidents:update", "events:read",
        "dashboard:read", "knowledge:read", "ai:assist",
    },
    UserRole.EXECUTIVE: {
        "dashboard:read", "incidents:read", "major:read", "reports:read",
    },
    UserRole.GOVERNORATE_MANAGER: {
        "dashboard:read", "incidents:read", "journeys:read",
    },
    UserRole.DEVOPS: {
        "incidents:read", "incidents:update", "events:read", "dashboard:read", "ai:*",
    },
    UserRole.DBA: {
        "incidents:read", "incidents:update", "events:read", "dashboard:read",
    },
    UserRole.GIS: {
        "incidents:read", "incidents:update", "events:read", "dashboard:read",
    },
    UserRole.CALL_CENTER: {
        "incidents:create", "incidents:read", "events:ingest",
    },
}


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.query(User).filter(User.username == username, User.is_active.is_(True)).first()
    if not user:
        raise credentials_exception
    return user


def require_permission(permission: str):
    def checker(user: User = Depends(get_current_user)) -> User:
        perms = ROLE_PERMISSIONS.get(user.role, set())
        if "*" in perms:
            return user
        if permission in perms:
            return user
        resource = permission.split(":")[0]
        if f"{resource}:*" in perms:
            return user
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return checker
