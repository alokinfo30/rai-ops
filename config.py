import os
from datetime import timedelta

class Config:
    """Base configuration class with common settings."""
    
    # Application
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'dev-jwt-secret-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    ENV = os.environ.get('ENV', 'development')
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///rai_ops.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Security
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    
    # CORS
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', 'http://localhost:5173').split(',')
    CORS_ALLOW_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']
    CORS_EXPOSE_HEADERS = ['X-Total-Count']
    
    # Rate Limiting
    RATELIMIT_STORAGE_URL = os.environ.get('RATE_LIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    RATELIMIT_HEADERS_ENABLED = True
    
    # Email
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')
    
    # OpenAI
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    OPENAI_ORG_ID = os.environ.get('OPENAI_ORG_ID')
    
    # Redis
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    LOG_FILE = os.environ.get('LOG_FILE', 'logs/app.log')
    
    # Frontend
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
    API_BASE_URL = os.environ.get('API_BASE_URL', 'http://localhost:5000')
    
    # Uploads
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Testing
    TESTING = False
    DEBUG = False


class DevelopmentConfig(Config):
    """Development environment configuration."""
    
    DEBUG = True
    TESTING = False
    
    # Database - use SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///rai_ops_dev.db'
    
    # Security - relaxed for development
    WTF_CSRF_ENABLED = False
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Rate Limiting - more lenient for development
    RATELIMIT_STORAGE_URL = 'memory://'  # Use in-memory storage for development
    
    # Logging - more verbose for development
    LOG_LEVEL = 'DEBUG'


class TestingConfig(Config):
    """Testing environment configuration."""
    
    TESTING = True
    DEBUG = False
    
    # Use in-memory SQLite for testing
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    SQLALCHEMY_ENGINE_OPTIONS = {
        'connect_args': {'check_same_thread': False}
    }
    
    # Disable CSRF for testing
    WTF_CSRF_ENABLED = False
    
    # Use in-memory storage for testing
    RATELIMIT_STORAGE_URL = 'memory://'
    REDIS_URL = 'memory://'
    
    # Disable email sending for testing
    MAIL_SUPPRESS_SEND = True
    
    # Use test log level
    LOG_LEVEL = 'WARNING'


class ProductionConfig(Config):
    """Production environment configuration."""
    
    DEBUG = False
    TESTING = False
    
    # Database - enforce PostgreSQL for production
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    if not SQLALCHEMY_DATABASE_URI or SQLALCHEMY_DATABASE_URI.startswith('sqlite'):
        raise ValueError("Production environment must use PostgreSQL database")
    
    # Security - strict settings for production
    WTF_CSRF_ENABLED = True
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    
    # Rate Limiting - strict limits for production
    RATELIMIT_STORAGE_URL = os.environ.get('RATE_LIMIT_STORAGE_URL', 'redis://localhost:6379/1')
    
    # Logging - production appropriate
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
    
    # Ensure required environment variables are set
    REQUIRED_ENV_VARS = [
        'SECRET_KEY',
        'JWT_SECRET_KEY', 
        'DATABASE_URL',
        'MAIL_USERNAME',
        'MAIL_PASSWORD',
        'OPENAI_API_KEY'
    ]
    
    def __init__(self):
        missing_vars = [var for var in self.REQUIRED_ENV_VARS if not os.environ.get(var)]
        if missing_vars:
            raise ValueError(f"Missing required environment variables for production: {', '.join(missing_vars)}")


# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}


def get_config():
    """Get the appropriate configuration based on the environment."""
    env = os.environ.get('FLASK_ENV', 'development')
    return config.get(env, DevelopmentConfig)()