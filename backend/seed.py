import random
from datetime import datetime, timedelta

from backend import create_app
from backend.extensions import db
from backend.models import (
    Alert,
    AITest,
    ComplianceLog,
    ExpertSession,
    ModelDrift,
    ScheduleInterval,
    ScheduledTest,
    User,
)


def seed_data():
    """Populates the database with realistic demo data."""
    app = create_app()
    with app.app_context():
        print("Dropping all tables and recreating...")
        db.drop_all()
        db.create_all()

        # --- 1. Create Users ---
        print("Seeding users...")
        admin = User(
            username="admin", email="admin@rai-ops.local", company="RAI Ops Inc.", role="admin"
        )
        admin.set_password("admin123")
        user1 = User(username="testuser", email="test@example.com", company="Test Corp")
        user1.set_password("password123")
        db.session.add_all([admin, user1])
        db.session.commit()
        admin_id = admin.id
        user1_id = user1.id
        print("Users seeded.")

        # --- 2. Create AI Tests ---
        print("Seeding AI tests...")
        tests_data = [
            AITest(
                user_id=admin_id,
                test_name="Q3 Financial Model Injection",
                test_type="Prompt Injection",
                target_system="FinBot v3",
                status="completed",
                results={
                    "risk_level": "High",
                    "overall_score": 0.75,
                    "tests_conducted": 15,
                    "vulnerabilities_found": [
                        {"type": "Prompt Injection", "description": "Revealed system prompt.", "severity": "High", "status": "new"}
                    ],
                },
                completed_at=datetime.utcnow() - timedelta(days=2),
            ),
            AITest(
                user_id=admin_id,
                test_name="Customer PII Leakage Scan",
                test_type="PII Leakage",
                target_system="CRM API v1.2",
                status="completed",
                results={
                    "risk_level": "Critical",
                    "overall_score": 0.4,
                    "tests_conducted": 25,
                    "vulnerabilities_found": [
                        {"type": "PII Leakage", "description": "Exposed 3 email addresses.", "severity": "Critical", "status": "new"}
                    ],
                },
                completed_at=datetime.utcnow() - timedelta(days=5),
            ),
            AITest(
                user_id=user1_id,
                test_name="Marketing Chatbot Deepfake Check",
                test_type="Deepfake Detection",
                target_system="Marketing Avatar",
                status="pending",
            ),
        ]
        db.session.add_all(tests_data)
        print("AI tests seeded.")

        # --- 3. Create Model Drift & Alerts ---
        print("Seeding monitoring data...")
        drift_data = [
            ModelDrift(model_name="Customer_Churn_v1", metric_name="accuracy", baseline_value=0.95, current_value=0.94, drift_score=0.01, alert_threshold=0.1),
            ModelDrift(model_name="Fraud_Detection_v4", metric_name="latency", baseline_value=200.0, current_value=250.0, drift_score=0.25, alert_threshold=0.1),
        ]
        db.session.add_all(drift_data)
        db.session.add(Alert(severity="high", message="Drift detected in Fraud_Detection_v4 (latency)"))
        print("Monitoring data seeded.")

        # --- 4. Create Compliance Logs ---
        print("Seeding compliance logs...")
        logs_data = [
            ComplianceLog(user_id=admin_id, action="LOGIN", resource="user/session", status="SUCCESS", ip_address="127.0.0.1"),
            ComplianceLog(user_id=user1_id, action="CREATE_TEST", resource="test/3", status="SUCCESS", ip_address="192.168.1.10"),
        ]
        db.session.add_all(logs_data)
        print("Compliance logs seeded.")

        # --- 5. Create Scheduled Tests ---
        print("Seeding scheduled tests...")
        scheduled_test = ScheduledTest(
            user_id=admin_id,
            test_name="Weekly PII Scan",
            test_type="PII Leakage",
            target_system="All Production Models",
            schedule_interval=ScheduleInterval.WEEKLY,
            start_date=datetime.utcnow() + timedelta(days=1),
        )
        db.session.add(scheduled_test)
        db.session.commit()
        print("Scheduled tests seeded.")
        print("\nDatabase seeding complete!")

if __name__ == "__main__":
    seed_data()