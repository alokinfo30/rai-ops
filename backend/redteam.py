from datetime import datetime

from flask import Blueprint, jsonify, make_response, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.orm.attributes import flag_modified

from .extensions import db
from .models import AITest, ComplianceLog
from .reports_service import generate_test_report_pdf
from .services import simulate_redteam_attack

redteam_bp = Blueprint("redteam", __name__, url_prefix="/api/redteam")


@redteam_bp.route("/test", methods=["POST"])
@jwt_required()
def create_redteam_test() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    data = request.json

    if not data:
        return jsonify({"error": "No input data provided"}), 400

    required_fields = ["test_name", "test_type", "target_system"]
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({"error": f"Missing required field: {field}"}), 400

    test = AITest(
        user_id=user_id,
        test_name=data["test_name"],
        test_type=data["test_type"],
        target_system=data["target_system"],
        status="pending",
    )
    db.session.add(test)
    db.session.commit()

    log = ComplianceLog(
        user_id=user_id,
        action="CREATE_TEST",
        resource=f"test/{test.id}",
        status="SUCCESS",
        details={"test_type": data["test_type"]},
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Test created", "test": test.to_dict()}), 201


@redteam_bp.route("/test/<int:test_id>/run", methods=["POST"])
@jwt_required()
def run_redteam_test(test_id: int) -> tuple[Response, int]:
    user_id = get_jwt_identity()
    test = AITest.query.filter_by(id=test_id, user_id=user_id).first()

    if not test:
        return jsonify({"error": "Test not found"}), 404

    test.status = "running"
    db.session.commit()

    results = simulate_redteam_attack(test.test_type, test.target_system)

    test.status = "completed"
    test.results = results
    test.completed_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"message": "Test completed", "results": results})


@redteam_bp.route("/test/<int:test_id>", methods=["GET"])
@jwt_required()
def get_redteam_test_details(test_id: int) -> Response | tuple[Response, int]:
    user_id = get_jwt_identity()
    test = AITest.query.filter_by(id=test_id, user_id=user_id).first()

    if not test:
        return jsonify({"error": "Test not found"}), 404

    return jsonify(test.to_dict())


@redteam_bp.route("/tests", methods=["GET"])
@jwt_required()
def get_recent_redteam_tests() -> Response:
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)

    tests_pagination = (
        AITest.query.filter_by(user_id=user_id)
        .order_by(AITest.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    tests = tests_pagination.items

    return jsonify(
        {
            "tests": [test.to_dict() for test in tests],
            "total": tests_pagination.total,
            "pages": tests_pagination.pages,
            "current_page": tests_pagination.page,
        }
    )


@redteam_bp.route("/test/<int:test_id>/export/pdf", methods=["GET"])
@jwt_required()
def export_test_pdf(test_id: int) -> Response | tuple[Response, int]:
    user_id = get_jwt_identity()
    test = AITest.query.filter_by(id=test_id, user_id=user_id).first()

    if not test:
        return jsonify({"error": "Test not found"}), 404

    try:
        pdf_bytes = generate_test_report_pdf(test)
    except Exception as e:
        return jsonify({"error": f"Failed to generate PDF: {str(e)}"}), 500

    output = make_response(pdf_bytes)
    output.headers[
        "Content-Disposition"
    ] = f"attachment; filename=test_report_{test.id}.pdf"
    output.headers["Content-type"] = "application/pdf"
    return output


@redteam_bp.route("/test/<int:test_id>/vulnerability/update", methods=["POST"])
@jwt_required()
def update_vulnerability(test_id: int) -> tuple[Response, int]:
    user_id = get_jwt_identity()
    test = AITest.query.filter_by(id=test_id, user_id=user_id).first()

    if not test:
        return jsonify({"error": "Test not found"}), 404

    if not test.results:
        return jsonify({"error": "Test has no results"}), 400

    data = request.json
    if not data:
        return jsonify({"error": "No input data provided"}), 400

    vuln_description = data.get("description")
    comment = data.get("comment")
    status = data.get("status")

    if not vuln_description:
        return jsonify({"error": "Vulnerability description is required"}), 400

    results_json = test.results
    vulnerabilities = results_json.get("vulnerabilities_found", [])

    original_status = None
    found = False
    for vuln in vulnerabilities:
        if vuln.get("description") == vuln_description:
            original_status = vuln.get("status", "new")
            if comment is not None:
                vuln["comment"] = comment
            if status is not None:
                vuln["status"] = status
            found = True
            break

    if not found:
        return jsonify({"error": "Vulnerability not found in this test"}), 404

    # Add a compliance log if the status was changed
    if status is not None and original_status != status:
        log = ComplianceLog(
            user_id=user_id,
            action="VULN_STATUS_CHANGE",
            resource=f"test/{test.id}",
            status="SUCCESS",
            details={
                "vulnerability": vuln_description,
                "old_status": original_status,
                "new_status": status,
            },
            ip_address=request.remote_addr,
        )
        db.session.add(log)

    test.results = results_json
    flag_modified(test, "results")
    db.session.commit()

    return jsonify({"message": "Vulnerability updated successfully", "test": test.to_dict()})


@redteam_bp.route("/test/<int:test_id>/retry", methods=["POST"])
@jwt_required()
def retry_redteam_test(test_id: int) -> tuple[Response, int]:
    user_id = get_jwt_identity()
    original_test = AITest.query.filter_by(id=test_id, user_id=user_id).first()

    if not original_test:
        return jsonify({"error": "Test not found"}), 404

    new_test = AITest(
        user_id=user_id,
        test_name=f"{original_test.test_name} (Retry)",
        test_type=original_test.test_type,
        target_system=original_test.target_system,
        status="pending",
    )
    db.session.add(new_test)
    db.session.commit()

    log = ComplianceLog(
        user_id=user_id,
        action="RETRY_TEST",
        resource=f"test/{new_test.id}",
        status="SUCCESS",
        details={"original_test_id": test_id, "test_type": new_test.test_type},
        ip_address=request.remote_addr,
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({"message": "Test retry created", "test": new_test.to_dict()}), 201


@redteam_bp.route("/test/compare", methods=["GET"])
@jwt_required()
def compare_redteam_tests() -> Response | tuple[Response, int]:
    user_id = get_jwt_identity()
    test1_id = request.args.get("test1_id", type=int)
    test2_id = request.args.get("test2_id", type=int)

    test1 = AITest.query.filter_by(id=test1_id, user_id=user_id).first()
    test2 = AITest.query.filter_by(id=test2_id, user_id=user_id).first()

    if not test1 or not test2:
        return jsonify({"error": "One or both tests not found"}), 404

    if not test1.results or not test2.results:
        return jsonify({"error": "One or both tests have no results"}), 400

    return jsonify({"comparison": {"test1": test1.to_dict(), "test2": test2.to_dict()}})