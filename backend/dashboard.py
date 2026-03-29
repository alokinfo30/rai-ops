from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, AITest, Alert, ModelDrift, ComplianceLog
import sys
from sqlalchemy import select, literal_column, func, union_all
from datetime import datetime, timedelta

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = get_jwt_identity()
        
        # 1. Security Tests (User specific)
        security_tests_count = db.session.query(AITest).filter_by(user_id=user_id).count()
        
        # 2. Alert Stats (Global)
        total_alerts = db.session.query(Alert).count()
        resolved_alerts = db.session.query(Alert).filter_by(resolved=True).count()
        active_alerts_count = total_alerts - resolved_alerts
        
        # 3. Models Monitored
        models_monitored_count = db.session.query(ModelDrift.model_name).distinct().count()

        # 4. Calculate Compliance Score
        # Metric A: Alert Resolution (Operational)
        alert_score = 100
        if total_alerts > 0:
            alert_score = (resolved_alerts / total_alerts) * 100
            
        # Metric B: Model Drift Health (Technical)
        drift_score = 100
        if models_monitored_count > 0:
            # Get latest drift entry for each model
            subq = db.session.query(ModelDrift.model_name, func.max(ModelDrift.id).label('max_id')).group_by(ModelDrift.model_name).subquery()
            latest_drifts = db.session.query(ModelDrift).join(subq, (ModelDrift.model_name == subq.c.model_name) & (ModelDrift.id == subq.c.max_id)).all()
            
            healthy_models = sum(1 for d in latest_drifts if d.drift_score < d.alert_threshold)
            drift_score = (healthy_models / models_monitored_count) * 100

        # Weighted Average: 50% Operational, 50% Technical
        compliance_score = int((alert_score * 0.5) + (drift_score * 0.5))
        
        return jsonify({
            'securityTests': security_tests_count,
            'activeAlerts': active_alerts_count,
            'modelsMonitored': models_monitored_count,
            'complianceScore': compliance_score
        })
    except Exception as e:
        print(f"Error fetching dashboard stats: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch dashboard statistics'}), 500

@dashboard_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    try:
        user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)

        # Subquery for AI tests
        tests_query = db.session.query(
            literal_column("'test'").label("activity_type"),
            AITest.test_name.label("description"),
            AITest.status.label("status"),
            AITest.created_at.label("created_at")
        ).filter(AITest.user_id == user_id)

        # Subquery for compliance logs
        logs_query = db.session.query(
            literal_column("'compliance'").label("activity_type"),
            (ComplianceLog.action + ' on ' + ComplianceLog.resource).label("description"),
            ComplianceLog.status.label("status"),
            ComplianceLog.timestamp.label("created_at")
        ).filter(ComplianceLog.user_id == user_id)

        # Combine queries using UNION ALL
        combined_query = union_all(tests_query, logs_query).alias('recent_activities')

        # Build a new query from the union to order and paginate
        final_query = db.session.query(
            combined_query.c.activity_type,
            combined_query.c.description,
            combined_query.c.status,
            combined_query.c.created_at
        ).order_by(db.desc(combined_query.c.created_at))

        # Paginate the results
        pagination = final_query.paginate(page=page, per_page=per_page, error_out=False)
        activities = pagination.items

        # Serialize results
        activities_serializable = [
            {'activity_type': a.activity_type, 'description': a.description, 'status': a.status, 'created_at': a.created_at.isoformat() if a.created_at else None}
            for a in activities
        ]

        return jsonify({'activities': activities_serializable, 'total': pagination.total, 'pages': pagination.pages, 'current_page': pagination.page})
    except Exception as e:
        print(f"Error fetching recent activity: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch recent activity'}), 500

@dashboard_bp.route('/vulnerability-trend', methods=['GET'])
@jwt_required()
def get_vulnerability_trend():
    try:
        user_id = get_jwt_identity()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6)  # Last 7 days including today

        # Query to count vulnerabilities by status each day
        subquery = (
            db.session.query(
                ComplianceLog.timestamp.cast(db.Date).label('date'),
                ComplianceLog.details['vulnerability'].astext().label('vulnerability'),
                ComplianceLog.details['new_status'].astext().label('status')
            )
            .filter(ComplianceLog.user_id == user_id)
            .filter(ComplianceLog.action == 'VULN_STATUS_CHANGE')
            .filter(ComplianceLog.timestamp >= start_date)
            .subquery()
        )

        # Aggregate counts per day and status
        results = (
            db.session.query(
                subquery.c.date,
                subquery.c.status,
                func.count(subquery.c.vulnerability)
            )
            .group_by(subquery.c.date, subquery.c.status)
            .order_by(subquery.c.date)
            .all()
        )

        # Structure data for the frontend (group by date, then status)
        trend_data = [{'date': str(r[0]), 'status': r[1], 'count': r[2]} for r in results]

        return jsonify(trend_data)
    except Exception as e:
        print(f"Error fetching vulnerability trend data: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch vulnerability trend data'}), 500

@dashboard_bp.route('/chart-data', methods=['GET'])
@jwt_required()
def get_dashboard_chart_data():
    try:
        user_id = get_jwt_identity()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6) # Last 7 days including today

        # Fetch tests for the user in the last 7 days
        tests = db.session.query(AITest.created_at).filter(
            AITest.user_id == user_id,
            AITest.created_at >= start_date
        ).all()

        # Fetch global alerts in the last 7 days
        alerts = db.session.query(Alert.timestamp).filter(
            Alert.timestamp >= start_date
        ).all()

        # Aggregate data by date
        dates = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(7)]
        test_counts = {d: 0 for d in dates}
        alert_counts = {d: 0 for d in dates}

        for t in tests:
            d_str = t.created_at.strftime('%Y-%m-%d')
            if d_str in test_counts: test_counts[d_str] += 1
        
        for a in alerts:
            d_str = a.timestamp.strftime('%Y-%m-%d')
            if d_str in alert_counts: alert_counts[d_str] += 1

        return jsonify({'labels': dates, 'tests': list(test_counts.values()), 'alerts': list(alert_counts.values())})
    except Exception as e:
        print(f"Error fetching chart data: {e}", file=sys.stderr)
        return jsonify({'error': 'Could not fetch chart data'}), 500