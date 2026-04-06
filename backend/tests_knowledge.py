import json
import unittest
from unittest.mock import MagicMock, patch

from backend import create_app
from backend.config import Config
from backend.extensions import db, limiter
from backend.models import User


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    JWT_SECRET_KEY = "test-secret-key"
    RATELIMIT_STORAGE_URI = "memory://"


class KnowledgeTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        
        # Create user
        self.user = User(username="kuser", email="k@test.com")
        self.user.set_password("password")
        db.session.add(self.user)
        db.session.commit()
        
        # Login
        resp = self.client.post("/api/auth/login", json={"username": "kuser", "password": "password"})
        self.token = json.loads(resp.data)["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        with self.app.app_context():
            limiter.storage.reset()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def test_create_expert_session_deterministic(self):
        """Test creating a session without OpenAI (simulated logic)."""
        payload = {
            "expert_name": "Simulated Expert",
            "domain": "Fraud Detection",
            "experience": 15
        }
        
        # Mock the client in knowledge_service to be None to force simulation
        with patch("backend.knowledge_service.client", None):
            response = self.client.post("/api/knowledge/expert/session", json=payload, headers=self.headers)
            
            self.assertEqual(response.status_code, 201)
            data = json.loads(response.data)
            self.assertIn("session", data)
            self.assertEqual(data["session"]["expert_name"], "Simulated Expert")
            
            # Check if keys exist in the generated knowledge graph
            kg = data["session"]["knowledge_graph"]
            self.assertIn("key_insights", kg)
            self.assertTrue(len(kg["key_insights"]) > 0)
            self.assertIn("decision_trees", kg)

    def test_virtual_apprentice_generation(self):
        """Test generating apprentice data from an existing session."""
        # 1. Create session first
        payload = {"expert_name": "Mentor", "domain": "Credit", "experience": 5}
        with patch("backend.knowledge_service.client", None):
            create_resp = self.client.post("/api/knowledge/expert/session", json=payload, headers=self.headers)
            session_id = json.loads(create_resp.data)["session"]["id"]
            
        # 2. Get apprentice
        response = self.client.get(f"/api/knowledge/virtual-apprentice/{session_id}", headers=self.headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        
        self.assertEqual(data["based_on_expert"], "Mentor")
        self.assertIn("capabilities", data)
        self.assertIn("current_questions", data)
        # Verify context-aware question generation
        question = data["current_questions"][0]
        self.assertIn("expert_answer", question)