import logging
import smtplib
import os
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None, attachment_bytes: Optional[bytes] = None, attachment_name: Optional[str] = None) -> None:
    """
    Sends an email using SMTP settings from environment variables.
    Falls back to logging if SMTP_SERVER is not set.
    """
    smtp_server = os.environ.get("SMTP_SERVER")
    smtp_port = int(os.environ.get("SMTP_PORT", 587))
    sender_email = os.environ.get("SMTP_USERNAME", "noreply@rai-ops.local")
    sender_password = os.environ.get("SMTP_PASSWORD")

    # Mock email in development if no server configured
    if not smtp_server:
        logger.info("--- MOCK EMAIL START ---")
        logger.info(f"To: {to_email}")
        logger.info(f"Subject: {subject}")
        if attachment_name:
             logger.info(f"Attachment: {attachment_name} ({len(attachment_bytes) if attachment_bytes else 0} bytes)")
        logger.info("--- MOCK EMAIL END ---")
        return

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = subject

    msg.attach(MIMEText(body, "plain"))
    if html_body:
        msg.attach(MIMEText(html_body, "html"))

    if attachment_bytes and attachment_name:
        part = MIMEApplication(attachment_bytes, Name=attachment_name)
        part["Content-Disposition"] = f'attachment; filename="{attachment_name}"'
        msg.attach(part)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            if sender_password:
                server.login(sender_email, sender_password)
            server.send_message(msg)
        logger.info(f"Email sent successfully to {to_email}")
    except Exception as e:
        logger.error(f"Failed to send email: {e}")