import json

from backend.extensions import db
from backend.models import Alert, ModelDrift
from backend.services import calculate_drift_metrics

from .base import BaseTestCase


class MonitoringTestCase(BaseTestCase):
    def test_monitoring_generation(self):
        headers = self.get_auth_headers()
        response = self.client.post("/api/monitoring/generate", headers=headers)
        self.assertEqual(response.status_code, 200)

        response = self.client.get("/api/monitoring/drift", headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(len(data) > 0)
        self.assertIn("drift_score", data[0])

    def test_alert_resolution(self):
        headers = self.get_auth_headers()

        alert1 = Alert(severity="high", message="Test Alert 1")
        db.session.add(alert1)
        db.session.commit()
        self.assertFalse(alert1.resolved)

        response = self.client.post(
            f"/api/monitoring/alerts/{alert1.id}/resolve", headers=headers
        )
        self.assertEqual(response.status_code, 200)

        resolved_alert1 = db.session.get(Alert, alert1.id)
        self.assertTrue(resolved_alert1.resolved)

        alert2 = Alert(severity="medium", message="Test Alert 2")
        db.session.add(alert2)
        db.session.commit()

        response = self.client.post("/api/monitoring/alerts/resolve-all", headers=headers)
        self.assertEqual(response.status_code, 200)

        resolved_alert2 = db.session.get(Alert, alert2.id)
        self.assertTrue(resolved_alert2.resolved)

    def test_drift_calculation_logic(self):
        """Tests the refactored drift calculation service which uses historical data."""
        model_name = "drift_test_model"
        metric_name = "accuracy"

        # 1. Test with no history in DB (should create a new baseline)
        baseline, current, drift = calculate_drift_metrics(model_name, metric_name)
        self.assertEqual(baseline, current)
        self.assertEqual(drift, 0.0)

        # 2. Add the first entry to the DB to establish history
        first_entry = ModelDrift(
            model_name=model_name,
            metric_name=metric_name,
            baseline_value=baseline,
            current_value=current,
            drift_score=drift,
        )
        db.session.add(first_entry)
        db.session.commit()

        # 3. Test again with existing history
        new_baseline, new_current, new_drift = calculate_drift_metrics(
            model_name, metric_name
        )
        self.assertEqual(new_baseline, baseline)
        self.assertIsNotNone(new_current)
        self.assertGreaterEqual(new_drift, 0)