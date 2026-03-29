def test_auth_login(client):
    """Test login functionality."""
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "password123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json
    assert "user" in response.json

def test_auth_login_invalid(client):
    """Test login with wrong password."""
    response = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword"
    })
    assert response.status_code == 401

def test_dashboard_stats(client, auth_headers):
    """Test dashboard stats endpoint."""
    response = client.get("/api/dashboard/stats", headers=auth_headers)
    assert response.status_code == 200
    data = response.json
    assert "complianceScore" in data
    assert "activeAlerts" in data

def test_redteam_workflow(client, auth_headers):
    """Test creating and running a Red Team test."""
    # 1. Create Test
    payload = {
        "test_name": "Pytest Injection",
        "test_type": "Prompt Injection",
        "target_system": "Model-A"
    }
    create_res = client.post("/api/redteam/test", json=payload, headers=auth_headers)
    assert create_res.status_code == 201
    test_id = create_res.json["test"]["id"]
    
    # 2. Run Test
    run_res = client.post(f"/api/redteam/test/{test_id}/run", headers=auth_headers)
    assert run_res.status_code == 200
    assert "results" in run_res.json
    
    # 3. Check Details
    get_res = client.get(f"/api/redteam/test/{test_id}", headers=auth_headers)
    assert get_res.json["status"] == "completed"

def test_monitoring_generation(client, auth_headers):
    """Test monitoring data generation."""
    response = client.post("/api/monitoring/generate", headers=auth_headers)
    assert response.status_code == 200
    
    # Check if drift data exists
    drift_res = client.get("/api/monitoring/drift", headers=auth_headers)
    assert drift_res.status_code == 200
    assert isinstance(drift_res.json, list)
    # Since we just generated, it should not be empty
    assert len(drift_res.json) > 0

def test_reports_generation(client, auth_headers):
    """Test PDF generation endpoint."""
    response = client.get("/api/reports/compliance/pdf", headers=auth_headers)
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert len(response.data) > 0