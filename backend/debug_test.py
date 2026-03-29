"""
Debug test to understand what's happening with the API endpoints.
"""
import pytest
from backend import create_app
from backend.extensions import db
from backend.models import User


def test_simple_endpoint():
    """Test a simple endpoint to debug the issue."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False
    })

    with app.app_context():
        db.create_all()
        
        # Create a test user
        user = User(username="testuser", email="test@example.com")
        user.set_password("password123")
        db.session.add(user)
        db.session.commit()

        with app.test_client() as client:
            # Test login first
            login_response = client.post("/api/auth/login", json={
                "username": "testuser",
                "password": "password123"
            })
            print(f"Login response: {login_response.status_code}")
            print(f"Login data: {login_response.json}")
            
            if login_response.status_code == 200:
                token = login_response.json["access_token"]
                headers = {"Authorization": f"Bearer {token}"}
                
                # Test dashboard stats
                stats_response = client.get("/api/dashboard/stats", headers=headers)
                print(f"Dashboard stats response: {stats_response.status_code}")
                print(f"Dashboard stats data: {stats_response.json}")
                
                # Test redteam test creation
                test_response = client.post("/api/redteam/test", json={
                    "test_name": "Debug Test",
                    "test_type": "Prompt Injection",
                    "target_system": "Debug Model"
                }, headers=headers)
                print(f"Redteam test response: {test_response.status_code}")
                print(f"Redteam test data: {test_response.json}")
                
                # Test monitoring generation
                monitor_response = client.post("/api/monitoring/generate", headers=headers)
                print(f"Monitoring generation response: {monitor_response.status_code}")
                print(f"Monitoring generation data: {monitor_response.json}")
                
                # Test reports
                report_response = client.get("/api/reports/compliance/pdf", headers=headers)
                print(f"Reports response: {report_response.status_code}")
                print(f"Reports headers: {report_response.headers}")


if __name__ == "__main__":
    test_simple_endpoint()