from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from datetime import datetime, timedelta
import random
import json
import base64

# Local modules
from database import get_db
import models, schemas
from security import verify_password
from config import APP_BASE_URL, PROJECT_NAME
from dependencies import get_current_user_from_header
from utils import get_setting, save_setting, send_mail_sync

# 2FA Libraries
import pyotp
from webauthn import (
    generate_registration_options,
    verify_registration_response,
    generate_authentication_options,
    verify_authentication_response,
    options_to_json,
    base64url_to_bytes,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    UserVerificationRequirement,
    RegistrationCredential,
    AuthenticationCredential,
    AuthenticatorAttachment,
    PublicKeyCredentialDescriptor,

)

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

# --- 2FA Helpers ---

def generate_email_2fa_code(user: models.User, db: Session):
    code = str(random.randint(100000, 999999))
    user.email_2fa_code = code
    user.email_2fa_expires = datetime.utcnow() + timedelta(minutes=10)
    db.commit()

    # Send Mail
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))

    html = f"""
    <p>Your Solumati verification code is:</p>
    <h1>{code}</h1>
    <p>Valid for 10 minutes.</p>
    """

    send_mail_sync(user.email, "Solumati Login Verification", html, db)
    logger.info(f"Sent Email 2FA code to {user.email}")


from fastapi import BackgroundTasks
from utils import send_login_notification

