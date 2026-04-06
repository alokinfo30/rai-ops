import json
from datetime import datetime, timedelta

from .base import BaseTestCase


class ScheduledTestsTestCase(BaseTestCase):
    def test_create_scheduled_test_validation(self):
        """Test validation for creating a scheduled test."""
        headers = self.get_auth_headers()

        # Test with a start date in the past
        past_date = (datetime.utcnow() - timedelta(days=1)).isoformat() + "Z"
        response = self.client.post(
            "/api/scheduled_tests",
            headers=headers,
            json={
                "test_name": "Past Test",
                "test_type": "adversarial",
                "target_system": "API",
                "schedule_interval": "daily",
                "start_date": past_date,
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Start date must be in the future", json.loads(response.data)["error"])

        # Test with a valid future date
        future_date = (datetime.utcnow() + timedelta(days=1)).isoformat() + "Z"
        response = self.client.post(
            "/api/scheduled_tests",
            headers=headers,
            json={
                "test_name": "Future Test",
                "test_type": "adversarial",
                "target_system": "API",
                "schedule_interval": "daily",
                "start_date": future_date,
            },
        )
        self.assertEqual(response.status_code, 201)