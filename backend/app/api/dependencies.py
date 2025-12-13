import logging
from typing import Optional

from app.core.database import get_db
from app.db import models
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# --- Dependency: Auth & Role Check ---
def get_current_user_from_header(
    x_user_id: Optional[int] = Header(None), db: Session = Depends(get_db)
):
    if x_user_id is None:
        raise HTTPException(status_code=401, detail="Missing authentication header")
    user = db.query(models.User).filter(models.User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="User is inactive")
    return user


def require_admin(user: models.User = Depends(get_current_user_from_header)):
    if user.role != "admin":
        logger.warning(f"Unauthorized admin access attempt by {user.username}")
        raise HTTPException(status_code=403, detail="Admin privileges required")
    return user


def require_moderator_or_admin(
    user: models.User = Depends(get_current_user_from_header),
):
    if user.role not in ["admin", "moderator"]:
        raise HTTPException(
            status_code=403, detail="Moderator or Admin privileges required"
        )
    return user
