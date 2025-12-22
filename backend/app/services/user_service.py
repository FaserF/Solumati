from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db import models, schemas
from app.services.base import BaseService
from app.core.security import hash_password
from app.services.utils import generate_unique_username
from datetime import datetime
import json
import secrets

class UserService(BaseService[models.User]):
    def get_by_email(self, db: Session, email: str) -> Optional[models.User]:
        return db.query(self.model).filter(self.model.email == email).first()

    def get_by_username(self, db: Session, username: str) -> Optional[models.User]:
        return db.query(self.model).filter(self.model.username == username).first()

    def create_user(self, db: Session, user_in: schemas.UserCreate, is_verified: bool = False) -> models.User:
        hashed_pw = hash_password(user_in.password)
        secure_code = secrets.token_urlsafe(32)
        verification_code = secure_code if not is_verified else None

        # Parse answers safely
        answers_json = "{}"
        if user_in.answers:
            if isinstance(user_in.answers, dict):
                 answers_json = json.dumps(user_in.answers)
            else:
                 # Fallback if list or other type passed (though schema says dict usually)
                 pass

        db_obj = models.User(
            email=user_in.email,
            hashed_password=hashed_pw,
            real_name=user_in.real_name,
            username=generate_unique_username(db, user_in.real_name),
            intent=user_in.intent,
            answers=answers_json,
            is_active=True,
            is_verified=is_verified,
            verification_code=verification_code,
            role="user",
            created_at=datetime.utcnow(),
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_candidates(self, db: Session, user: models.User, is_privileged: bool) -> List[models.User]:
        """
        Efficiently fetch candidates for matching.
        """
        # Base filters
        query = db.query(self.model).filter(
            self.model.id != user.id,
            self.model.is_active == True,
            self.model.role != "admin",
            self.model.id != 0
        )

        if is_privileged:
             query = query.filter(
                or_(self.model.is_visible_in_matches == True, self.model.role == "test")
            )
        else:
             query = query.filter(
                self.model.is_visible_in_matches == True,
                self.model.role != "test"
            )

        # Optimization: Limit candidate pool to 100 before processing python side
        return query.limit(100).all()

    def get_discover_candidates(self, db: Session, user: models.User, is_privileged: bool, limit: int = 50) -> List[models.User]:
        query = db.query(self.model).filter(
            self.model.id != user.id,
            self.model.is_active == True,
            self.model.role != "admin",
            self.model.id != 0
        )

        if is_privileged:
            query = query.filter(
                or_(self.model.is_visible_in_matches == True, self.model.role == "test")
            )
        else:
            query = query.filter(
                self.model.is_visible_in_matches == True,
                self.model.role != "test"
            )

        return query.limit(limit).all()

    def delete_user(self, db: Session, user: models.User):
        """
        Delete a user and all their associated data (Messages, Notifications, Reports).
        We do this manually because we don't have database-level ON DELETE CASCADE for everything
        and we want to ensure complete cleanup.
        """
        # 1. Delete Messages (Sent & Received)
        db.query(models.Message).filter(
            or_(models.Message.sender_id == user.id, models.Message.receiver_id == user.id)
        ).delete(synchronize_session=False)

        # 2. Delete Notifications
        db.query(models.Notification).filter(models.Notification.user_id == user.id).delete(synchronize_session=False)

        # 3. Delete Reports (Reporter & Reported)
        db.query(models.Report).filter(
            or_(models.Report.reporter_id == user.id, models.Report.reported_id == user.id)
        ).delete(synchronize_session=False)

        # 4. Delete User (LinkedAccounts handled by SQLAlchemy cascade)
        db.delete(user)
        db.commit()

user_service = UserService(models.User)
