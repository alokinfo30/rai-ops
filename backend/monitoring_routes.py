import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import random

from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from .extensions import db
from .models import Alert, ComplianceLog, ModelDrift

logger = logging.getLogger(__name__)
monitoring_bp = Blueprint("monitoring", __name__, url_prefix="/api/monitoring")

class DriftCalculationService:
    """Service for calculating model drift metrics with realistic patterns."""
    
    def __init__(self):
        # Model baseline configurations
        self.model_configs = {
            "Credit_Risk_v2": {
                "accuracy": 0.85,
                "latency": 150.0,  # ms
                "fairness_score": 0.92,
                "drift_patterns": {
                    "accuracy": {"trend": -0.001, "noise": 0.02},  # Gradual degradation
                    "latency": {"trend": 2.0, "noise": 10.0},     # Gradual increase
                    "fairness_score": {"trend": -0.0005, "noise": 0.01}  # Slow degradation
                }
            },
            "Customer_Churn_v1": {
                "accuracy": 0.78,
                "latency": 120.0,
                "fairness_score": 0.88,
                "drift_patterns": {
                    "accuracy": {"trend": -0.002, "noise": 0.03},
                    "latency": {"trend": 1.5, "noise": 8.0},
                    "fairness_score": {"trend": -0.001, "noise": 0.015}
                }
            },
            "Fraud_Detection_v4": {
                "accuracy": 0.91,
                "latency": 200.0,
                "fairness_score": 0.85,
                "drift_patterns": {
                    "accuracy": {"trend": -0.0005, "noise": 0.015},  # More stable
                    "latency": {"trend": 3.0, "noise": 15.0},      # Higher variance
                    "fairness_score": {"trend": -0.002, "noise": 0.025}  # Higher risk
                }
            }
        }
    
    def calculate_drift_metrics(self, model_name: str, metric_name: str, days_offset: int = 0) -> Tuple[float, float, float]:
        """
        Calculate realistic drift metrics based on model configuration and time.
        
        Args:
            model_name: Name of the model
            metric_name: Name of the metric
            days_offset: Days since baseline (for time-based drift)
        
        Returns:
            Tuple of (baseline, current, drift_score)
        """
        if model_name not in self.model_configs:
            # Default configuration for unknown models
            baseline = 0.80 if metric_name != "latency" else 150.0
            current = baseline * (1 + (random.random() - 0.5) * 0.1)
            drift = abs(current - baseline) / baseline
            return baseline, current, drift
        
        config = self.model_configs[model_name]
        if metric_name not in config["drift_patterns"]:
            baseline = config.get(metric_name, 0.80 if metric_name != "latency" else 150.0)
            current = baseline * (1 + (random.random() - 0.5) * 0.1)
            drift = abs(current - baseline) / baseline
            return baseline, current, drift
        
        baseline = config[metric_name]
        pattern = config["drift_patterns"][metric_name]
        
        # Calculate time-based drift
        days = max(0, days_offset)
        
        # Apply trend (time-based degradation/improvement)
        trend_factor = pattern["trend"] * days
        
        # Add noise (random variation)
        noise_factor = random.gauss(0, pattern["noise"] / 100) if metric_name != "latency" else random.gauss(0, pattern["noise"])
        
        # Calculate current value
        if metric_name == "latency":
            current = baseline + trend_factor + noise_factor
            current = max(current, baseline * 0.5)  # Don't go too low
        else:
            current = baseline + trend_factor + (baseline * noise_factor)
            current = max(0.1, min(1.0, current))  # Clamp between 0.1 and 1.0
        
        # Calculate drift score
        if metric_name == "latency":
            drift = abs(current - baseline) / baseline
        else:
            drift = abs(current - baseline) / baseline
        
        return baseline, current, drift
    
    def get_alert_threshold(self, model_name: str, metric_name: str) -> float:
        """Get appropriate alert threshold for a model and metric."""
        thresholds = {
            "Credit_Risk_v2": {"accuracy": 0.05, "latency": 0.15, "fairness_score": 0.03},
            "Customer_Churn_v1": {"accuracy": 0.06, "latency": 0.20, "fairness_score": 0.04},
            "Fraud_Detection_v4": {"accuracy": 0.04, "latency": 0.25, "fairness_score": 0.05}
        }
        
        default_thresholds = {"accuracy": 0.05, "latency": 0.20, "fairness_score": 0.04}
        
        return thresholds.get(model_name, default_thresholds).get(metric_name, 0.05)


