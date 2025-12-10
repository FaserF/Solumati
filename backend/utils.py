import json
from datetime import datetime
import random
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from sqlalchemy.orm import Session
import models, schemas
from config import PROJECT_NAME

logger = logging.getLogger(__name__)

# --- Settings Helpers ---
def get_setting(db: Session, key: str, default):
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
        if setting:
            return json.loads(setting.value)
        if hasattr(default, 'dict'):
            return default.dict()
        return default
    except Exception as e:
        logger.error(f"DB Error in get_setting: {e}. DB Type: {type(db)}")
        return default

def save_setting(db: Session, key: str, value: dict):
    try:
        setting = db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()
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
def create_html_email(title: str, content: str, action_url: str = None, action_text: str = None, server_domain: str = ""):
    if server_domain.endswith("/"): server_domain = server_domain[:-1]

    # Logo URL (GitHub Raw for reliability)
    logo_url = "https://raw.githubusercontent.com/FaserF/Solumati/main/frontend/public/logo/windows11/Square150x150Logo.png"
    host_url = "https://solumati.fabiseitz.de"
    github_url = "https://github.com/FaserF/Solumati"

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
            .logo {{
                width: 80px;
                height: 80px;
                border-radius: 16px;
                background-color: white;
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
                    <img src="{logo_url}" alt="Solumati Logo" class="logo">
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
                        <a href="{host_url}">Open Solumati</a> •
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

        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr((config.sender_name, config.from_email))
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_body, 'html'))

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
def generate_unique_username(db: Session, real_name: str) -> str:
    base = real_name.strip() if real_name else "User"
    count = db.query(models.User).filter(models.User.real_name == base).count()
    suffix = count + 1
    while True:
        candidate = f"{base}#{suffix}"
        if not db.query(models.User).filter(models.User.username == candidate).first():
            return candidate
        suffix += 1

from questions_content import QUESTIONS, get_question_by_id

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
        intent_score = 40 # Mismatch penalty

    # 2. Parse Answers
    try:
        ans_a = json.loads(answers_a_raw) if isinstance(answers_a_raw, str) else (answers_a_raw or {})
        ans_b = json.loads(answers_b_raw) if isinstance(answers_b_raw, str) else (answers_b_raw or {})

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
            if not question: continue

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
                details.append(f"Matched on: {question['category']}") # Summary

    # Calculate Score
    if total_weight == 0:
        final_score = intent_score if intent_score < 100 else 50 # Default if no data
    else:
        match_percentage = (earned_weight / total_weight) * 100
        # Combine with intent score (Intent is 30% of total?)
        final_score = (match_percentage * 0.7) + (intent_score * 0.3)

    return {
        "score": round(final_score),
        "details": list(set(details)) # Unique categories matched
    }

def send_login_notification(email: str, ip: str, user_agent: str):
    """
    Sends a notification email upon login.
    This function is intended to be run as a background task.
    """
    # Create a new database session for this task since it runs in the background
    # and the original dependency session might be closed.
    from database import SessionLocal
    db = SessionLocal()
    try:
        title = "New Login Detected"
        content = f"""
        We detected a new login to your {PROJECT_NAME} account.<br><br>
        <b>IP Address:</b> {ip}<br>
        <b>Device:</b> {user_agent}<br>
        <b>Time:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}<br><br>
        If this was you, you can ignore this email. If you did not authorize this login, please contact support immediately.
        """
        html = create_html_email(title, content, server_domain="") # Domain not critical here
        send_mail_sync(email, title, html, db)
    except Exception as e:
        logger.error(f"Error in send_login_notification: {e}")
    finally:
        db.close()