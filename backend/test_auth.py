import json

from backend.extensions import db
from backend.models import User

from .base import BaseTestCase


class AuthTestCase(BaseTestCase):
    def test_register_and_login(self):
        # Test Register with a NEW user, as 'testuser' already exists from setUp
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "newuser",
                "email": "new@example.com",
                "password": "StrongPassword1",
                "company": "New Corp",
            },
        )
        self.assertEqual(response.status_code, 201)

        response = self.client.post(
            "/api/auth/login", json={"username": "newuser", "password": "StrongPassword1"}
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

    def test_register_validation(self):
        # Test short password
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "badpass",
                "email": "valid@example.com",
                "password": "short",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn(
            "Password must be at least 8 characters", json.loads(response.data)["error"]
        )

        # Test invalid email
        response = self.client.post(
            "/api/auth/register",
            json={
                "username": "bademail",
                "email": "notanemail",
                "password": "password123A",
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid email", json.loads(response.data)["error"])

    def test_password_validation_logic(self):
        """Unit test for password validation function."""
        from backend.auth import validate_password_strength

        self.assertTrue(validate_password_strength("Valid1Password")[0])
        self.assertFalse(validate_password_strength("Short1")[0])
        self.assertFalse(validate_password_strength("NoNumberHere")[0])
        self.assertFalse(validate_password_strength("nouppercase1")[0])

    def test_update_profile(self):
        headers = self.get_auth_headers()
        new_company = "Updated Corp"
        new_password = "newpassword123A"

        response = self.client.put(
            "/api/auth/profile",
            headers=headers,
            json={"company": new_company, "password": new_password},
        )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["user"]["company"], new_company)

        login_response = self.client.post(
            "/api/auth/login", json={"username": "testuser", "password": new_password}
        )
        self.assertEqual(login_response.status_code, 200)

    def test_token_refresh(self):
        data = self._login_and_get_tokens()
        refresh_token = data["refresh_token"]
        headers = {"Authorization": f"Bearer {refresh_token}"}
        response = self.client.post("/api/auth/refresh", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", json.loads(response.data))

    def test_forgot_and_reset_password(self):
        email = "test@example.com"
        response = self.client.post("/api/auth/forgot-password", json={"email": email})
        self.assertEqual(response.status_code, 200)
        reset_token = json.loads(response.data)["mock_token"]

        new_password = "newpassword123A"
        response = self.client.post(
            "/api/auth/reset-password",
            json={"token": reset_token, "password": new_password},
        )
        self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/login", json={"username": "testuser", "password": new_password}
        )
        self.assertEqual(response.status_code, 200)

    def test_rate_limiting_login(self):
        for i in range(5):
            response = self.client.post(
                "/api/auth/login",
                json={"username": "ratelimit_user", "password": "password"},
            )
            self.assertEqual(response.status_code, 401)

        response = self.client.post(
            "/api/auth/login",
            json={"username": "ratelimit_user", "password": "password"},
        )
        self.assertEqual(response.status_code, 429)

    def test_forgot_password_rate_limiting(self):
        for i in range(5):
            response = self.client.post(
                "/api/auth/forgot-password", json={"email": "rate@example.com"}
            )
            self.assertEqual(response.status_code, 200)

        response = self.client.post(
            "/api/auth/forgot-password", json={"email": "rate@example.com"}
        )
        self.assertEqual(response.status_code, 429)

    def test_delete_account(self):
        headers = self.get_auth_headers()
        response = self.client.delete("/api/user/me", headers=headers)
        self.assertEqual(response.status_code, 200)
        self.assertIn("Account deleted", json.loads(response.data)["message"])

        response = self.client.post(
            "/api/auth/login", json={"username": "testuser", "password": "password"}
        )
        self.assertEqual(response.status_code, 401)