@router.post("/login", response_model=schemas.TwoFactorLoginResponse)
def login(creds: schemas.UserLogin, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    logger.info(f"Login attempt for: {creds.login}")
    user = db.query(models.User).filter(
        or_(models.User.email == creds.login, models.User.username == creds.login)
    ).first()

    if not user or not verify_password(creds.password, user.hashed_password):
        raise HTTPException(401, "Invalid credentials")

    # Check Ban Status
    if not user.is_active:
        if user.banned_until and user.banned_until <= datetime.utcnow():
            user.is_active = True
            user.banned_until = None
            db.commit()
        else:
            raise HTTPException(403, "Account deactivated or banned.")

    # Check Maintenance Mode (Admins allowed)
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if reg_config.maintenance_mode and user.role != 'admin':
        raise HTTPException(503, "Maintenance Mode Active. Please try again later.")

    # Determine Available 2FA Methods
    available_methods = []
    if user.totp_secret:
        available_methods.append("totp")

    # Check for Passkeys
    try:
        creds = json.loads(user.webauthn_credentials or "[]")
        if creds:
            available_methods.append("passkey")
    except: pass

    # Check Email 2FA (Always available if config enabled, or if user specifically opted in?)
    # Logic: If user opted in OR if they have no other method but global email 2fa is enforced?
    # For now, let's treat it as: if they acted on it. But previous logic was user.two_factor_method == 'email'.
    # Let's say if they selected 'email' as method, it's available.
    # OR better: if global config allows, Email is always an option if they don't have others?
    # User requirement: "Allow user to select method if multiple available".
    # We'll stick to: if user.two_factor_method == 'email' OR user has it configured.
    # Currently Schema only has one 'two_factor_method' string.
    # BUT, we want to allow selection. So:
    if user.two_factor_method == 'email':
        available_methods.append("email")
    elif reg_config.email_2fa_enabled and not available_methods:
        # If no other methods, maybe we allow email?
        # For now, let's strictly follow what they have "setup".
        pass

    # Profile Completion Check
    # Considered complete if they have an image and a custom about_me (not default)
    is_profile_complete = (user.image_url is not None) and (user.about_me != "Ich bin neu hier!")

    # Check 2FA Requirement
    if available_methods:
        # If any method is available, we require 2FA authentication
        # Unless user.two_factor_method is explicitly 'none' (disabled).
        # But wait, if they have TOTP secret, they likely want 2FA.
        # The 'two_factor_method' field acts as a 'primary' or 'active' toggle.
        # If user.two_factor_method == 'none', we skip 2FA even if they have secrets?
        # User said: "If user has TOTP, he should not be able to set it up again".
        # Let's assume if two_factor_method is NOT 'none', 2FA is required.

        if user.two_factor_method != 'none':
             # If method is email, trigger code NOW (legacy support) or wait for selection?
             # If multiple methods, frontend asks user. If only one, maybe frontend auto-selects.
             # If Current Method is Email, we should probably generate code just in case.
             if user.two_factor_method == 'email':
                  generate_email_2fa_code(user, db)

             return {
                "require_2fa": True,
                "user_id": user.id,
                "method": user.two_factor_method, # Default/Preferred
                "available_methods": available_methods,
                "is_profile_complete": is_profile_complete
            }

    # No 2FA required
    # Trigger Notification (Background)
    ip = request.client.host if request.client else "Unknown"
    ua = request.headers.get("user-agent", "Unknown")
    try:
        background_tasks.add_task(send_login_notification, user.email, ip, ua)
    except Exception as e:
        logger.error(f"Failed to queue login email: {e}")

    user.last_login = datetime.utcnow()
    db.commit()
    logger.info(f"User {user.username} (Role: {user.role}) logged in successfully.")
    return {
        "require_2fa": False,
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "is_guest": user.is_guest,
        "is_admin": user.role == 'admin',
        "is_profile_complete": is_profile_complete
    }

@router.post("/auth/2fa/verify")
def verify_2fa_login(req: schemas.TwoFactorAuthRequest, db: Session = Depends(get_db)):
    """Verifies TOTP or Email Code for Login."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user: raise HTTPException(404, "User not found")

    valid = False

    if user.two_factor_method == 'totp':
        if not user.totp_secret:
            logger.error(f"2FA Verify Failed: User {user.username} has no TOTP secret set.")
            raise HTTPException(400, "TOTP not set up")

        totp = pyotp.TOTP(user.totp_secret)
        # valid_window=1 allows current time +/- 30 seconds (1 step)
        if totp.verify(req.code, valid_window=1):
            valid = True
        else:
            logger.warning(f"2FA Verify Failed: Invalid TOTP code for user {user.username}. Server Time: {datetime.utcnow()}")


    elif user.two_factor_method == 'email':
        if not user.email_2fa_code: raise HTTPException(400, "No code generated")
        if user.email_2fa_expires and datetime.utcnow() > user.email_2fa_expires:
             raise HTTPException(400, "Code expired")
        if req.code == user.email_2fa_code:
            valid = True
            user.email_2fa_code = None # Consume code

    elif user.two_factor_method == 'passkey':
        # Passkey handled via specific endpoint, this is fallback or error
        raise HTTPException(400, "Use WebAuthn endpoint for passkeys")
    else:
        # Fallback if method is none but we are here (should not happen)
        valid = True

    if valid:
        user.last_login = datetime.utcnow()
        db.commit()
        return {
            "status": "success",
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "is_guest": user.is_guest,
            "is_admin": user.role == 'admin'
        }
    else:
        logger.warning(f"Verification failed: Invalid code provided for User {user.username}")
        raise HTTPException(401, "Invalid 2FA Code")

# --- 2FA Setup Endpoints ---

@router.post("/users/2fa/setup/totp", response_model=schemas.TotpSetupResponse)
def setup_totp(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Generates a TOTP secret and returns it along with a provisioning URI."""
    secret = pyotp.random_base32()
    user.totp_secret = secret
    db.commit()

    uri = pyotp.totp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=PROJECT_NAME)
    return {"secret": secret, "uri": uri}

