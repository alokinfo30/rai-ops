import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from .extensions import db

# Import config - handle both development and production paths
try:
    from ..config import get_config
except ImportError:
    # Fallback for when running from backend directory directly
    import sys
    import os
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from config import get_config

def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    
    # Load configuration
    if test_config:
        app.config.from_mapping(test_config)
    else:
        # Load configuration based on environment
        config_obj = get_config()
        app.config.from_object(config_obj)
    
    # Ensure instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass

    # Initialize Extensions
    db.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', ['http://localhost:5173']))
    JWTManager(app)

    # Register Blueprints
    from .auth import auth_bp
    from .dashboard import dashboard_bp
    from .redteam import redteam_bp
    from .monitoring_routes import monitoring_bp
    from .knowledge_routes import knowledge_bp
    from .reports import reports_bp
    from .scheduled_tests import scheduled_tests_bp
    from .notifications import notifications_bp
    from .health import health_bp
    from .settings_routes import settings_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(redteam_bp)
    app.register_blueprint(monitoring_bp)
    app.register_blueprint(knowledge_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(scheduled_tests_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(settings_bp)

    return app
