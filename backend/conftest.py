import pytest
from backend import create_app
from backend.extensions import db
from backend.models import User

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",  # Use in-memory DB for speed
        "JWT_SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False
    })

    with app.app_context():
        db.create_all()
        
        # Create a default test user
        user = User(username="testuser", email="test@example.com")
        user.set_password("password123")
        db.session.add(user)

        # Create a default admin user
        admin = User(username="adminuser", email="admin@example.com", role="admin")
        admin.set_password("adminpass")
        db.session.add(admin)

        db.session.commit()

        yield app
        
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    """Get a valid JWT token header for the test user."""
    response = client.post("/api/auth/login", json={"username": "testuser", "password": "password123"})
    token = response.json["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_auth_headers(client):
    """Get a valid JWT token header for the admin user."""
    response = client.post("/api/auth/login", json={"username": "adminuser", "password": "adminpass"})
    token = response.json["access_token"]
    return {"Authorization": f"Bearer {token}"}