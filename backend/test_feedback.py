from backend.models import Feedback

def test_feedback_submission_persists(client, auth_headers):
    """Test that feedback submission is saved to the database."""
    payload = {"message": "This is a test feedback message."}
    
    response = client.post("/api/feedback", json=payload, headers=auth_headers)
    assert response.status_code == 201

    # Verify it's in the database
    feedback_entry = Feedback.query.filter_by(message=payload["message"]).first()
    assert feedback_entry is not None
    assert feedback_entry.user_id == 1 # 'testuser' has id 1

def test_get_feedback_admin(client, admin_auth_headers):
    """Test that an admin can retrieve all feedback."""
    # First, submit some feedback to retrieve
    client.post("/api/feedback", json={"message": "Admin test feedback"}, headers=admin_auth_headers)
    
    response = client.get("/api/feedback", headers=admin_auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["message"] == "Admin test feedback"

def test_get_feedback_non_admin(client, auth_headers):
    """Test that a non-admin user cannot retrieve feedback."""
    response = client.get("/api/feedback", headers=auth_headers)
    assert response.status_code == 403

def test_delete_feedback_admin(client, admin_auth_headers):
    """Test that an admin can delete feedback."""
    # Create feedback to delete
    client.post("/api/feedback", json={"message": "To be deleted"}, headers=admin_auth_headers)
    feedback = Feedback.query.filter_by(message="To be deleted").first()
    assert feedback is not None

    response = client.delete(f"/api/feedback/{feedback.id}", headers=admin_auth_headers)
    assert response.status_code == 200
    assert Feedback.query.get(feedback.id) is None