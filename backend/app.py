from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from werkzeug.exceptions import HTTPException
from datetime import datetime, timedelta
import os
import sys
from models import db, User, AITest, ComplianceLog, ModelDrift, Alert, ExpertSession
from config import Config

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

def create_app(config_class=Config):
    # Determine static folder path (robust for different execution contexts)
    basedir = os.path.abspath(os.path.dirname(__file__))
    static_folder = os.path.join(basedir, '../frontend')

    if not os.path.exists(static_folder):
        print(f"WARNING: Static folder not found at {static_folder}. Frontend may not be served correctly.", file=sys.stderr)

    app = Flask(__name__, static_folder=static_folder)
    app.config.from_object(config_class)

    # Initialize extensions
    # Configure Content Security Policy
    csp = {
        'default-src': ["'self'"],
        'script-src': ["'self'", "https://cdn.jsdelivr.net"],
        'style-src': ["'self'", "https://cdnjs.cloudflare.com"],
        'font-src': ["'self'", "https://cdnjs.cloudflare.com"],
        'img-src': ["'self'", "data:"],
    }
    # Force HTTPS only if not in debug/testing mode
    Talisman(app, content_security_policy=csp, force_https=not app.debug and not app.testing)
    limiter.init_app(app)
    CORS(app)
    JWTManager(app)
    db.init_app(app)

    # Register Blueprints
    from auth import auth_bp
    from dashboard import dashboard_bp
    from redteam import redteam_bp
    from monitoring import monitoring_bp
    from knowledge import knowledge_bp
    from reports import reports_bp
    from user import user_bp
    from health import health_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(redteam_bp)
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(health_bp)

    # Register CLI commands
    @app.cli.command("init-db")
    def init_db_command():
        """Creates the database tables."""
        with app.app_context():
            db.create_all()
        print("Initialized the database.")

    @app.cli.command("test")
    def test_command():
        """Runs the unit tests."""
        import unittest
        tests = unittest.TestLoader().discover('.')
        result = unittest.TextTestRunner(verbosity=2).run(tests)
        if not result.wasSuccessful():
            sys.exit(1)

    # Global Error Handlers
    @app.errorhandler(429)
    def ratelimit_handler(e):
        return jsonify(error=f"Rate limit exceeded: {e.description}"), 429

    @app.errorhandler(404)
    def not_found_handler(e):
        # Return JSON for API routes, let frontend handle others (or Nginx)
        if request.path.startswith('/api/'):
            return jsonify(error="Resource not found"), 404
        return e

    @app.errorhandler(500)
    def internal_error_handler(e):
        return jsonify(error="Internal Server Error"), 500
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        if isinstance(e, HTTPException):
            return e
        print(f"Unhandled Exception: {e}", file=sys.stderr)
        return jsonify(error="Internal Server Error"), 500

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)