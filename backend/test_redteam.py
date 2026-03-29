import json

from backend.extensions import db
from backend.models import AITest, User

from .base import BaseTestCase


class RedTeamTestCase(BaseTestCase):
    def test_red_team_flow(self):
        headers = self.get_auth_headers()

        # Create Test
        response = self.client.post(
            "/api/redteam/test",
            headers=headers,
            json={
                "test_name": "Unit Test Attack",
                "test_type": "adversarial",
                "target_system": "ChatBot v1",
            },
        )
        self.assertEqual(response.status_code, 201)
        test_id = json.loads(response.data)["test"]["id"]

        # Run Test
        response = self.client.post(f"/api/redteam/test/{test_id}/run", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("results", data)
        self.assertIn("Adversarial Prompt Injection", data["results"]["attack_type"])

    def test_create_redteam_test_validation(self):
        """Test input validation for creating a red team test."""
        headers = self.get_auth_headers()
        response = self.client.post(
            "/api/redteam/test",
            headers=headers,
            json={"test_name": "Invalid Test", "test_type": "adversarial"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Missing required field: target_system", json.loads(response.data)["error"]
        )

    def test_get_test_details(self):
        """Test fetching details for a single test."""
        headers = self.get_auth_headers()
        create_response = self.client.post(
            "/api/redteam/test",
            headers=headers,
            json={
                "test_name": "Details Test",
                "test_type": "adversarial",
                "target_system": "Details System",
            },
        )
        test_id = json.loads(create_response.data)["test"]["id"]

        details_response = self.client.get(
            f"/api/redteam/test/{test_id}", headers=headers
        )
        self.assertEqual(details_response.status_code, 200)
        data = json.loads(details_response.data)
        self.assertEqual(data["id"], test_id)
        self.assertEqual(data["test_name"], "Details Test")

    def test_redteam_tests_pagination(self):
        """Test pagination for the list of red team tests."""
        headers = self.get_auth_headers()
        user = User.query.filter_by(username="testuser").first()

        for i in range(12):
            test = AITest(
                user_id=user.id,
                test_name=f"Pagination Test {i}",
                test_type="synthetic",
                target_system="API",
            )
            db.session.add(test)
        db.session.commit()

        response = self.client.get("/api/redteam/tests", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data["tests"]), 10)
        self.assertEqual(data["total"], 12)
        self.assertEqual(data["pages"], 2)
        self.assertEqual(data["current_page"], 1)
        self.assertEqual(data["tests"][0]["test_name"], "Pagination Test 11")

        response = self.client.get("/api/redteam/tests?page=2", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data["tests"]), 2)
        self.assertEqual(data["current_page"], 2)