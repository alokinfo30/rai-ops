from flask import Blueprint, jsonify, request, make_response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ModelDrift, ComplianceLog, Alert
from services import simulate_drift_metrics
import sys
import csv
import io
from datetime import datetime, timedelta

monitoring_bp = Blueprint('monitoring', __name__, url_prefix='/api/monitoring')

def _generate_and_commit_drift_data(db):
    """Helper function to generate and commit simulated drift data."""
    models = ['Fraud Detection v2', 'Content Filter v3', 'Biometric Auth v1', 'KYC Classifier']
    metrics = ['accuracy', 'precision', 'recall', 'f1_score']
    
    for model in models:
        for metric in metrics:
            baseline_entry = ModelDrift.query.filter_by(model_name=model, metric_name=metric).order_by(ModelDrift.created_at.asc()).first()
            
            baseline = baseline_entry.baseline_value if baseline_entry else None
            
            baseline, current, drift = simulate_drift_metrics(baseline)
            
            drift_entry = ModelDrift(
                model_name=model,
                metric_name=metric,
                baseline_value=baseline,
                current_value=current,
                drift_score=drift,
                alert_threshold=0.1
            )
            db.session.add(drift_entry)

            if drift > 0.1:
                alert_message = f'Model drift detected in {model} ({metric}): {drift:.2%} drift from baseline.'
                existing_alert = Alert.query.filter_by(message=alert_message, resolved=False).first()
                if not existing_alert:
                    alert = Alert(
                        severity='high' if drift > 0.15 else 'medium',
                        message=alert_message,
                    )
                    db.session.add(alert)
    db.session.commit()

