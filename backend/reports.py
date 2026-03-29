from datetime import datetime

from flask import Blueprint, jsonify, make_response, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from .email_service import send_email
from .models import User
from .reports_service import generate_compliance_pdf
from .tasks import run_background_task

reports_bp = Blueprint("reports", __name__, url_prefix="/api/reports")

@reports_bp.route("/compliance/pdf", methods=["GET"])
@jwt_required()
def download_compliance_report() -> Response | tuple[Response, int]:
    user_id = get_jwt_identity()
    try:
        pdf_bytes = generate_compliance_pdf(user_id)

        response = make_response(pdf_bytes)
        response.headers["Content-Type"] = "application/pdf"
        response.headers["Content-Disposition"] = (
            "attachment;"
            f" filename=compliance_report_{datetime.now().strftime('%Y%m%d')}.pdf"
        )
        return response
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@reports_bp.route("/compliance/email", methods=["POST"])
@jwt_required()
def email_compliance_report() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or not user.email:
        return jsonify({"error": "User email not found"}), 400

    # Run in background thread to not block response
    def send_background_email(u_id: int, u_email: str) -> None:
        try:
            pdf_bytes = generate_compliance_pdf(u_id)
            subject = "RAI Ops Compliance Report"
            body = "Attached is your requested compliance report."
            html = """<html>
                <body>
                    <h2>RAI Ops Report</h2>
                    <p>Hello,</p>
                    <p>Please find attached the compliance report you requested.</p>
                    <p>Best,<br>RAI Ops Automated System</p>
                </body>
            </html>"""
            filename = f"compliance_report_{datetime.now().strftime('%Y%m%d')}.pdf"

            send_email(
                to_email=u_email,
                subject=subject,
                body=body,
                html_body=html,
                attachment_bytes=pdf_bytes,
                attachment_name=filename
            )
        except Exception as e:
            print(f"Error sending report email: {e}")

    run_background_task(send_background_email, user_id, user.email)
    return jsonify({"message": "Report is being sent to your email."}), 202