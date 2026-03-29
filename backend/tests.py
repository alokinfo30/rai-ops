import unittest
import json
from unittest.mock import patch
import threading
from app import create_app, db, limiter
from models import User, AITest, Alert
from config import Config
from email_service import send_email

class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    JWT_SECRET_KEY = 'test-secret-key'
    SECRET_KEY = 'test-key'
    RATELIMIT_STORAGE_URI = "memory://"

class BackendTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()
        self._create_test_user()
        # Reset rate limiter to ensure tests are independent
        if hasattr(limiter, 'reset'):
            limiter.reset()
        elif hasattr(limiter, 'storage') and hasattr(limiter.storage, 'reset'):
            limiter.storage.reset()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()

    def _create_test_user(self):
        """Creates a standard user for tests."""
        user = User(username='testuser', email='test@example.com', company='Test Corp')
        user.set_password('password')
        db.session.add(user)
        db.session.commit()

    def _login_and_get_tokens(self, username='testuser', password='password'):
        """Helper to log in and return tokens."""
        response = self.client.post('/api/auth/login', json={
            'username': username,
            'password': password
        })
        return json.loads(response.data)

    def get_auth_headers(self):
        """Gets authorization headers for the default test user."""
        data = self._login_and_get_tokens()
        return {
            'Authorization': f"Bearer {data['access_token']}",
            'Content-Type': 'application/json'
        }

    def test_register_and_login(self):
        # Test Register with a NEW user, as 'testuser' already exists from setUp
        response = self.client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'password',
            'company': 'New Corp'
        })
        self.assertEqual(response.status_code, 201)

        response = self.client.post('/api/auth/login', json={'username': 'newuser', 'password': 'password'})
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('access_token', data)
        self.assertIn('refresh_token', data)

    def test_register_validation(self):
        # Test short password
        response = self.client.post('/api/auth/register', json={
            'username': 'badpass',
            'email': 'valid@example.com',
            'password': 'short',
            'company': 'Test Corp'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('Password must be at least 8 characters', json.loads(response.data)['error'])

        # Test invalid email
        response = self.client.post('/api/auth/register', json={
            'username': 'bademail',
            'email': 'notanemail',
            'password': 'password123',
            'company': 'Test Corp'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('Invalid email', json.loads(response.data)['error'])

    def test_dashboard_stats(self):
        headers = self.get_auth_headers()
        response = self.client.get('/api/dashboard/stats', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('securityTests', data)
        self.assertIn('activeAlerts', data)
        self.assertIn('modelsMonitored', data)

    def test_red_team_flow(self):
        headers = self.get_auth_headers()
        
        # Create Test
        response = self.client.post('/api/redteam/test', headers=headers, json={
            'test_name': 'Unit Test Attack',
            'test_type': 'adversarial',
            'target_system': 'ChatBot v1'
        })
        self.assertEqual(response.status_code, 201)
        test_id = json.loads(response.data)['test']['id']

        # Run Test
        response = self.client.post(f'/api/redteam/test/{test_id}/run', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('results', data)
        self.assertIn('Adversarial Prompt Injection', data['results']['attack_type'])

    def test_create_redteam_test_validation(self):
        """Test input validation for creating a red team test."""
        headers = self.get_auth_headers()
        # Missing target_system
        response = self.client.post('/api/redteam/test', headers=headers, json={
            'test_name': 'Invalid Test', 'test_type': 'adversarial'
        })
        self.assertEqual(response.status_code, 400)
        self.assertIn('Missing required field: target_system', json.loads(response.data)['error'])

    def test_get_test_details(self):
        """Test fetching details for a single test."""
        headers = self.get_auth_headers()
        
        # 1. Create a test first
        create_response = self.client.post('/api/redteam/test', headers=headers, json={
            'test_name': 'Details Test', 'test_type': 'adversarial', 'target_system': 'Details System'
        })
        test_id = json.loads(create_response.data)['test']['id']

        # 2. Fetch the details
        details_response = self.client.get(f'/api/redteam/test/{test_id}', headers=headers)
        self.assertEqual(details_response.status_code, 200)
        data = json.loads(details_response.data)
        self.assertEqual(data['id'], test_id)
        self.assertEqual(data['test_name'], 'Details Test')

    def test_monitoring_generation(self):
        headers = self.get_auth_headers()
        
        # Trigger Generation
        response = self.client.post('/api/monitoring/generate', headers=headers)
        self.assertEqual(response.status_code, 200)

        # Get Drift Data
        response = self.client.get('/api/monitoring/drift', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(len(data) > 0)
        self.assertIn('drift_score', data[0])

    def test_expert_session(self):
        headers = self.get_auth_headers()
        
        # Create Session
        response = self.client.post('/api/knowledge/expert/session', headers=headers, json={
            'expert_name': 'Dr. Test',
            'domain': 'Testing',
            'experience': 10
        })
        self.assertEqual(response.status_code, 201)
        session_id = json.loads(response.data)['session']['id']

        # Get Virtual Apprentice
        response = self.client.get(f'/api/knowledge/virtual-apprentice/{session_id}', headers=headers)
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('capabilities', data)

    def test_alert_resolution(self):
        headers = self.get_auth_headers()
        
        # 1. Test resolving a single alert
        # Manually create an alert
        alert1 = Alert(severity='high', message='Test Alert 1')
        db.session.add(alert1)
        db.session.commit()
        
        self.assertFalse(alert1.resolved)
        
        # Resolve the alert via API
        response = self.client.post(f'/api/monitoring/alerts/{alert1.id}/resolve', headers=headers)
        self.assertEqual(response.status_code, 200)
        
        # Verify it's resolved in the DB
        resolved_alert1 = Alert.query.get(alert1.id)
        self.assertTrue(resolved_alert1.resolved)

        # 2. Test resolving all alerts
        # Manually create another alert
        alert2 = Alert(severity='medium', message='Test Alert 2')
        db.session.add(alert2)
        db.session.commit()

        # Resolve all alerts via API
        response = self.client.post('/api/monitoring/alerts/resolve-all', headers=headers)
        self.assertEqual(response.status_code, 200)

        # Verify the second alert is now resolved
        resolved_alert2 = Alert.query.get(alert2.id)
        self.assertTrue(resolved_alert2.resolved)

    def test_update_profile(self):
        headers = self.get_auth_headers()
        
        # Update profile
        new_company = 'Updated Corp'
        new_password = 'newpassword123'
        
        response = self.client.put('/api/auth/profile', headers=headers, json={
            'company': new_company,
            'password': new_password
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['user']['company'], new_company)
        
        # Verify password change by trying to login with new password
        login_response = self.client.post('/api/auth/login', json={
            'username': 'testuser',
            'password': new_password
        })
        self.assertEqual(login_response.status_code, 200)

    def test_token_refresh(self):
        # Login with the default test user to get tokens
        data = self._login_and_get_tokens()
        refresh_token = data['refresh_token']
        
        headers = {
            'Authorization': f"Bearer {refresh_token}"
        }
        refresh_response = self.client.post('/api/auth/refresh', headers=headers)
        self.assertEqual(refresh_response.status_code, 200)
        refresh_data = json.loads(refresh_response.data)
        self.assertIn('access_token', refresh_data)

    def test_drift_simulation_logic(self):
        from services import simulate_drift_metrics
        
        # Test with None baseline
        baseline, current, drift = simulate_drift_metrics(None)
        self.assertIsNotNone(baseline)
        self.assertIsNotNone(current)
        self.assertGreaterEqual(drift, 0)
        
        # Test with existing baseline
        baseline_orig = 0.9
        baseline, current, drift = simulate_drift_metrics(baseline_orig)
        self.assertEqual(baseline, baseline_orig)
        self.assertLessEqual(current, 1.0)

    def test_forgot_and_reset_password(self):
        # Register a user
        username = 'resetuser'
        email = 'reset@example.com'
        old_password = 'oldpassword'
        self.client.post('/api/auth/register', json={
            'username': username,
            'email': email,
            'password': old_password,
            'company': 'Reset Corp'
        })

        # Request password reset
        response = self.client.post('/api/auth/forgot-password', json={
            'email': email
        })
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('mock_token', data)
        reset_token = data['mock_token']

        # Reset password
        new_password = 'newpassword123'
        reset_response = self.client.post('/api/auth/reset-password', json={
            'token': reset_token,
            'password': new_password
        })
        self.assertEqual(reset_response.status_code, 200)

        # Verify login with new password
        login_response = self.client.post('/api/auth/login', json={
            'username': username,
            'password': new_password
        })
        self.assertEqual(login_response.status_code, 200)

    def test_rate_limiting(self):
        # Test login endpoint which has a limit of 5 per minute
        for i in range(5):
            response = self.client.post('/api/auth/login', json={
                'username': 'ratelimit_user',
                'password': 'password'
            })
            # The user doesn't exist, so we expect 401, not 429
            self.assertEqual(response.status_code, 401)
        
        # The 6th request should be rate limited
        response = self.client.post('/api/auth/login', json={
            'username': 'ratelimit_user',
            'password': 'password'
        })
        self.assertEqual(response.status_code, 429)

    def test_forgot_password_rate_limiting(self):
        # Test forgot password endpoint which has a limit of 5 per hour
        for i in range(5):
            response = self.client.post('/api/auth/forgot-password', json={
                'email': 'rate@example.com'
            })
            self.assertEqual(response.status_code, 200)
        
        # The 6th request should be rate limited
        response = self.client.post('/api/auth/forgot-password', json={
            'email': 'rate@example.com'
        })
        self.assertEqual(response.status_code, 429)

    def test_generate_compliance_report_pdf(self):
        headers = self.get_auth_headers()
        response = self.client.get('/api/reports/compliance/pdf', headers=headers)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content_type, 'application/pdf')
        self.assertIn('attachment', response.headers['Content-Disposition'])
        self.assertIn('.pdf', response.headers['Content-Disposition'])
        
        # Check if the PDF content is not empty and starts with the PDF magic number
        self.assertTrue(len(response.data) > 0)
        self.assertTrue(response.data.startswith(b'%PDF-'))

    @patch('reports.threading.Thread')
    def test_email_compliance_report_dispatched_successfully(self, mock_thread):
        """Test that email sending is correctly dispatched to a background thread."""
        headers = self.get_auth_headers()
        response = self.client.post('/api/reports/compliance/email', headers=headers)
        
        self.assertEqual(response.status_code, 202)
        self.assertIn('Report is being sent', json.loads(response.data)['message'])
        
        # Verify that a Thread was created with the send_email function as its target
        mock_thread.assert_called_once()
        call_kwargs = mock_thread.call_args.kwargs
        self.assertEqual(call_kwargs['target'], send_email)
        
        # Check some of the args passed to the thread to ensure it's the right call
        thread_args = call_kwargs['args']
        self.assertEqual(thread_args[0], 'test@example.com') # to_email
        self.assertEqual(thread_args[1], 'RAI Ops Compliance Report') # subject
        self.assertIn('<html>', thread_args[3]) # html_body
        self.assertIsInstance(thread_args[4], bytes) # attachment_bytes
        self.assertTrue(thread_args[5].startswith('compliance_report_')) # attachment_name
        mock_thread.return_value.start.assert_called_once()

    def test_email_report_no_user_email(self):
        """Test emailing report when the user has no email address."""
        # Create and log in as a user without an email
        user_no_email = User(username='noemailuser', email=None)
        user_no_email.set_password('password')
        db.session.add(user_no_email)
        db.session.commit()
        login_data = self._login_and_get_tokens(username='noemailuser', password='password')
        headers = {'Authorization': f"Bearer {login_data['access_token']}"}
        response = self.client.post('/api/reports/compliance/email', headers=headers)
        self.assertEqual(response.status_code, 400)
        self.assertIn('User email not found', json.loads(response.data)['error'])

    def test_delete_account(self):
        """Test user account deletion."""
        headers = self.get_auth_headers()
        
        # Delete account
        response = self.client.delete('/api/user/me', headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn('Account deleted', json.loads(response.data)['message'])
        
        # Verify user is gone by trying to login
        login_response = self.client.post('/api/auth/login', json={'username': 'testuser', 'password': 'password'})
        self.assertEqual(login_response.status_code, 401)

    def test_health_check(self):
        """Test the system health check endpoint."""
        response = self.client.get('/health')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'healthy')
        self.assertIn('database', data)

if __name__ == '__main__':
    unittest.main()