import json
import logging
import random
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

from app.core.config import PROJECT_NAME
from app.db import models, schemas
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


# --- Settings Helpers ---
def get_setting(db: Session, key: str, default):
    try:
        setting = (
            db.query(models.SystemSetting)
            .filter(models.SystemSetting.key == key)
            .first()
        )
        if setting:
            return json.loads(setting.value)
        if hasattr(default, "dict"):
            return default.dict()
        return default
    except Exception as e:
        logger.error(f"DB Error in get_setting: {e}. DB Type: {type(db)}")
        return default


def save_setting(db: Session, key: str, value: dict):
    try:
        setting = (
            db.query(models.SystemSetting)
            .filter(models.SystemSetting.key == key)
            .first()
        )
        if not setting:
            setting = models.SystemSetting(key=key, value=json.dumps(value))
            db.add(setting)
        else:
            setting.value = json.dumps(value)
        db.commit()
    except Exception as e:
        logger.error(f"DB Error in save_setting: {e}")
        db.rollback()


# --- HTML Email Helper ---
def create_html_email(
    title: str,
    content: str,
    action_url: str = None,
    action_text: str = None,
    server_domain: str = "",
    db: Session = None,
):
    if server_domain.endswith("/"):
        server_domain = server_domain[:-1]

    # Determine host URL with fallback chain
    host_url = server_domain if server_domain else None
    support_url = None
    contact_email = None
    support_enabled = False

    if db:
        try:
            reg_config = get_setting(db, "registration", {})
            if not host_url:
                host_url = reg_config.get("server_domain", "")
                if host_url and host_url.endswith("/"):
                    host_url = host_url[:-1]

            # Fetch Support & Legal Config
            support_conf = get_setting(
                db, "support_page", schemas.SupportPageConfig().dict()
            )
            if isinstance(support_conf, dict):
                support_enabled = support_conf.get("enabled", True)

            legal_conf = get_setting(db, "legal", schemas.LegalConfig().dict())
            if isinstance(legal_conf, dict):
                contact_email = legal_conf.get("contact_email", "")

            if host_url and support_enabled:
                support_url = f"{host_url}/support"

        except Exception as e:
            logger.warn(f"Failed to fetch settings for email build: {e}")

    if not host_url:
        host_url = "http://solumati.local"

    github_url = "https://github.com/FaserF/Solumati"

    logo_svg = ""  # Removed inline SVG

    # Default to GitHub Raw URL (Always works, fallback)
    github_logo = "https://raw.githubusercontent.com/FaserF/Solumati/refs/heads/main/frontend/public/logo/android-chrome-192x192.png"
    logo_full_url = github_logo

    # Try to use Hosted Logo if we are on a real domain (not localhost)
    if host_url and "localhost" not in host_url and "127.0.0.1" not in host_url:
        logo_path = "/logo/android-chrome-192x192.png"
        # Construct clean URL
        base = host_url.rstrip("/")
        logo_full_url = f"{base}{logo_path}"
    footer_support_link = ""
    if support_url:
        footer_support_link = f' • <a href="{support_url}">Support</a>'
    elif contact_email:
        footer_support_link = f' • <a href="mailto:{contact_email}">Support</a>'

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{ font-family: 'Segoe UI', Helvetica, Arial, sans-serif; background-color: #f0f2f5; color: #1c1e21; margin: 0; padding: 0; }}
            .email-wrapper {{ width: 100%; background-color: #f0f2f5; padding: 40px 0; }}
            .email-container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }}

            .header {{
                background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%);
                padding: 40px 20px;
                text-align: center;
            }}
            .logo-container {{
                display: inline-block;
                background-color: white;
                border-radius: 16px;
                padding: 2px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .app-name {{
                color: white;
                font-size: 24px;
                font-weight: bold;
                margin-top: 15px;
                margin-bottom: 0;
                text-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}

            .content {{ padding: 40px 40px; line-height: 1.6; color: #4b5563; font-size: 16px; }}
            .content h1 {{ color: #111827; font-size: 22px; margin-top: 0; margin-bottom: 20px; }}
            .content p {{ margin-bottom: 16px; }}

            .button-container {{ text-align: center; margin-top: 30px; margin-bottom: 20px; }}
            .button {{
                display: inline-block;
                background: linear-gradient(to right, #ec4899, #8b5cf6);
                color: #ffffff !important;
                text-decoration: none;
                padding: 14px 28px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                box-shadow: 0 4px 6px rgba(236, 72, 153, 0.25);
            }}

            .footer {{
                background-color: #f9fafb;
                padding: 20px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
                font-size: 12px;
                color: #9ca3af;
            }}
            .footer a {{ color: #8b5cf6; text-decoration: none; margin: 0 8px; }}
            .footer p {{ margin: 5px 0; }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="email-container">
                <div class="header">
                    <div class="logo-container">
                        <img src="{logo_full_url}" alt="{PROJECT_NAME}" width="80" height="80" style="border-radius: 12px; display: block;">
                    </div>
                    <p class="app-name">{PROJECT_NAME}</p>
                </div>

                <div class="content">
                    <h1>{title}</h1>
                    <div style="color: #4b5563;">
                        {content}
                    </div>

                    {f'<div class="button-container"><a href="{action_url}" class="button">{action_text}</a></div>' if action_url else ''}
                </div>

                <div class="footer">
                    <p>Sent via Solumati System</p>
                    <p>
                        <a href="{host_url}">Open Solumati</a>
                        {footer_support_link} •
                        <a href="{github_url}">GitHub Repository</a>
                    </p>
                    <p style="margin-top: 10px; color: #d1d5db;">&copy; {datetime.now().year} Solumati Project</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    return html


def send_mail_sync(to_email: str, subject: str, html_body: str, db: Session):
    try:
        config_dict = get_setting(db, "mail", schemas.MailConfig())
        config = schemas.MailConfig(**config_dict)
        if not config.enabled:
            logger.info(f"Mail sending disabled. To: {to_email}")
            return

        # Safety Block: Never send to solumati.local (Dummy Users)
        if to_email.endswith("@solumati.local"):
            logger.info(f"Mail sending blocked for local/dummy domain: {to_email}")
            return

        msg = MIMEMultipart("alternative")
        msg["From"] = formataddr((config.sender_name, config.from_email))
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(html_body, "html"))

        if config.smtp_ssl:
            server = smtplib.SMTP_SSL(config.smtp_host, config.smtp_port)
        else:
            server = smtplib.SMTP(config.smtp_host, config.smtp_port)
            if config.smtp_tls:
                server.starttls()
        if config.smtp_user and config.smtp_password:
            server.login(config.smtp_user, config.smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")


# --- Core Logic Helpers ---


# Helper to get dynamic support phrase
def get_support_contact_html(db: Session, server_domain: str = "") -> str:
    support_phrase = "please contact support immediately"
    try:
        support_conf = get_setting(
            db, "support_page", schemas.SupportPageConfig().dict()
        )
        legal_conf = get_setting(db, "legal", schemas.LegalConfig().dict())

        support_enabled = isinstance(support_conf, dict) and support_conf.get(
            "enabled", True
        )
        contact_email = (
            legal_conf.get("contact_email", "") if isinstance(legal_conf, dict) else ""
        )

        if support_enabled and server_domain:
            return f'<a href="{server_domain}/support">contact support</a> immediately'
        elif contact_email:
            return f'<a href="mailto:{contact_email}">contact support</a> immediately'
    except:
        pass
    return support_phrase


def generate_unique_username(db: Session, real_name: str) -> str:
    base = real_name.strip() if real_name else "User"
    count = db.query(models.User).filter(models.User.real_name == base).count()
    suffix = count + 1
    while True:
        candidate = f"{base}#{suffix}"
        if not db.query(models.User).filter(models.User.username == candidate).first():
            return candidate
        suffix += 1


from app.services.questions_content import QUESTIONS, get_question_by_id


def calculate_compatibility(answers_a_raw, answers_b_raw, intent_a, intent_b) -> dict:
    """
    Calculates detailed compatibility score.
    Returns {score: float, details: list[str]}
    """
    # 1. Intent Check (Hard Filter? Or just Heavy Penalty?)
    # Let's say if intents don't match at all (e.g. Long term vs Short term), we penalize heavily.
    # For now, let's keep it simple: strict filter was old way, new way soft filter.
    intent_score = 100
    if intent_a and intent_b and intent_a != intent_b:
        intent_score = 40  # Mismatch penalty

    # 2. Parse Answers
    try:
        ans_a = (
            json.loads(answers_a_raw)
            if isinstance(answers_a_raw, str)
            else (answers_a_raw or {})
        )
        ans_b = (
            json.loads(answers_b_raw)
            if isinstance(answers_b_raw, str)
            else (answers_b_raw or {})
        )

    except:
        return {"score": 0, "details": [], "common": []}

    if not isinstance(ans_a, dict):
        ans_a = {}
    if not isinstance(ans_b, dict):
        ans_b = {}

    total_weight = 0
    earned_weight = 0
    details = []

    for qid_str, val_a in ans_a.items():
        qid = int(qid_str)
        if qid_str in ans_b:
            val_b = ans_b[qid_str]
            question = get_question_by_id(qid)
            if not question:
                continue

            weight = question.get("weight", 5)
            total_weight += weight

            # Distance: 0 means same answer (Perfect)
            # Max distance usually depends on options length, but let's assume options are ordinal?
            # Actually, for many categorical questions (like Diet), distance doesn't make sense unless we define it.
            # Simplified Logic: Exact Match = 100%, Mismatch = 0%
            # For ordinal (1-5 scale), we could use distance.
            # Let's assume Exact Match logic for simplicity for now, as most questions are categorical.

            if val_a == val_b:
                earned_weight += weight
                details.append(f"Matched on: {question['category']}")  # Summary

    # Calculate Score
    if total_weight == 0:
        final_score = intent_score if intent_score < 100 else 50  # Default if no data
    else:
        match_percentage = (earned_weight / total_weight) * 100
        # Combine with intent score (Intent is 30% of total?)
        final_score = (match_percentage * 0.7) + (intent_score * 0.3)

    return {
        "score": round(final_score),
        "details": list(set(details)),  # Unique categories matched
    }


def send_login_notification(email: str, ip: str, user_agent: str, user=None):
    """
    Sends a notification email upon login.
    This function is intended to be run as a background task.
    If user object is provided, respects user's email notification preferences.
    """
    # Create a new database session for this task since it runs in the background
    # and the original dependency session might be closed.
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        # Check user preference if user object is provided
        if user:
            prefs = get_user_email_preferences(user)
            if not prefs.get("login_alerts", True):
                # logger.info(f"Login notification skipped for {email} - disabled by user preference")
                return

        # Determine Support String
        reg_config = get_setting(db, "registration", {})
        server_domain = reg_config.get("server_domain", "")
        support_link_html = get_support_contact_html(db, server_domain)

        title = "New Login Detected"
        content = f"""
        We detected a new login to your {PROJECT_NAME} account.<br><br>
        <b>IP Address:</b> {ip}<br>
        <b>Device:</b> {user_agent}<br>
        <b>Time:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br><br>
        If this was you, you can ignore this email. If you did not authorize this login, {support_link_html}.
        """
        html = create_html_email(title, content, server_domain=server_domain, db=db)
        send_mail_sync(email, title, html, db)
    except Exception as e:
        logger.error(f"Error in send_login_notification: {e}")
    finally:
        db.close()


def send_registration_notification(new_user, db_session=None):
    """
    Sends a notification email to the admin when a new user registers.
    This function is intended to be run as a background task.
    """
    from app.core.database import SessionLocal

    db = db_session if db_session else SessionLocal()
    try:
        # Check if registration notifications are enabled
        reg_notif_config = get_setting(
            db, "registration_notification", {"enabled": False, "email_target": ""}
        )
        if not reg_notif_config.get("enabled", False):
            return

        target_email = reg_notif_config.get("email_target", "")
        if not target_email:
            return

        title = "New User Registration"
        content = f"""
        A new user has registered on your {PROJECT_NAME} instance.<br><br>
        <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">User ID</td>
                <td style="padding: 12px 0; color: #6b7280;">#{new_user.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Username</td>
                <td style="padding: 12px 0; color: #6b7280;">{new_user.username}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Email</td>
                <td style="padding: 12px 0; color: #6b7280;">{new_user.email}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Name</td>
                <td style="padding: 12px 0; color: #6b7280;">{new_user.real_name or 'Not provided'}</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; font-weight: bold; color: #374151;">Registered</td>
                <td style="padding: 12px 0; color: #6b7280;">{datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}</td>
            </tr>
        </table>
        <br>
        <p style="color: #9ca3af; font-size: 14px;">You can manage this user in the Admin Panel.</p>
        """

        # Get server domain for the "Open Solumati" link
        reg_config = get_setting(db, "registration", {})
        server_domain = reg_config.get("server_domain", "")
        admin_url = f"{server_domain}/admin" if server_domain else None

        html = create_html_email(
            title,
            content,
            action_url=admin_url,
            action_text="Open Admin Panel" if admin_url else None,
            server_domain=server_domain,
            db=db,
        )
        send_mail_sync(
            target_email, f"[{PROJECT_NAME}] New User: {new_user.username}", html, db
        )
        logger.info(
            f"Registration notification sent to {target_email} for user {new_user.username}"
        )
    except Exception as e:
        logger.error(f"Error in send_registration_notification: {e}")
    finally:
        if not db_session:
            db.close()


def get_user_email_preferences(user) -> dict:
    """
    Get user's email notification preferences from their app_settings.
    Returns default preferences if not configured.
    """
    import json

    try:
        # Parse app_settings JSON string
        settings = {}
        if hasattr(user, "app_settings") and user.app_settings:
            settings = (
                json.loads(user.app_settings)
                if isinstance(user.app_settings, str)
                else user.app_settings
            )
        email_prefs = settings.get("email_notifications", {})
        return {
            "login_alerts": email_prefs.get("login_alerts", True),
            "security_alerts": email_prefs.get("security_alerts", True),
            "new_matches": email_prefs.get("new_matches", True),
            "new_messages": email_prefs.get("new_messages", False),
        }
    except:
        return {
            "login_alerts": True,
            "security_alerts": True,
            "new_matches": True,
            "new_messages": False,
        }


def send_password_changed_notification(user, db_session=None):
    """
    Sends a notification email when user changes their password.
    This function is intended to be run as a background task.
    """
    from app.core.database import SessionLocal

    db = db_session if db_session else SessionLocal()
    try:
        # Check user preference
        prefs = get_user_email_preferences(user)
        if not prefs.get("security_alerts", True):
            return

        # Determine Support String
        reg_config = get_setting(db, "registration", {})
        server_domain = reg_config.get("server_domain", "")
        support_link_html = get_support_contact_html(db, server_domain)

        title = "Password Changed"
        content = f"""
        Your {PROJECT_NAME} password was just changed.<br><br>
        <b>Time:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br><br>
        If you made this change, you can ignore this email.<br>
        If you did not change your password, please reset it immediately and {support_link_html}.
        """

        reset_url = f"{server_domain}/forgot-password" if server_domain else None

        html = create_html_email(
            title,
            content,
            action_url=reset_url,
            action_text="Reset Password" if reset_url else None,
            server_domain=server_domain,
            db=db,
        )
        send_mail_sync(user.email, f"[{PROJECT_NAME}] {title}", html, db)
        logger.info(f"Password changed notification sent to {user.email}")
    except Exception as e:
        logger.error(f"Error in send_password_changed_notification: {e}")
    finally:
        if not db_session:
            db.close()


def send_email_changed_notification(old_email: str, new_email: str, db_session=None):
    """
    Sends a notification to the OLD email address when email is changed.
    This is a security measure and always sends regardless of preferences.
    This function is intended to be run as a background task.
    """
    from app.core.database import SessionLocal

    db = db_session if db_session else SessionLocal()
    try:
        # Determine Support String
        reg_config = get_setting(db, "registration", {})
        server_domain = reg_config.get("server_domain", "")
        support_link_html = get_support_contact_html(db, server_domain)

        title = "Email Address Changed"
        content = f"""
        The email address for your {PROJECT_NAME} account was just changed.<br><br>
        <b>Old Email:</b> {old_email}<br>
        <b>New Email:</b> {new_email}<br>
        <b>Time:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br><br>
        If you made this change, you can ignore this email.<br>
        If you did not authorize this change, {support_link_html}.
        """

        html = create_html_email(title, content, server_domain=server_domain, db=db)
        send_mail_sync(old_email, f"[{PROJECT_NAME}] {title}", html, db)
        logger.info(f"Email changed notification sent to {old_email}")
    except Exception as e:
        logger.error(f"Error in send_email_changed_notification: {e}")
    finally:
        if not db_session:
            db.close()


def send_account_deactivated_notification(user, reason: str = None, db_session=None):
    """
    Sends a notification when user account is deactivated/banned.
    This function is intended to be run as a background task.
    """
    from app.core.database import SessionLocal

    db = db_session if db_session else SessionLocal()
    try:
        # Determine Support String
        reg_config = get_setting(db, "registration", {})
        server_domain = reg_config.get("server_domain", "")
        support_link_html = get_support_contact_html(db, server_domain)

        title = "Account Suspended"
        reason_text = f"<b>Reason:</b> {reason}<br>" if reason else ""
        content = f"""
        Your {PROJECT_NAME} account has been suspended.<br><br>
        {reason_text}
        <b>Time:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br><br>
        If you believe this was a mistake, {support_link_html}.
        """

        html = create_html_email(title, content, server_domain=server_domain, db=db)
        send_mail_sync(user.email, f"[{PROJECT_NAME}] {title}", html, db)
        logger.info(f"Account deactivation notification sent to {user.email}")
    except Exception as e:
        logger.error(f"Error in send_account_deactivated_notification: {e}")
    finally:
        if not db_session:
            db.close()


def is_profile_complete(user: models.User) -> bool:
    """
    Checks if a user has completed their profile.
    Criteria:
    1. Has an image (image_url is not None)
    2. Has a custom 'about_me' (not default)
    3. Has meaningful answers (answers is not empty dict/list and not dummy)
    """
    if not user.image_url:
        return False
    if user.about_me == "Ich bin neu hier!":
        return False

    # Check Answers
    try:
        # Answers are stored as JSON string in DB
        if isinstance(user.answers, str):
            import json

            ans = json.loads(user.answers)
        else:
            ans = user.answers

        if not ans:
            return False
        if isinstance(ans, dict) and not ans:
            return False
        if isinstance(ans, list) and not ans:
            return False

        # Check for dummy answers [3,3,3,3]
        # Or just generally check if it looks like a real set of answers
        # Let's say: Must have at least one answer?
        # The frontend sends [3,3,3,3] as initial state maybe?
        # If it is a list of default values only?
        # For now, let's leniently accept any non-empty structure,
        # BUT explicitly reject the known dummy [3,3,3,3] if checking logic demands it.
        # User said: "Account ist erstellt... muss ggf. verifiziert werden... darf keine Personen sehen solange er nicht Fragen beantwortet hat."
        # If [3,3,3,3] means "No questions answered", return False.
        if ans == [3, 3, 3, 3]:
            return False

    except:
        return False

    return True
