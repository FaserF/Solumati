from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from utils import get_setting
from database import get_db
import schemas
from jose import jwt
from config import SECRET_KEY, ALGORITHM

class MaintenanceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        # Allow whitelisted paths
        if request.url.path.startswith(("/login", "/auth", "/admin", "/static", "/docs", "/openapi.json", "/public-config")) or request.method == "OPTIONS":
            return await call_next(request)

        try:
            db = next(get_db())
            reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))

            if reg_config.maintenance_mode:
                # Check for Admin Token
                auth_header = request.headers.get('Authorization')
                is_admin = False
                if auth_header:
                    try:
                        scheme, token = auth_header.split()
                        if scheme.lower() == 'bearer':
                            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                            if payload.get("role") == "admin":
                                is_admin = True
                    except:
                         pass

                if not is_admin:
                     return JSONResponse(status_code=503, content={"detail": "Maintenance Mode Active"})

        except Exception as e:
            # logger.error(f"Middleware Error: {e}")
            pass

        return await call_next(request)