@router.post("/users/2fa/verify/totp")
def verify_totp_setup(req: schemas.TotpVerifyRequest, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Verifies the code to finalize TOTP setup."""
    if not user.totp_secret:
        raise HTTPException(400, "TOTP setup not initiated.")

    totp = pyotp.TOTP(user.totp_secret)
    if totp.verify(req.token):
        user.two_factor_method = 'totp'
        db.commit()
        return {"status": "enabled"}
    else:
        raise HTTPException(400, "Invalid code")

@router.post("/users/2fa/setup/email")
def setup_email_2fa(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Enables Email 2FA if allowed globally."""
    reg_config = schemas.RegistrationConfig(**get_setting(db, "registration", {}))
    if not reg_config.email_2fa_enabled:
        raise HTTPException(403, "Email 2FA is currently disabled by administrator.")

    user.two_factor_method = 'email'
    db.commit()
    return {"status": "enabled"}

@router.post("/users/2fa/disable")
def disable_2fa(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    user.two_factor_method = 'none'
    user.totp_secret = None
    user.webauthn_credentials = "[]"
    db.commit()
    return {"status": "disabled"}

@router.delete("/users/2fa/methods/{method}")
def remove_2fa_method(method: str, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Removes a specific 2FA method."""
    method = method.lower()
    if method == "totp":
        user.totp_secret = None
    elif method == "passkey":
        user.webauthn_credentials = "[]"
    elif method == "email":
        # Nothing specific to clear for email, just ensures it's not active
        pass
    else:
        raise HTTPException(400, "Unknown method")

    # Update Active Method if the removed one was active
    if user.two_factor_method == method:
        # Try to find a fallback
        if user.has_totp:
            user.two_factor_method = 'totp'
        elif user.has_passkeys:
             user.two_factor_method = 'passkey'
        else:
            user.two_factor_method = 'none'

    db.commit()
    return {
        "status": "removed",
        "active_method": user.two_factor_method
    }

# --- WebAuthn Setup ---

@router.post("/users/2fa/setup/webauthn/register/options")
def webauthn_register_options(user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Generate WebAuthn registration options."""
    # Retrieve existing credentials to prevent re-registration
    existing_creds = json.loads(user.webauthn_credentials or "[]")

    # Determine RP_ID from APP_BASE_URL
    # Logic: if APP_BASE_URL is http://localhost:3000, rp_id is localhost
    # If https://mydomain.com, rp_id is mydomain.com
    from urllib.parse import urlparse
    parsed = urlparse(APP_BASE_URL)
    rp_id = parsed.hostname or "localhost"

    try:
        options = generate_registration_options(
            rp_id=rp_id,
            rp_name=PROJECT_NAME,
            user_id=str(user.id).encode(),
            user_name=str(user.email), # Ensure string
            exclude_credentials=[
                RegistrationCredential(
                    id=base64url_to_bytes(cred["id"]),
                    transports=cred.get("transports")
                ) for cred in existing_creds
            ],
            authenticator_selection=AuthenticatorSelectionCriteria(
                authenticator_attachment=AuthenticatorAttachment.CROSS_PLATFORM,
                user_verification=UserVerificationRequirement.PREFERRED
            )
        )
    except Exception as e:
        logger.error(f"WebAuthn generation failed: {e}", exc_info=True)
        raise HTTPException(500, f"Internal Error generating passkey options: {str(e)}")

    import base64
    user.webauthn_challenge = base64.urlsafe_b64encode(options.challenge).decode('utf-8').rstrip('=') if isinstance(options.challenge, bytes) else options.challenge
    db.commit()

    return json.loads(options_to_json(options))

@router.post("/users/2fa/setup/webauthn/register/verify")
def webauthn_register_verify(req: schemas.WebAuthnRegistrationResponse, request: Request, user: models.User = Depends(get_current_user_from_header), db: Session = Depends(get_db)):
    """Verify WebAuthn registration response."""
    if not user.webauthn_challenge:
        raise HTTPException(400, "No registration challenge found")

    try:
        from urllib.parse import urlparse
        parsed = urlparse(APP_BASE_URL)
        rp_id = parsed.hostname or "localhost"

        verification = verify_registration_response(
            credential=req.credential,
            expected_challenge=base64url_to_bytes(user.webauthn_challenge),
            expected_origin=APP_BASE_URL,
            expected_rp_id=rp_id,
            require_user_verification=False # Simplifying for dev
        )

        # Save Credential
        existing_creds = json.loads(user.webauthn_credentials or "[]")

        # Convert credential to dict safe for JSON
        # Need to base64url encode bytes
        def b64_encode(b):
            return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

        new_cred = {
            "id": b64_encode(verification.credential_id),
            "public_key": b64_encode(verification.credential_public_key),
            "sign_count": verification.sign_count,
            "transports": req.credential.get("response", {}).get("transports", [])
        }

        new_cred["id"] = base64.urlsafe_b64encode(verification.credential_id).decode().rstrip("=")
        new_cred["public_key"] = base64.urlsafe_b64encode(verification.credential_public_key).decode().rstrip("=")

        existing_creds.append(new_cred)
        user.webauthn_credentials = json.dumps(existing_creds)
        user.two_factor_method = 'passkey'
        user.webauthn_challenge = None
        db.commit()
        return {"status": "verified", "method": "passkey"}

    except Exception as e:
        logger.error(f"WebAuthn verification failed: {e}")
        raise HTTPException(400, f"Verification failed: {str(e)}")


# --- WebAuthn Authentication ---

@router.post("/auth/2fa/webauthn/options")
def webauthn_auth_options(body: dict, db: Session = Depends(get_db)):
    """Get auth options for a user (Login Step 1)."""
    user_id = body.get("user_id")
    username = body.get("username")

    user = None
    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
    elif username:
        user = db.query(models.User).filter(or_(models.User.email == username, models.User.username == username)).first()

    if not user: raise HTTPException(404, "User not found")

    existing_creds = json.loads(user.webauthn_credentials or "[]")

    # If no credentials, cannot do passkey login
    if not existing_creds:
        raise HTTPException(400, "No passkeys registered for this user.")

    from urllib.parse import urlparse
    parsed = urlparse(APP_BASE_URL)
    rp_id = parsed.hostname or "localhost"

    try:
        options = generate_authentication_options(
            rp_id=rp_id,
            allow_credentials=[
                PublicKeyCredentialDescriptor(id=base64url_to_bytes(cred["id"]))
                for cred in existing_creds
            ]
        )
    except Exception as e:
        logger.error(f"WebAuthn Auth Options Error: {e}", exc_info=True)
        # Check if it is a padding error, maybe credential ID is corrupted?
        raise HTTPException(500, f"Internal Error generating auth options: {str(e)}")

    import base64
    user.webauthn_challenge = base64.urlsafe_b64encode(options.challenge).decode('utf-8').rstrip('=') if isinstance(options.challenge, bytes) else options.challenge
    db.commit()

    return {
        "options": json.loads(options_to_json(options)),
        "user_id": user.id
    }

@router.post("/auth/2fa/webauthn/verify")
def webauthn_auth_verify(req: schemas.WebAuthnAuthResponse, db: Session = Depends(get_db)):
    """Verify Passkey Assertion (Login Step 2)."""
    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user or not user.webauthn_challenge:
        raise HTTPException(400, "Invalid challenge state")

    try:
        existing_creds = json.loads(user.webauthn_credentials or "[]")

        # Find the credential used
        cred_id_input = req.credential.get("id")
        credential_data = next((c for c in existing_creds if c["id"] == cred_id_input), None)

        if not credential_data:
            raise HTTPException(400, "Credential not known")

        from urllib.parse import urlparse
        parsed = urlparse(APP_BASE_URL)
        rp_id = parsed.hostname or "localhost"

        verification = verify_authentication_response(
            credential=req.credential,
            expected_challenge=base64url_to_bytes(user.webauthn_challenge),
            expected_origin=APP_BASE_URL,
            expected_rp_id=rp_id,
            credential_public_key=base64.urlsafe_b64decode(credential_data["public_key"] + "=="),
            credential_current_sign_count=credential_data["sign_count"]
        )

        # Update sign count
        credential_data["sign_count"] = verification.new_sign_count
        user.webauthn_credentials = json.dumps(existing_creds)
        user.webauthn_challenge = None
        user.last_login = datetime.utcnow()
        db.commit()

        return {
            "status": "success",
            "user_id": user.id,
            "username": user.username,
            "role": user.role,
            "is_guest": user.is_guest,
            "is_admin": user.role == 'admin'
        }
    except Exception as e:
        logger.error(f"Passkey auth failed: {e}")
        raise HTTPException(400, f"Authentication failed: {str(e)}")