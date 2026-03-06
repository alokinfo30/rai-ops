from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    company = db.Column(db.String(100))
    role = db.Column(db.String(50), default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'company': self.company,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }

class AITest(db.Model):
    __tablename__ = 'ai_tests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    test_name = db.Column(db.String(200), nullable=False)
    test_type = db.Column(db.String(50))  # deepfake, adversarial, synthetic
    target_system = db.Column(db.String(200))
    status = db.Column(db.String(50), default='pending')  # pending, running, completed, failed
    results = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'test_name': self.test_name,
            'test_type': self.test_type,
            'target_system': self.target_system,
            'status': self.status,
            'results': self.results,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class ComplianceLog(db.Model):
    __tablename__ = 'compliance_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(100))
    resource = db.Column(db.String(200))
    status = db.Column(db.String(50))
    details = db.Column(db.JSON)
    ip_address = db.Column(db.String(50))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'resource': self.resource,
            'status': self.status,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat(),
        }

class ModelDrift(db.Model):
    __tablename__ = 'model_drift'
    
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
            'id': self.id,
            'model_name': self.model_name,
            'metric_name': self.metric_name,
            'baseline_value': self.baseline_value,
            'current_value': self.current_value,
            'drift_score': self.drift_score,
            'alert_threshold': self.alert_threshold,
            'created_at': self.created_at.isoformat()
        }

class Alert(db.Model):
    __tablename__ = 'alerts'
    
    id = db.Column(db.Integer, primary_key=True)
    severity = db.Column(db.String(50))
    message = db.Column(db.String(500))
    resolved = db.Column(db.Boolean, default=False, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'severity': self.severity,
            'message': self.message,
            'resolved': self.resolved,
            'timestamp': self.timestamp.isoformat()
        }

class ExpertSession(db.Model):
    __tablename__ = 'expert_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    expert_name = db.Column(db.String(200))
    domain = db.Column(db.String(200))
    knowledge_graph = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expert_name': self.expert_name,
            'domain': self.domain,
            'knowledge_graph': self.knowledge_graph,
            'created_at': self.created_at.isoformat()
        }