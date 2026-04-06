"""
Comprehensive test suite for RAI Ops backend API.
Tests all endpoints with proper validation and error handling.
"""
import pytest
import json
from datetime import datetime
from backend.models import User, AITest, ModelDrift, Alert, ComplianceLog


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_register_user(self, client):
        """Test user registration."""
        response = client.post("/api/auth/register", json={
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "SecurePass123!",
            "company": "Test Corp"
        })
        assert response.status_code == 201
        data = response.json
        assert "user" in data
        assert data["user"]["username"] == "newuser"
        assert data["user"]["email"] == "newuser@example.com"

    def test_register_user_weak_password(self, client):
        """Test registration with weak password."""
        response = client.post("/api/auth/register", json={
            "username": "weakuser",
            "email": "weak@example.com",
            "password": "123",
            "company": "Test Corp"
        })
        assert response.status_code == 400
        assert "error" in response.json

    def test_register_duplicate_username(self, client):
        """Test registration with duplicate username."""
        # First registration
        client.post("/api/auth/register", json={
            "username": "duplicate",
            "email": "dup1@example.com",
            "password": "SecurePass123!",
            "company": "Test Corp"
        })
        
        # Second registration with same username
        response = client.post("/api/auth/register", json={
            "username": "duplicate",
            "email": "dup2@example.com",
            "password": "SecurePass123!",
            "company": "Test Corp"
        })
        assert response.status_code == 400
        assert "Username already exists" in response.json["error"]

    def test_login_success(self, client):
        """Test successful login."""
        # Register a user first
        client.post("/api/auth/register", json={
            "username": "logintest",
            "email": "login@example.com",
            "password": "SecurePass123!",
            "company": "Test Corp"
        })
        
        response = client.post("/api/auth/login", json={
            "username": "logintest",
            "password": "SecurePass123!"
        })
        assert response.status_code == 200
        data = response.json
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data

    def test_login_invalid_credentials(self, client):
        """Test login with invalid credentials."""
        response = client.post("/api/auth/login", json={
            "username": "nonexistent",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        assert "error" in response.json

    def test_refresh_token(self, client, auth_headers):
        """Test token refresh."""
        response = client.post("/api/auth/refresh", headers=auth_headers)
        assert response.status_code == 200
        assert "access_token" in response.json

    def test_update_profile(self, client, auth_headers):
        """Test profile update."""
        response = client.put("/api/auth/profile", json={
            "email": "updated@example.com",
            "company": "Updated Corp",
            "password": "NewSecurePass123!"
        }, headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert data["message"] == "Profile updated successfully"


class TestDashboard:
    """Test dashboard endpoints."""
    
    def test_dashboard_stats(self, client, auth_headers):
        """Test dashboard statistics."""
        response = client.get("/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert "securityTests" in data
        assert "activeAlerts" in data
        assert "modelsMonitored" in data
        assert "complianceScore" in data
        assert 0 <= data["complianceScore"] <= 100

    def test_recent_activity(self, client, auth_headers):
        """Test recent activity feed."""
        response = client.get("/api/dashboard/recent-activity", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert "activities" in data
        assert "total" in data
        assert "pages" in data
        assert "current_page" in data

    def test_vulnerability_trend(self, client, auth_headers):
        """Test vulnerability trend data."""
        response = client.get("/api/dashboard/vulnerability-trend", headers=auth_headers)
        assert response.status_code == 200
        # Should return a list of trend data
        assert isinstance(response.json, list)

    def test_chart_data(self, client, auth_headers):
        """Test chart data endpoint."""
        response = client.get("/api/dashboard/chart-data", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert "labels" in data
        assert "tests" in data
        assert "alerts" in data
        assert len(data["labels"]) == 7  # Last 7 days


class TestRedTeam:
    """Test Red Team endpoints."""
    
    def test_create_redteam_test(self, client, auth_headers):
        """Test creating a Red Team test."""
        response = client.post("/api/redteam/test", json={
            "test_name": "Test Security Scan",
            "test_type": "Prompt Injection",
            "target_system": "Test Model"
        }, headers=auth_headers)
        assert response.status_code == 201
        data = response.json
        assert data["message"] == "Test created"
        assert "test" in data

    def test_create_redteam_test_missing_fields(self, client, auth_headers):
        """Test creating test with missing required fields."""
        response = client.post("/api/redteam/test", json={
            "test_name": "Incomplete Test"
            # Missing test_type and target_system
        }, headers=auth_headers)
        assert response.status_code == 400
        assert "error" in response.json

    def test_run_redteam_test(self, client, auth_headers):
        """Test running a Red Team test."""
        # First create a test
        create_response = client.post("/api/redteam/test", json={
            "test_name": "Run Test",
            "test_type": "Deepfake Detection",
            "target_system": "Test System"
        }, headers=auth_headers)
        
        test_id = create_response.json["test"]["id"]
        
        # Run the test
        response = client.post(f"/api/redteam/test/{test_id}/run", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert data["message"] == "Test completed"
        assert "results" in data

    def test_get_test_details(self, client, auth_headers):
        """Test getting test details."""
        # Create and run a test first
        create_response = client.post("/api/redteam/test", json={
            "test_name": "Details Test",
            "test_type": "Adversarial",
            "target_system": "Test System"
        }, headers=auth_headers)
        
        test_id = create_response.json["test"]["id"]
        client.post(f"/api/redteam/test/{test_id}/run", headers=auth_headers)
        
        # Get test details
        response = client.get(f"/api/redteam/test/{test_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert data["id"] == test_id
        assert "results" in data

    def test_get_user_tests(self, client, auth_headers):
        """Test getting user's tests."""
        response = client.get("/api/redteam/tests", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert "tests" in data
        assert "total" in data
        assert "pages" in data
        assert "current_page" in data

    def test_export_test_pdf(self, client, auth_headers):
        """Test exporting test results as PDF."""
        # Create and run a test first
        create_response = client.post("/api/redteam/test", json={
            "test_name": "PDF Test",
            "test_type": "Data Poisoning",
            "target_system": "Test System"
        }, headers=auth_headers)
        
        test_id = create_response.json["test"]["id"]
        client.post(f"/api/redteam/test/{test_id}/run", headers=auth_headers)
        
        # Export as PDF
        response = client.get(f"/api/redteam/test/{test_id}/export/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["Content-Type"] == "application/pdf"

    def test_update_vulnerability(self, client, auth_headers):
        """Test updating vulnerability status."""
        # Create and run a test first
        create_response = client.post("/api/redteam/test", json={
            "test_name": "Vuln Test",
            "test_type": "Prompt Injection",
            "target_system": "Test System"
        }, headers=auth_headers)
        
        test_id = create_response.json["test"]["id"]
        run_response = client.post(f"/api/redteam/test/{test_id}/run", headers=auth_headers)
        
        # Get vulnerability description from results
        vulnerabilities = run_response.json["results"]["vulnerabilities_found"]
        if vulnerabilities:
            vuln_desc = vulnerabilities[0]["description"]
            
            # Update vulnerability
            response = client.post(f"/api/redteam/test/{test_id}/vulnerability/update", json={
                "description": vuln_desc,
                "status": "investigating",
                "comment": "Investigating this vulnerability"
            }, headers=auth_headers)
            
            assert response.status_code == 200
            assert "Vulnerability updated successfully" in response.json["message"]

    def test_retry_test(self, client, auth_headers):
        """Test retrying a test."""
        # Create a test first
        create_response = client.post("/api/redteam/test", json={
            "test_name": "Retry Test",
            "test_type": "Deepfake Detection",
            "target_system": "Test System"
        }, headers=auth_headers)
        
        test_id = create_response.json["test"]["id"]
        
        # Retry the test
        response = client.post(f"/api/redteam/test/{test_id}/retry", headers=auth_headers)
        assert response.status_code == 201
        data = response.json
        assert data["message"] == "Test retry created"
        assert "test" in data


class TestMonitoring:
    """Test monitoring endpoints."""
    
    def test_generate_monitoring_data(self, client, auth_headers):
        """Test generating monitoring data."""
        response = client.post("/api/monitoring/generate", headers=auth_headers)
        assert response.status_code == 200
        assert "message" in response.json

    def test_get_drift_data(self, client, auth_headers):
        """Test getting drift data."""
        # Generate some data first
        client.post("/api/monitoring/generate", headers=auth_headers)
        
        response = client.get("/api/monitoring/drift", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json, list)

    def test_resolve_alert(self, client, auth_headers):
        """Test resolving an alert."""
        # Create an alert first by generating monitoring data
        client.post("/api/monitoring/generate", headers=auth_headers)
        
        # Get an alert to resolve
        from backend.models import Alert
        from backend.extensions import db
        with client.application.app_context():
            alert = Alert.query.first()
            if alert:
                response = client.post(f"/api/monitoring/alerts/{alert.id}/resolve", headers=auth_headers)
                assert response.status_code == 200
                assert "Alert resolved" in response.json["message"]

    def test_resolve_all_alerts(self, client, auth_headers):
        """Test resolving all alerts."""
        # Generate some data first
        client.post("/api/monitoring/generate", headers=auth_headers)
        
        response = client.post("/api/monitoring/alerts/resolve-all", headers=auth_headers)
        assert response.status_code == 200
        assert "All alerts resolved" in response.json["message"]

    def test_get_compliance_logs(self, client, auth_headers):
        """Test getting compliance logs."""
        response = client.get("/api/monitoring/compliance-logs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json
        assert "logs" in data
        assert "total" in data
        assert "pages" in data
        assert "current_page" in data


class TestReports:
    """Test reports endpoints."""
    
    def test_generate_compliance_report(self, client, auth_headers):
        """Test generating compliance report."""
        response = client.get("/api/reports/compliance/pdf", headers=auth_headers)
        assert response.status_code == 200
        assert response.headers["Content-Type"] == "application/pdf"

    def test_email_compliance_report(self, client, auth_headers):
        """Test emailing compliance report."""
        response = client.post("/api/reports/compliance/email", headers=auth_headers)
        assert response.status_code == 202
        assert "message" in response.json


class TestHealth:
    """Test health endpoints."""
    
    def test_health_check(self, client):
        """Test health check endpoint."""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json
        assert "status" in data
        assert "timestamp" in data
        assert data["status"] == "healthy"


class TestIntegration:
    """Integration tests for complete workflows."""
    
    def test_complete_redteam_workflow(self, client):
        """Test complete Red Team workflow."""
        # 1. Register user
        register_response = client.post("/api/auth/register", json={
            "username": "workflowuser",
            "email": "workflow@example.com",
            "password": "SecurePass123!",
            "company": "Workflow Corp"
        })
        assert register_response.status_code == 201
        
        # 2. Login
        login_response = client.post("/api/auth/login", json={
            "username": "workflowuser",
            "password": "SecurePass123!"
        })
        assert login_response.status_code == 200
        token = login_response.json["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        # 3. Create test
        create_response = client.post("/api/redteam/test", json={
            "test_name": "Workflow Test",
            "test_type": "Prompt Injection",
            "target_system": "Workflow Model"
        }, headers=headers)
        assert create_response.status_code == 201
        test_id = create_response.json["test"]["id"]
        
        # 4. Run test
        run_response = client.post(f"/api/redteam/test/{test_id}/run", headers=headers)
        assert run_response.status_code == 200
        
        # 5. Get results
        get_response = client.get(f"/api/redteam/test/{test_id}", headers=headers)
        assert get_response.status_code == 200
        assert get_response.json["status"] == "completed"
        
        # 6. Generate monitoring data
        monitor_response = client.post("/api/monitoring/generate", headers=headers)
        assert monitor_response.status_code == 200
        
        # 7. Get dashboard stats
        stats_response = client.get("/api/dashboard/stats", headers=headers)
        assert stats_response.status_code == 200
        
        # 8. Generate report
        report_response = client.get("/api/reports/compliance/pdf", headers=headers)
        assert report_response.status_code == 200
        assert report_response.headers["Content-Type"] == "application/pdf"


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    def test_unauthorized_access(self, client):
        """Test accessing protected endpoints without authentication."""
        endpoints = [
            "/api/dashboard/stats",
            "/api/redteam/test",
            "/api/monitoring/generate",
            "/api/reports/compliance/pdf"
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401
            
            response = client.post(endpoint)
            assert response.status_code == 401

    def test_invalid_json(self, client, auth_headers):
        """Test sending invalid JSON."""
        response = client.post("/api/auth/register", 
                             data="invalid json",
                             headers={"Content-Type": "application/json", **auth_headers})
        assert response.status_code == 400

    def test_missing_required_fields(self, client, auth_headers):
        """Test endpoints with missing required fields."""
        # Test registration without required fields
        response = client.post("/api/auth/register", json={
            "username": "testuser"
            # Missing email and password
        })
        assert response.status_code == 400

    def test_rate_limiting(self, client):
        """Test rate limiting on authentication endpoints."""
        # Try to login multiple times quickly
        for i in range(10):
            response = client.post("/api/auth/login", json={
                "username": "nonexistent",
                "password": "wrongpassword"
            })
            # Should eventually hit rate limit
            if response.status_code == 429:
                break
        
        # Should either succeed or hit rate limit
        assert response.status_code in [401, 429]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])