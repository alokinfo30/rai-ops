import json
import logging
import sys
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy import case, func, literal_column, union_all

from .extensions import db, redis_client
from .models import AITest, Alert, ModelDrift, ComplianceLog
from .services import calculate_compliance_score

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api/dashboard")


@dashboard_bp.route("/stats", methods=["GET"])
@jwt_required()
def get_dashboard_stats() -> tuple[Response, int]:
    try:
        user_id = get_jwt_identity()

        # Try to fetch from Redis cache first
        cache_key = f"dashboard:stats:{user_id}"
        if redis_client:
            cached_data = redis_client.get(cache_key)
            if cached_data:
                return jsonify(json.loads(cached_data)), 200

        # 1. Security Tests (User specific)
        security_tests_count = db.session.query(AITest).filter_by(user_id=user_id).count()

        # 2. Alert Stats (Global) & Metric A: Alert Resolution (Operational)
        # Use a single efficient query to get both total and resolved counts
        alert_stats = db.session.query(
            func.count(Alert.id), func.sum(case((Alert.resolved, 1), else_=0))
        ).one()
        total_alerts = alert_stats[0] or 0
        resolved_alerts = alert_stats[1] or 0
        active_alerts_count = total_alerts - resolved_alerts

        # 3. Models Monitored
        models_monitored_count = db.session.query(ModelDrift.model_name).distinct().count()

        # 4. Calculate Healthy Models
        healthy_models = 0
        if models_monitored_count > 0:
            subq = (
                db.session.query(
                    ModelDrift.model_name, func.max(ModelDrift.id).label("max_id")
                )
                .group_by(ModelDrift.model_name)
                .subquery()
            )
            latest_drifts = (
                db.session.query(ModelDrift)
                .join(
                    subq,
                    (ModelDrift.model_name == subq.c.model_name)
                    & (ModelDrift.id == subq.c.max_id),
                )
                .all()
            )
            healthy_models = sum(
                1 for d in latest_drifts if d.drift_score < d.alert_threshold
            )

        compliance_score = calculate_compliance_score(
            total_alerts, resolved_alerts, models_monitored_count, healthy_models
        )

        response_data = {
            "securityTests": security_tests_count,
            "activeAlerts": active_alerts_count,
            "modelsMonitored": models_monitored_count,
            "complianceScore": compliance_score,
        }

        # Cache the result for 60 seconds
        if redis_client:
            try:
                redis_client.setex(cache_key, 60, json.dumps(response_data))
            except Exception as e:
                logger.warning(f"Failed to cache dashboard stats: {e}")

        return jsonify(response_data), 200
    except Exception as e:
        logger.error(f"Error fetching dashboard stats: {e}")
        return jsonify({"error": "Could not fetch dashboard statistics"}), 500


@dashboard_bp.route("/recent-activity", methods=["GET"])
@jwt_required()
def get_recent_activity() -> tuple[Response, int]:
    try:
        user_id = get_jwt_identity()
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)

        # Subquery for AI tests
        tests_query = (
            db.session.query(
                literal_column("'test'").label("activity_type"),
                AITest.test_name.label("description"),
                AITest.status.label("status"),
                AITest.created_at.label("created_at"),
            )
            .filter(AITest.user_id == user_id)
        )

        # Subquery for compliance logs
        logs_query = (
            db.session.query(
                literal_column("'compliance'").label("activity_type"),
                (ComplianceLog.action + " on " + ComplianceLog.resource).label(
                    "description"
                ),
                ComplianceLog.status.label("status"),
                ComplianceLog.timestamp.label("created_at"),
            )
            .filter(ComplianceLog.user_id == user_id)
        )

        # Combine queries using UNION ALL
        combined_query = union_all(tests_query, logs_query).alias("recent_activities")

        # Build a new query from the union to order and paginate
        final_query = (
            db.session.query(
                combined_query.c.activity_type,
                combined_query.c.description,
                combined_query.c.status,
                combined_query.c.created_at,
            )
            .order_by(db.desc(combined_query.c.created_at))
        )

        # Paginate the results
        pagination = final_query.paginate(page=page, per_page=per_page, error_out=False)
        activities = pagination.items

        # Serialize results
        activities_serializable = [
            {
                "activity_type": a.activity_type,
                "description": a.description,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in activities
        ]

        return jsonify(
            {
                "activities": activities_serializable,
                "total": pagination.total,
                "pages": pagination.pages,
                "current_page": pagination.page,
            }
        )
    except Exception as e:
        logger.error(f"Error fetching recent activity: {e}")
        return jsonify({"error": "Could not fetch recent activity"}), 500


@dashboard_bp.route("/vulnerability-trend", methods=["GET"])
@jwt_required()
def get_vulnerability_trend() -> Response | tuple[Response, int]:
    try:
        user_id = get_jwt_identity()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6)  # Last 7 days including today

        # Query to count vulnerabilities by status each day
        subquery = (
            db.session.query(
                ComplianceLog.timestamp.cast(db.Date).label("date"),
                ComplianceLog.details["vulnerability"].astext().label("vulnerability"),
                ComplianceLog.details["new_status"].astext().label("status"),
            )
            .filter(ComplianceLog.user_id == user_id)
            .filter(ComplianceLog.action == "VULN_STATUS_CHANGE")
            .filter(ComplianceLog.timestamp >= start_date)
            .subquery()
        )

        # Aggregate counts per day and status
        results = (
            db.session.query(
                subquery.c.date,
                subquery.c.status,
                func.count(subquery.c.vulnerability),
            )
            .group_by(subquery.c.date, subquery.c.status)
            .order_by(subquery.c.date)
            .all()
        )

        # Structure data for the frontend (group by date, then status)
        trend_data = [{"date": str(r[0]), "status": r[1], "count": r[2]} for r in results]

        return jsonify(trend_data)
    except (Exception, NotImplementedError) as e:
        logger.error(f"Error fetching vulnerability trend data: {e}")
        # Fallback for SQLite or environments without complex JSON support
        return jsonify([]), 200


@dashboard_bp.route("/chart-data", methods=["GET"])
@jwt_required()
def get_dashboard_chart_data() -> tuple[Response, int]:
    try:
        user_id = get_jwt_identity()
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=6)  # Last 7 days including today

        # Fetch tests for the user in the last 7 days
        tests = (
            db.session.query(AITest.created_at)
            .filter(AITest.user_id == user_id, AITest.created_at >= start_date)
            .all()
        )

        # Fetch global alerts in the last 7 days
        alerts = db.session.query(Alert.timestamp).filter(Alert.timestamp >= start_date).all()

        # Aggregate data by date
        dates = [(start_date + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(7)]
        test_counts = {d: 0 for d in dates}
        alert_counts = {d: 0 for d in dates}

        for t in tests:
            d_str = t.created_at.strftime("%Y-%m-%d")
            if d_str in test_counts:
                test_counts[d_str] += 1

        for a in alerts:
            d_str = a.timestamp.strftime("%Y-%m-%d")
            if d_str in alert_counts:
                alert_counts[d_str] += 1

        return jsonify(
            {"labels": dates, "tests": list(test_counts.values()), "alerts": list(alert_counts.values())}
        )
    except Exception as e:
        logger.error(f"Error fetching chart data: {e}")
        return jsonify({"error": "Could not fetch chart data"}), 500