@monitoring_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_monitoring_data() -> tuple[Response, int]:
    """Triggers generation of drift metrics and alerts."""
    try:
        drift_service = DriftCalculationService()
        
        models = ["Credit_Risk_v2", "Customer_Churn_v1", "Fraud_Detection_v4"]
        metrics = ["accuracy", "latency", "fairness_score"]
        
        # Use current time to simulate realistic drift over time
        current_time = datetime.utcnow()
        baseline_date = current_time - timedelta(days=30)  # 30 days of drift
        
        for model in models:
            for metric in metrics:
                # Calculate realistic drift based on time
                days_since_baseline = (current_time - baseline_date).days
                baseline, current, drift = drift_service.calculate_drift_metrics(model, metric, days_since_baseline)
                
                # Get appropriate threshold
                threshold = drift_service.get_alert_threshold(model, metric)
                
                entry = ModelDrift(
                    model_name=model,
                    metric_name=metric,
                    baseline_value=baseline,
                    current_value=current,
                    drift_score=drift,
                    alert_threshold=threshold,
                    created_at=current_time
                )
                db.session.add(entry)
                
                # Generate alert if drift exceeds threshold
                if drift > threshold:
                    severity = "critical" if drift > threshold * 3 else "high" if drift > threshold * 2 else "medium"
                    alert = Alert(
                        severity=severity,
                        message=f"Drift detected in {model} ({metric}): {drift:.2%} (Threshold: {threshold:.2%})",
                        timestamp=current_time
                    )
                    db.session.add(alert)
        
        db.session.commit()
        return jsonify({"message": "Monitoring data generated successfully"}), 200
    except Exception as e:
        logger.error(f"Error generating monitoring data: {e}")
        return jsonify({"error": "Failed to generate monitoring data"}), 500


@monitoring_bp.route("/drift", methods=["GET"])
@jwt_required()
def get_drift_data() -> Response:
    """Get recent drift metrics."""
    # Get latest entry for each model/metric combo
    # Simplified: just get last 20 entries for now
    drift_data = ModelDrift.query.order_by(ModelDrift.created_at.desc()).limit(20).all()
    return jsonify([d.to_dict() for d in drift_data])


@monitoring_bp.route("/alerts/<int:alert_id>/resolve", methods=["POST"])
@jwt_required()
def resolve_alert(alert_id: int) -> tuple[Response, int]:
    alert = Alert.query.get(alert_id)
    if not alert:
        return jsonify({"error": "Alert not found"}), 404
    
    alert.resolved = True
    db.session.commit()
    return jsonify({"message": "Alert resolved", "alert": alert.to_dict()})


@monitoring_bp.route("/alerts/resolve-all", methods=["POST"])
@jwt_required()
def resolve_all_alerts() -> tuple[Response, int]:
    Alert.query.filter_by(resolved=False).update({"resolved": True})
    db.session.commit()
    return jsonify({"message": "All alerts resolved"})


@monitoring_bp.route("/compliance-logs", methods=["GET"])
@jwt_required()
def get_compliance_logs() -> Response:
    user_id = get_jwt_identity()
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "")
    
    query = ComplianceLog.query.filter_by(user_id=user_id)
    
    if search:
        query = query.filter(ComplianceLog.resource.ilike(f"%{search}%"))
        
    pagination = query.order_by(ComplianceLog.timestamp.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        "logs": [log.to_dict() for log in pagination.items],
        "total": pagination.total,
        "pages": pagination.pages,
        "current_page": pagination.page
    })

@monitoring_bp.route("/compliance-logs/bulk", methods=["DELETE"])
@jwt_required()
def bulk_delete_logs() -> tuple[Response, int]:
    user_id = get_jwt_identity()
    data = request.json or {}
    ids = data.get("ids", [])
    
    if ids:
        ComplianceLog.query.filter(ComplianceLog.id.in_(ids), ComplianceLog.user_id == user_id).delete(synchronize_session=False)
    else:
        # Optional: delete all logic if needed, but safer to require IDs or a specific flag
        pass 
        
    db.session.commit()
    return jsonify({"message": "Logs deleted successfully"})