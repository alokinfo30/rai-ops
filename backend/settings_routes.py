from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from .extensions import db

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

# Simple in-memory storage for demo purposes since we aren't running migrations
# In production, this would be a UserSettings table
MOCK_SETTINGS_DB = {}

@settings_bp.route("", methods=["GET"])
@jwt_required()
def get_settings() -> Response:
    user_id = get_jwt_identity()
    defaults = {
        "alert_threshold": 80,
        "email_notifications": True,
        "digest_frequency": "daily",
        "dark_mode_default": False
    }
    return jsonify(MOCK_SETTINGS_DB.get(user_id, defaults))

@settings_bp.route("", methods=["POST"])
@jwt_required()
def update_settings() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    data = request.json
    
    if not data:
        return jsonify({"error": "No data provided"}), 400

    current = MOCK_SETTINGS_DB.get(user_id, {
        "alert_threshold": 80,
        "email_notifications": True,
        "digest_frequency": "daily",
        "dark_mode_default": False
    })
    
    # Update allowed fields
    for key in current.keys():
        if key in data:
            current[key] = data[key]
            
    MOCK_SETTINGS_DB[user_id] = current
    
    # In a real app: db.session.commit()
    
    return jsonify({"message": "Settings updated", "settings": current}), 200