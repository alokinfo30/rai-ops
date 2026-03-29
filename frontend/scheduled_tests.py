from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ScheduledTest, AITest, ComplianceLog, ScheduleInterval
from datetime import datetime
import sys

scheduled_tests_bp = Blueprint('scheduled_tests', __name__, url_prefix='/api/scheduled_tests')

@scheduled_tests_bp.route('', methods=['POST'])
@jwt_required()
def create_scheduled_test():
    user_id = get_jwt_identity()
    data = request.json

    if not data:
        return jsonify({'error': 'No input data provided'}), 400

    required_fields = ['test_name', 'test_type', 'target_system', 'schedule_interval', 'start_date']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'error': f'Missing required field: {field}'}), 400

    try:
        schedule_interval = ScheduleInterval[data['schedule_interval'].upper()]
        start_date = datetime.fromisoformat(data['start_date'])
    except ValueError as e:
        return jsonify({'error': str(e)}), 400

    scheduled_test = ScheduledTest(
        user_id=user_id,
        test_name=data['test_name'],
        test_type=data['test_type'],
        target_system=data['target_system'],
        schedule_interval=schedule_interval,
        start_date=start_date
    )
    db.session.add(scheduled_test)
    db.session.commit()

    return jsonify({'message': 'Scheduled test created', 'scheduled_test': scheduled_test.to_dict()}), 201

@scheduled_tests_bp.route('/<int:scheduled_test_id>', methods=['GET'])
@jwt_required()
def get_scheduled_test(scheduled_test_id):
    user_id = get_jwt_identity()
    scheduled_test = ScheduledTest.query.filter_by(id=scheduled_test_id, user_id=user_id).first()

    if not scheduled_test:
        return jsonify({'error': 'Scheduled test not found'}), 404

    return jsonify(scheduled_test.to_dict())

@scheduled_tests_bp.route('/<int:scheduled_test_id>', methods=['PUT'])
@jwt_required()
def update_scheduled_test(scheduled_test_id):
    user_id = get_jwt_identity()
    scheduled_test = ScheduledTest.query.filter_by(id=scheduled_test_id, user_id=user_id).first()

    if not scheduled_test:
        return jsonify({'error': 'Scheduled test not found'}), 404

    data = request.json

    if 'test_name' in data:
        scheduled_test.test_name = data['test_name']
    if 'test_type' in data:
        scheduled_test.test_type = data['test_type']
    if 'target_system' in data:
        scheduled_test.target_system = data['target_system']
    if 'schedule_interval' in data:
        try:
            scheduled_test.schedule_interval = ScheduleInterval[data['schedule_interval'].upper()]
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
    if 'start_date' in data:
        try:
            scheduled_test.start_date = datetime.fromisoformat(data['start_date'])
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
    if 'is_active' in data:
        scheduled_test.is_active = data['is_active']

    db.session.commit()

    return jsonify({'message': 'Scheduled test updated', 'scheduled_test': scheduled_test.to_dict()})

@scheduled_tests_bp.route('/<int:scheduled_test_id>', methods=['DELETE'])
@jwt_required()
def delete_scheduled_test(scheduled_test_id):
    user_id = get_jwt_identity()
    scheduled_test = ScheduledTest.query.filter_by(id=scheduled_test_id, user_id=user_id).first()

    if not scheduled_test:
        return jsonify({'error': 'Scheduled test not found'}), 404

    db.session.delete(scheduled_test)
    db.session.commit()

    return jsonify({'message': 'Scheduled test deleted'})

@scheduled_tests_bp.route('', methods=['GET'])
@jwt_required()
def get_scheduled_tests():
    user_id = get_jwt_identity()
    scheduled_tests = ScheduledTest.query.filter_by(user_id=user_id).all()

    return jsonify([scheduled_test.to_dict() for scheduled_test in scheduled_tests])