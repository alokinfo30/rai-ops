import json
import unittest

from backend import create_app
from backend.config import Config
from backend.extensions import db, limiter
from backend.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key"
    SECRET_KEY = "test-key"
    RATELIMIT_STORAGE_URI = "memory://"


class BaseTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self._create_test_user()
        with self.app.app_context():
            limiter.storage.reset()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _create_test_user(self):
        """Creates a standard user for tests."""
        user = User(username="testuser", email="test@example.com", company="Test Corp")
        user.set_password("password")
        db.session.add(user)
        db.session.commit()

    def _login_and_get_tokens(self, username="testuser", password="password"):
        """Helper to log in and return tokens."""
        response = self.client.post(
            "/api/auth/login", json={"username": username, "password": password}
        )
        return json.loads(response.data)

    def get_auth_headers(self):
        """Gets authorization headers for the default test user."""
        data = self._login_and_get_tokens()
        return {
            "Authorization": f"Bearer {data['access_token']}",
            "Content-Type": "application/json",
        }