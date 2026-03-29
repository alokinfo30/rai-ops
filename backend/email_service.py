import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import os
import logging

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
def send_email(to_email, subject, body, html_body=None, attachment_bytes=None, attachment_name=None):
    """Sends an email using SMTP configuration from environment variables."""
    smtp_server = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    smtp_port = int(os.getenv('MAIL_PORT', 587))
    smtp_user = os.getenv('MAIL_USERNAME')
    smtp_password = os.getenv('MAIL_PASSWORD')
    
    if not smtp_user or not smtp_password:
        logger.warning("Email credentials (MAIL_USERNAME, MAIL_PASSWORD) not set. Skipping email send.")
        return False

    msg = MIMEMultipart('mixed')
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = subject

    # Create the body part (alternative allows client to choose text or html)
    msg_body = MIMEMultipart('alternative')
    msg_body.attach(MIMEText(body, 'plain'))
    if html_body:
        msg_body.attach(MIMEText(html_body, 'html'))
    msg.attach(msg_body)

    if attachment_bytes and attachment_name:
        part = MIMEApplication(attachment_bytes, Name=attachment_name)
        part['Content-Disposition'] = f'attachment; filename="{attachment_name}"'
        msg.attach(part)

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}", exc_info=True)
        return False