from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask.wrappers import Response
from .extensions import db
from .models import ComplianceLog, ScheduleInterval, ScheduledTest

scheduled_tests_bp = Blueprint(
    "scheduled_tests", __name__, url_prefix="/api/scheduled_tests"
)


@scheduled_tests_bp.route("", methods=["GET"])
@jwt_required()
def get_scheduled_tests() -> Response:
    user_id = get_jwt_identity()
    scheduled_tests = ScheduledTest.query.filter_by(user_id=user_id).all()
    return jsonify([test.to_dict() for test in scheduled_tests])


@scheduled_tests_bp.route("", methods=["POST"])
@jwt_required()
def create_scheduled_test() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    data = request.json

    required_fields = [
        "test_name",
        "test_type",
        "target_system",
        "schedule_interval",
        "start_date",
    ]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        interval = ScheduleInterval(data["schedule_interval"])
        start_date = datetime.fromisoformat(data["start_date"].replace("Z", "+00:00"))
    except ValueError:
        return jsonify({"error": "Invalid interval or date format"}), 400

    scheduled = ScheduledTest(
        user_id=user_id,
        test_name=data["test_name"],
        test_type=data["test_type"],
        target_system=data["target_system"],
        schedule_interval=interval,
        start_date=start_date,
        is_active=True,
    )

    try:
        scheduled.validate_schedule()
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    db.session.add(scheduled)
    db.session.flush()

    log = ComplianceLog(
        user_id=user_id,
        action="CREATE_SCHEDULE",
        resource=f"schedule/{scheduled.id}",
        status="SUCCESS",
        details={
            "test_name": scheduled.test_name,
            "interval": scheduled.schedule_interval.value,
        },
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Scheduled test created", "test": scheduled.to_dict()}), 201


@scheduled_tests_bp.route("/<int:test_id>", methods=["DELETE"])
@jwt_required()
def delete_scheduled_test(test_id: int) -> Response | tuple[Response, int]:
    user_id = get_jwt_identity()
    test = ScheduledTest.query.filter_by(id=test_id, user_id=user_id).first()

    if not test:
        return jsonify({"error": "Scheduled test not found"}), 404

    log = ComplianceLog(
        user_id=user_id,
        action="DELETE_SCHEDULE",
        resource=f"schedule/{test.id}",
        status="SUCCESS",
        details={"test_name": test.test_name},
        ip_address=request.remote_addr,
    )
    db.session.add(log)

    db.session.delete(test)
    db.session.commit()

    return jsonify({"message": "Scheduled test deleted"})