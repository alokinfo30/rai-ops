from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User
import sys

user_bp = Blueprint('user', __name__, url_prefix='/api/user')

@user_bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_account():
    try:
        user_id = get_jwt_identity()
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': 'Account deleted successfully'}), 200
    except Exception as e:
        print(f"Error deleting account: {e}", file=sys.stderr)
        db.session.rollback()
        return jsonify({'error': 'Failed to delete account'}), 500