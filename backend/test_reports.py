import json
from unittest.mock import patch

from backend.extensions import db
from backend.models import User

from .base import BaseTestCase


class ReportsTestCase(BaseTestCase):
    def test_generate_compliance_report_pdf(self):
        headers = self.get_auth_headers()
        response = self.client.get("/api/reports/compliance/pdf", headers=headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, "application/pdf")
        self.assertIn("attachment", response.headers["Content-Disposition"])
        self.assertTrue(response.data.startswith(b"%PDF-"))

    @patch("backend.reports.threading.Thread")
    def test_email_compliance_report_dispatched_successfully(self, mock_thread):
        """Test that email sending is correctly dispatched to a background thread."""
        headers = self.get_auth_headers()
        response = self.client.post("/api/reports/compliance/email", headers=headers)

        self.assertEqual(response.status_code, 202)
        self.assertIn("Report is being sent", json.loads(response.data)["message"])

        mock_thread.assert_called_once()
        mock_thread.return_value.start.assert_called_once()

        call_args = mock_thread.call_args.kwargs["args"]
        self.assertEqual(call_args[0], 1)  # user_id of 'testuser'
        self.assertEqual(call_args[1], "test@example.com")

    def test_email_report_no_user_email(self):
        """Test emailing report when the user has no email address."""
        user_no_email = User(username="noemailuser", email=None)
        user_no_email.set_password("password")
        db.session.add(user_no_email)
        db.session.commit()

        login_data = self._login_and_get_tokens(
            username="noemailuser", password="password"
        )
        headers = {
            "Authorization": f"Bearer {login_data['access_token']}",
            "Content-Type": "application/json",
        }

        response = self.client.post("/api/reports/compliance/email", headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn("User email not found", json.loads(response.data)["error"])