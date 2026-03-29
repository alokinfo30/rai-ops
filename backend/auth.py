from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
import sys
from models import db, User
from app import limiter

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
@limiter.limit("10 per hour")
def register():
    data = request.json
    if len(data.get('password', '')) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long'}), 400
    if '@' not in data.get('email', ''):
        return jsonify({'error': 'Invalid email format'}), 400
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    user = User(
        username=data['username'],
        email=data['email'],
        company=data.get('company', '')
    )
    user.set_password(data['password'])
    db.session.add(user)
    db.session.commit()
    return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201

@auth_bp.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and user.check_password(data['password']):
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user.to_dict()
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    current_user_id = get_jwt_identity()
    new_access_token = create_access_token(identity=current_user_id)
    return jsonify({'access_token': new_access_token}), 200

@auth_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    data = request.json
    if not user:
        return jsonify({'error': 'User not found'}), 404
    if 'company' in data:
        user.company = data['company']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    db.session.commit()
    return jsonify({'message': 'Profile updated successfully', 'user': user.to_dict()})

@auth_bp.route('/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    data = request.json
    email = data.get('email')
    user = User.query.filter_by(email=email).first()
    if user:
        mock_reset_token = f"reset-token-for-{user.id}"
        print(f"MOCK EMAIL: Password reset link for {email}: /reset-password?token={mock_reset_token}", file=sys.stderr)
        return jsonify({'message': 'If an account exists, a reset link has been sent.', 'mock_token': mock_reset_token})
    return jsonify({'message': 'If an account exists, a reset link has been sent.'})

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')
    if not token or not token.startswith('reset-token-for-'):
        return jsonify({'error': 'Invalid or expired token'}), 400
    try:
        user_id = int(token.split('-')[-1])
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'Invalid token'}), 400
        user.set_password(new_password)
        db.session.commit()
        return jsonify({'message': 'Password reset successfully'})
    except ValueError:
        return jsonify({'error': 'Invalid token format'}), 400