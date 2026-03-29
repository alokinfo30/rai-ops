from datetime import datetime
from enum import Enum

from .extensions import db


class AITest(db.Model):
    __tablename__ = "ai_tests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    test_name = db.Column(db.String(200), nullable=False)
    test_type = db.Column(db.String(50))  # deepfake, adversarial, synthetic
    target_system = db.Column(db.String(200))
    status = db.Column(
        db.String(50), default="pending"
    )  # pending, running, completed, failed
    results = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            "id": self.id,
            "test_name": self.test_name,
            "test_type": self.test_type,
            "target_system": self.target_system,
            "status": self.status,
            "results": self.results,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
        }


class ScheduleInterval(Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class ScheduledTest(db.Model):
    __tablename__ = "scheduled_tests"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    test_name = db.Column(db.String(120), nullable=False)
    test_type = db.Column(db.String(50), nullable=False)
    target_system = db.Column(db.String(120), nullable=False)
    schedule_interval = db.Column(db.Enum(ScheduleInterval), nullable=False)
    start_date = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    last_run = db.Column(db.DateTime)

    def validate_schedule(self):
        if self.start_date < datetime.utcnow():
            raise ValueError("Start date must be in the future")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "test_name": self.test_name,
            "test_type": self.test_type,
            "target_system": self.target_system,
            "schedule_interval": self.schedule_interval.value,
            "start_date": self.start_date.isoformat(),
            "is_active": self.is_active,
            "last_run": self.last_run.isoformat() if self.last_run else None,
        }