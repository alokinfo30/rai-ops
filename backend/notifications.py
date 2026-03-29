from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Notification
from datetime import datetime
import sys

notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

@notifications_bp.route('', methods=['GET'])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.timestamp.desc()).limit(20).all()
    return jsonify([notification.to_dict() for notification in notifications])

@notifications_bp.route('/<int:notification_id>', methods=['PUT'])
@jwt_required()
def mark_notification_as_read(notification_id):
    user_id = get_jwt_identity()
    notification = Notification.query.filter_by(id=notification_id, user_id=user_id).first()

    if not notification:
        return jsonify({'error': 'Notification not found'}), 404

    notification.is_read = True
    db.session.commit()

    return jsonify({'message': 'Notification marked as read', 'notification': notification.to_dict()})

@notifications_bp.route('/unread_count', methods=['GET'])
@jwt_required()
def get_unread_notifications_count():
    user_id = get_jwt_identity()
    unread_count = Notification.query.filter_by(user_id=user_id, is_read=False).count()
    return jsonify({'unread_count': unread_count})

def create_notification(user_id, message):
    notification = Notification(
        user_id=user_id,
        message=message
    )
    db.session.add(notification)
    db.session.commit()
    return notification