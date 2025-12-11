from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.services.utils import get_setting
from app.core.database import SessionLocal
from app.db import schemas
import logging

logger = logging.getLogger(__name__)

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Whitelist paths that should ALWAYS work (static assets, config, login)
        whitelist = ["/public-config", "/static", "/docs", "/openapi.json", "/login", "/auth"]
        if any(request.url.path.startswith(path) for path in whitelist):
             return await call_next(request)

        try:
            # We need to check the setting. Using a fresh DB session.
            db = SessionLocal()
            try:
                # Check global maintenance mode setting
                maintenance_mode = get_setting(db, "maintenance_mode", False)

                if maintenance_mode:
                    # Check for Admin via X-User-ID (Project pattern)
                    user_id = request.headers.get('X-User-ID')
                    is_admin = False

                    if user_id:
                        try:
                            # Verify user is actually an admin in DB
                            from app.db.models import User
                            user = db.query(User).filter(User.id == int(user_id)).first()
                            if user and user.role == "admin":
                                is_admin = True
                        except Exception:
                            pass

                    if not is_admin:
                        return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})
            finally:
                db.close()

        except Exception as e:
            # If DB is down (OperationalError) or other startup issues
            logger.error(f"Maintenance Middleware DB Error: {e}")
            return JSONResponse(status_code=503, content={"detail": "Service Unavailable (Database Connection Failed)"})

        return await call_next(request)
