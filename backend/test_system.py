import json

from .base import BaseTestCase


class SystemTestCase(BaseTestCase):
    def test_health_check(self):
        """Test the system health check endpoint."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "healthy")
        self.assertIn("database", data)