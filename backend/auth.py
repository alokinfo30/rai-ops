import datetime
import logging
import os
import re

from flask import Blueprint, Response, current_app, jsonify, request
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    get_jwt_identity,
    jwt_required,
)
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from .email_service import send_email
from .extensions import db, limiter
from .models import ComplianceLog, User

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validates password strength."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number"
    return True, ""

@auth_bp.route("/register", methods=["POST"])
@limiter.limit("10 per hour")
def register() -> tuple[Response, int]:
    data = request.json
    is_valid, error_msg = validate_password_strength(data.get("password", ""))
    if not is_valid:
        return jsonify({"error": error_msg}), 400
    if "@" not in data.get("email", ""):
        return jsonify({"error": "Invalid email format"}), 400
    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already exists"}), 400
    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already exists"}), 400
    user = User(username=data["username"], email=data["email"], company=data.get("company", ""))
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()
    return jsonify({"message": "User created successfully", "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login() -> tuple[Response, int]:
    data = request.json
    user = User.query.filter_by(username=data["username"]).first()
    if user and user.check_password(data["password"]):
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        return jsonify(
            {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "user": user.to_dict(),
            }
        )
    
    # Security Compliance: Log failed login attempts
    log = ComplianceLog(
        user_id=None, # Anonymous failed attempt
        action="FAILED_LOGIN",
        resource="auth/login",
        status="FAILURE",
        details={"attempted_username": data.get("username")},
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"error": "Invalid credentials"}), 401


@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh() -> tuple[Response, int]:
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    return jsonify({"access_token": new_access_token}), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    if not user:
        return jsonify({"error": "User not found"}), 404
    if "email" in data and data["email"] != user.email:
        if User.query.filter_by(email=data["email"]).first():
            return jsonify({"error": "Email already in use"}), 400
        user.email = data["email"]
    if "company" in data:
        user.company = data["company"]
    if "password" in data and data["password"]:
        is_valid, error_msg = validate_password_strength(data["password"])
        if not is_valid:
            return jsonify({"error": error_msg}), 400
        user.set_password(data["password"])

    log = ComplianceLog(
        user_id=user_id,
        action="UPDATE_PROFILE",
        resource=f"user/{user_id}",
        status="SUCCESS",
        details={"updated_fields": [k for k in data if k != "password"]},
        ip_address=request.remote_addr,
    )
    db.session.add(log)

    db.session.commit()
    return jsonify({"message": "Profile updated successfully", "user": user.to_dict()})


@auth_bp.route("/forgot-password", methods=["POST"])
@limiter.limit("5 per hour")
def forgot_password() -> tuple[Response, int]:
    data = request.json
    email = data.get("email")
    user = User.query.filter_by(email=email).first()
    if user:
        s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
        token = s.dumps(user.email, salt="password-reset")
        
        base_url = current_app.config.get("FRONTEND_URL", "http://localhost:8000")
        reset_link = f"{base_url}/reset-password?token={token}"

        subject = "Password Reset Request"
        body = f"Please use the following link to reset your password: {reset_link}"
        html_body = f"""<html>
            <body>
                <h2>Password Reset</h2>
                <p>Hello {user.username},</p>
                <p>We received a request to reset your password. Please click the link below:</p>  # noqa: E501
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>If you did not request this change, please ignore this email.</p>
            </body>
        </html>"""

        # Attempt to send email, fallback to log if not configured
        if not send_email(email, subject, body, html_body):
            # Development fallback: Log the reset link for testing
            dev_log_path = os.path.join(current_app.root_path, "..", "sent_emails.log")
            try:
                with open(dev_log_path, "a") as f:
                    f.write(f"[{datetime.now().isoformat()}] Reset Link for {email}: {reset_link}\n")
                logger.info(f"Password reset link logged for development: {email}")
            except Exception as e:
                logger.error(f"Failed to log reset link: {e}")
            
            # Return success response without exposing the token in production
            response_data = {
                "message": "If an account exists, a reset link has been sent.",
            }
            
            # Only include mock token in development
            if current_app.config.get('ENV') == 'development':
                response_data["mock_token"] = token
            
            return jsonify(response_data), 200

    return jsonify({"message": "If an account exists, a reset link has been sent."}), 200


@auth_bp.route("/reset-password", methods=["POST"])
@limiter.limit("5 per hour")
def reset_password() -> tuple[Response, int]:
    data = request.json
    token = data.get("token")
    new_password = data.get("password")
    
    if not token:
        return jsonify({"error": "Missing token"}), 400

    is_valid, error_msg = validate_password_strength(new_password)
    if not is_valid:
        return jsonify({"error": error_msg}), 400

    s = URLSafeTimedSerializer(current_app.config["SECRET_KEY"])
    try:
        email = s.loads(token, salt="password-reset", max_age=3600)  # 1 hour expiration
        user = User.query.filter_by(email=email).first()
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        user.set_password(new_password)

        log = ComplianceLog(
            user_id=user.id,
            action="PASSWORD_RESET",
            resource=f"user/{user.id}",
            status="SUCCESS",
            details={"method": "token_reset"},
            ip_address=request.remote_addr,
        )
        db.session.add(log)
        db.session.commit()
        return jsonify({"message": "Password reset successfully"})
    except (SignatureExpired, BadSignature):
        return jsonify({"error": "Invalid or expired token"}), 400