@monitoring_bp.route('/generate', methods=['POST'])
@jwt_required()
def trigger_monitoring_generation():
    try:
        _generate_and_commit_drift_data(db)
        return jsonify({'message': 'Monitoring data generated successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error generating monitoring data: {e}", file=sys.stderr)
        return jsonify({'error': 'Failed to generate monitoring data'}), 500

@monitoring_bp.route('/drift', methods=['GET'])
@jwt_required()
def get_model_drift():
    drift_data = ModelDrift.query.order_by(ModelDrift.created_at.desc()).limit(50).all()
    return jsonify([d.to_dict() for d in drift_data])

@monitoring_bp.route('/compliance-logs', methods=['GET'])
@jwt_required()
def get_compliance_logs():
    user_id = get_jwt_identity()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    action_filter = request.args.get('action', None, type=str)
    search_query = request.args.get('search', None, type=str)
    sort_order = request.args.get('sort', 'desc', type=str)
    start_date_str = request.args.get('start_date', None, type=str)
    end_date_str = request.args.get('end_date', None, type=str)

    query = ComplianceLog.query.filter_by(user_id=user_id)

    if action_filter:
        query = query.filter(ComplianceLog.action == action_filter)

    if search_query:
        query = query.filter(ComplianceLog.resource.ilike(f'%{search_query}%'))

    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(ComplianceLog.timestamp >= start_date)
        
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            query = query.filter(ComplianceLog.timestamp < (end_date + timedelta(days=1)))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Please use YYYY-MM-DD.'}), 400

    if sort_order == 'asc':
        query = query.order_by(ComplianceLog.timestamp.asc())
    else:
        query = query.order_by(ComplianceLog.timestamp.desc())

    logs_pagination = query.paginate(page=page, per_page=per_page, error_out=False)

    logs = logs_pagination.items
    return jsonify({
        'logs': [log.to_dict() for log in logs],
        'total': logs_pagination.total,
        'pages': logs_pagination.pages,
        'current_page': logs_pagination.page,
    })

@monitoring_bp.route('/compliance-logs/export', methods=['GET'])
@jwt_required()
def export_compliance_logs():
    user_id = get_jwt_identity()
    action_filter = request.args.get('action', None, type=str)
    search_query = request.args.get('search', None, type=str)
    sort_order = request.args.get('sort', 'desc', type=str)
    start_date_str = request.args.get('start_date', None, type=str)
    end_date_str = request.args.get('end_date', None, type=str)

    query = ComplianceLog.query.filter_by(user_id=user_id)

    if action_filter:
        query = query.filter(ComplianceLog.action == action_filter)

    if search_query:
        query = query.filter(ComplianceLog.resource.ilike(f'%{search_query}%'))

    try:
        if start_date_str:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            query = query.filter(ComplianceLog.timestamp >= start_date)
        
        if end_date_str:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
            query = query.filter(ComplianceLog.timestamp < (end_date + timedelta(days=1)))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Please use YYYY-MM-DD.'}), 400

    if sort_order == 'asc':
        query = query.order_by(ComplianceLog.timestamp.asc())
    else:
        query = query.order_by(ComplianceLog.timestamp.desc())

    logs = query.all()

    si = io.StringIO()
    cw = csv.writer(si)
    cw.writerow(['Timestamp', 'Action', 'Resource', 'Status', 'IP Address', 'Details'])
    
    for log in logs:
        cw.writerow([
            log.timestamp.isoformat(),
            log.action,
            log.resource,
            log.status,
            log.ip_address,
            str(log.details)
        ])

    output = make_response(si.getvalue())
    output.headers["Content-Disposition"] = f"attachment; filename=compliance_logs_{datetime.now().strftime('%Y%m%d')}.csv"
    output.headers["Content-type"] = "text/csv"
    return output

@monitoring_bp.route('/compliance-logs', methods=['DELETE'])
@jwt_required()
def bulk_delete_compliance_logs():
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    # Handle "Delete All Matching"
    if data.get('delete_all_matching'):
        filters = data.get('filters', {})
        query = ComplianceLog.query.filter_by(user_id=user_id)
        
        if filters.get('action'):
            query = query.filter(ComplianceLog.action == filters['action'])
        if filters.get('search'):
            query = query.filter(ComplianceLog.resource.ilike(f"%{filters['search']}%"))
        if filters.get('start_date'):
            try:
                sd = datetime.strptime(filters['start_date'], '%Y-%m-%d')
                query = query.filter(ComplianceLog.timestamp >= sd)
            except ValueError: pass
        if filters.get('end_date'):
            try:
                ed = datetime.strptime(filters['end_date'], '%Y-%m-%d')
                query = query.filter(ComplianceLog.timestamp < (ed + timedelta(days=1)))
            except ValueError: pass
            
        try:
            num_deleted = query.delete(synchronize_session=False)
            db.session.commit()
            return jsonify({'message': f'{num_deleted} log(s) deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"Error during bulk log deletion: {e}", file=sys.stderr)
            return jsonify({'error': 'An internal error occurred during deletion'}), 500

    log_ids = data.get('log_ids', [])
    if not isinstance(log_ids, list):
        return jsonify({'error': 'log_ids must be a list of integers'}), 400
    
    if not log_ids:
        return jsonify({'message': 'No logs to delete'}), 200

    try:
        # Ensure user can only delete their own logs
        num_deleted = db.session.query(ComplianceLog).filter(
            ComplianceLog.user_id == user_id,
            ComplianceLog.id.in_(log_ids)
        ).delete(synchronize_session=False)
        
        db.session.commit()
        
        return jsonify({'message': f'{num_deleted} log(s) deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error during bulk log deletion: {e}", file=sys.stderr)
        return jsonify({'error': 'An internal error occurred during deletion'}), 500

@monitoring_bp.route('/alerts', methods=['GET'])
@jwt_required()
def get_alerts():
    alerts = Alert.query.order_by(Alert.timestamp.desc()).all()
    return jsonify([alert.to_dict() for alert in alerts])

@monitoring_bp.route('/alerts/<int:alert_id>/resolve', methods=['POST'])
@jwt_required()
def resolve_alert(alert_id):
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    alert.resolved = True
    db.session.commit()
    return jsonify({'message': 'Alert resolved', 'alert': alert.to_dict()})

@monitoring_bp.route('/alerts/resolve-all', methods=['POST'])
@jwt_required()
def resolve_all_alerts():
    try:
        db.session.query(Alert).filter_by(resolved=False).update({Alert.resolved: True})
        db.session.commit()
        return jsonify({'message': 'All alerts resolved'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500