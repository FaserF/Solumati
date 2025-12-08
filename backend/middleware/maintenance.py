from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from utils import get_setting
from database import get_db
import schemas
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
                     return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})

                if not is_admin:
                     return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})

        except Exception as e:
            # logger.error(f"Middleware Error: {e}")
            pass

        return await call_next(request)
