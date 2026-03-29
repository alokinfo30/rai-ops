from flask import Blueprint, send_file, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, AITest, Alert, ComplianceLog, User
from fpdf import FPDF
import io
from datetime import datetime
from email_service import send_email
import threading

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

def _generate_pdf_bytes(user_id):
    """Helper function to generate PDF bytes for compliance report."""
    # Fetch Data
    total_alerts = db.session.query(Alert).count()
    resolved_alerts = db.session.query(Alert).filter_by(resolved=True).count()
    active_alerts = total_alerts - resolved_alerts
    tests_count = db.session.query(AITest).filter_by(user_id=user_id).count()
    logs = db.session.query(ComplianceLog).filter_by(user_id=user_id).order_by(ComplianceLog.timestamp.desc()).limit(20).all()
    
    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    
    # Header
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(0, 10, txt="RAI Ops - Compliance Report", ln=1, align='C')
    pdf.ln(10)
    
    # Summary Section
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, txt="Executive Summary", ln=1, align='L')
    pdf.set_font("Arial", size=12)
    pdf.cell(0, 10, txt=f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}", ln=1, align='L')
    pdf.cell(0, 10, txt=f"Active Alerts: {active_alerts}", ln=1, align='L')
    pdf.cell(0, 10, txt=f"Resolved Alerts: {resolved_alerts}", ln=1, align='L')
    pdf.cell(0, 10, txt=f"Security Tests Conducted: {tests_count}", ln=1, align='L')
    pdf.ln(10)
    
    # Logs Section
    pdf.set_font("Arial", 'B', 12)
    pdf.cell(0, 10, txt="Recent Compliance Logs", ln=1, align='L')
    pdf.set_font("Arial", size=10)
    
    # Table Header
    line_height = pdf.font_size * 2.5
    col_width = pdf.w / 4.5
    
    pdf.set_fill_color(240, 240, 240)
    pdf.cell(col_width, line_height, "Time", 1, 0, 'C', 1)
    pdf.cell(col_width, line_height, "Action", 1, 0, 'C', 1)
    pdf.cell(col_width * 1.5, line_height, "Resource", 1, 0, 'C', 1)
    pdf.cell(col_width * 0.8, line_height, "Status", 1, 1, 'C', 1)
    
    # Table Rows
    pdf.set_font("Arial", size=9)
    for log in logs:
        timestamp = log.timestamp.strftime('%Y-%m-%d %H:%M')
        # Truncate text to fit
        action = (log.action[:18] + '..') if len(log.action) > 18 else log.action
        resource = (log.resource[:25] + '..') if len(log.resource) > 25 else log.resource
        
        pdf.cell(col_width, line_height, timestamp, 1)
        pdf.cell(col_width, line_height, action, 1)
        pdf.cell(col_width * 1.5, line_height, resource, 1)
        pdf.cell(col_width * 0.8, line_height, log.status, 1, 1)

    # Output
    # FPDF output(dest='S') returns a string (latin-1 encoded)
    return pdf.output(dest='S').encode('latin-1')

@reports_bp.route('/compliance/pdf', methods=['GET'])
@jwt_required()
def generate_compliance_pdf():
    user_id = get_jwt_identity()
    pdf_bytes = _generate_pdf_bytes(user_id)

    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'compliance_report_{datetime.now().strftime("%Y%m%d")}.pdf'
    )

@reports_bp.route('/compliance/email', methods=['POST'])
@jwt_required()
def email_compliance_report():
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user or not user.email:
        return jsonify({'error': 'User email not found'}), 400

    pdf_bytes = _generate_pdf_bytes(user_id)
    filename = f'compliance_report_{datetime.now().strftime("%Y%m%d")}.pdf'
    body = "Please find attached your requested compliance report."
    
    html_body = f"""
    <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #2c3e50;">RAI Ops Compliance Report</h2>
            <p>Hello <strong>{user.username}</strong>,</p>
            <p>Please find attached your requested compliance report generated on {datetime.now().strftime('%Y-%m-%d %H:%M')}.</p>
            <p>Best regards,<br>The RAI Ops Team</p>
        </body>
    </html>
    """
    
    # Run email sending in a background thread to avoid blocking the request
    thread = threading.Thread(
        target=send_email, 
        args=(user.email, "RAI Ops Compliance Report", body, html_body, pdf_bytes, filename)
    )
    thread.start()
    
    return jsonify({'message': 'Report is being sent to your email.'}), 202