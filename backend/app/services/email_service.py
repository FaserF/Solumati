"""
Email Service
Handles all email-related operations with proper typing and error handling.
"""
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import PROJECT_NAME
from app.db import schemas
from app.services.settings_service import SettingsService

logger = logging.getLogger(__name__)


class EmailService:
    @staticmethod
    def create_html_email(
        title: str,
        content: str,
        action_url: str = None,
        action_text: str = None,
        server_domain: str = "",
        db: Session = None,
    ) -> str:
        if server_domain.endswith("/"):
            server_domain = server_domain[:-1]

        host_url = server_domain or "http://solumati.local"
        support_url = None
        contact_email = None

        if db:
            try:
                # Fetch settings for footer
                reg_config = SettingsService.get(db, "registration", {})
                if not server_domain:
                     host_url = reg_config.get("server_domain", host_url)

                support_conf = SettingsService.get(db, "support_page", {})
                legal_conf = SettingsService.get(db, "legal", {})

                if isinstance(support_conf, dict) and support_conf.get("enabled", True):
                    support_url = f"{host_url}/support"

                contact_email = legal_conf.get("contact_email") if isinstance(legal_conf, dict) else None

            except Exception as e:
                logger.warn(f"Failed to fetch settings for email build: {e}")

        footer_links = []
        if support_url:
            footer_links.append(f'<a href="{support_url}">Support</a>')
        elif contact_email:
            footer_links.append(f'<a href="mailto:{contact_email}">Support</a>')

        footer_html = " • ".join(footer_links)
        if footer_html: footer_html = " • " + footer_html

        # Template
        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 0; }}
                .wrapper {{ width: 100%; padding: 40px 0; background-color: #f4f4f5; }}
                .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }}
                .header {{ background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); padding: 32px 24px; text-align: center; }}
                .app-name {{ color: white; font-size: 24px; font-weight: 700; margin: 0; }}
                .content {{ padding: 32px; line-height: 1.6; color: #3f3f46; }}
                .btn {{ display: inline-block; background-color: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }}
                .footer {{ padding: 24px; text-align: center; background-color: #fafafa; border-top: 1px solid #e4e4e7; font-size: 12px; color: #71717a; }}
                .footer a {{ color: #6366f1; text-decoration: none; }}
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <div class="app-name">{PROJECT_NAME}</div>
                    </div>
                    <div class="content">
                        <h2 style="margin-top: 0; color: #18181b;">{title}</h2>
                        <div>{content}</div>
                        {f'<div style="text-align: center;"><a href="{action_url}" class="btn">{action_text}</a></div>' if action_url else ''}
                    </div>
                    <div class="footer">
                        <p>Sent via {PROJECT_NAME} System</p>
                        <p><a href="{host_url}">Open App</a>{footer_html}</p>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def send_mail_sync(to_email: str, subject: str, html_body: str, db: Session) -> bool:
        """
        Send an email synchronously.

        Args:
            to_email: Recipient email address
            subject: Email subject
            html_body: HTML content
            db: Database session for config lookup

        Returns:
            True if sent successfully, False otherwise
        """
        try:
            config = SettingsService.get_mail_config(db)

            if not config.enabled:
                logger.debug(f"Mail disabled. Skipping email to {to_email}")
                return False

            if to_email.endswith("@solumati.local"):
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
            logger.info(f"Email sent to {to_email}")

            # Log to DB
            try:
                from app.db import models
                from datetime import datetime
                log_entry = models.EmailLog(
                    recipient=to_email,
                    subject=subject,
                    status="sent",
                    timestamp=datetime.utcnow()
                )
                db.add(log_entry)
                db.commit()
            except:
                pass

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            try:
                from app.db import models
                from datetime import datetime
                log_entry = models.EmailLog(
                    recipient=to_email,
                    subject=subject,
                    status="failed",
                    error_message=str(e),
                    timestamp=datetime.utcnow()
                )
                db.add(log_entry)
                db.commit()
            except:
                pass

email_service = EmailService()
