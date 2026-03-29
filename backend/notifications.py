from flask import Blueprint, jsonify, Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from .extensions import db
from .models import Notification

notifications_bp = Blueprint(
    "notifications", __name__, url_prefix="/api/notifications"
)

@notifications_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications() -> Response:
    """
    Fetch recent user notifications.
    """
    user_id = get_jwt_identity()
    notifications = (
        Notification.query.filter_by(user_id=user_id)
        .order_by(Notification.timestamp.desc())
        .limit(50)
        .all()
    )
    return jsonify([n.to_dict() for n in notifications])

@notifications_bp.route("/<int:notif_id>/read", methods=["POST"])
@jwt_required()
def mark_read(notif_id: int) -> tuple[Response, int]:
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(
        id=notif_id, user_id=user_id
    ).first()

    if not notification:
        return jsonify({"error": "Notification not found"}), 404

    notification.is_read = True
    db.session.commit()
    return jsonify({"message": "Marked as read"}), 200