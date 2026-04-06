from datetime import datetime

from backend.extensions import db


class ComplianceLog(db.Model):
    __tablename__ = "compliance_logs"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(100))
    resource = db.Column(db.String(200))
    status = db.Column(db.String(50))
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "action": self.action,
            "resource": self.resource,
            "status": self.status,
            "details": self.details,
            "ip_address": self.ip_address,
            "timestamp": self.timestamp.isoformat(),
        }


class ModelDrift(db.Model):
    __tablename__ = "model_drift"

    id = db.Column(db.Integer, primary_key=True)
    model_name = db.Column(db.String(200))
    metric_name = db.Column(db.String(100))
    baseline_value = db.Column(db.Float)
    current_value = db.Column(db.Float)
    drift_score = db.Column(db.Float)
    alert_threshold = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "model_name": self.model_name,
            "metric_name": self.metric_name,
            "baseline_value": self.baseline_value,
            "current_value": self.current_value,
            "drift_score": self.drift_score,
            "alert_threshold": self.alert_threshold,
            "created_at": self.created_at.isoformat(),
        }


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.Integer, primary_key=True)
    severity = db.Column(db.String(50))
    message = db.Column(db.String(500))
    resolved = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "severity": self.severity,
            "message": self.message,
            "resolved": self.resolved,
            "timestamp": self.timestamp.isoformat(),
        }