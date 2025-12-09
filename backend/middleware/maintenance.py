from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from utils import get_setting
from database import SessionLocal
import schemas
import logging

logger = logging.getLogger(__name__)

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # We need to check the setting. Using a fresh DB session.
        db = SessionLocal()
        try:
            reg_config_dict = get_setting(db, "registration", {})
            reg_config = schemas.RegistrationConfig(**reg_config_dict)

            if reg_config.maintenance_mode:
                # Check for Admin via X-User-ID (Project pattern)
                user_id = request.headers.get('X-User-ID')
                is_admin = False

                if user_id:
                    try:
                        # Verify user is actually an admin in DB
                        from models import User
                        user = db.query(User).filter(User.id == int(user_id)).first()
                        if user and user.role == "admin":
                            is_admin = True
                    except Exception:
                        pass

                if not is_admin:
                    # Allow some paths? typically login might be needed for admin,
                    # but if auth is handled by router, middleware runs before.
                    # Assuming strict maintenance except for already authenticated admins (via header?)
                    # If this is a simple middleware, we might block everything.
                    # Let's check the request path to allow login if needed?
                    # For now, sticking to the logic found in the fragment: block if not admin.
                    # But checking path for login/token endpoints is usually good practice.
                    if "/login" not in request.url.path and "/auth" not in request.url.path:
                         return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})

        except Exception as e:
            logger.error(f"Middleware Error: {e}")
        finally:
            db.close()

        return await call_next(request)
