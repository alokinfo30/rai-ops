import os
import sys
from datetime import timedelta
from dotenv import load_dotenv

# Load .env from parent directory if it exists
basedir = os.path.abspath(os.path.dirname(__file__))
env_path = os.path.join(basedir, '..', '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

class Config:
    # Database
    # Prioritize DATABASE_URL from environment (Render/Production)
    uri = os.environ.get('DATABASE_URL')
    
    if uri:
        if uri.startswith("postgres://"):
            uri = uri.replace("postgres://", "postgresql://", 1)
        SQLALCHEMY_DATABASE_URI = uri
    else:
        db_user = os.environ.get('POSTGRES_USER', 'user')
        db_password = os.environ.get('POSTGRES_PASSWORD', 'password')
        db_host = os.environ.get('DATABASE_HOST', 'localhost')
        db_name = os.environ.get('POSTGRES_DB', 'aigovernance')
        SQLALCHEMY_DATABASE_URI = f"postgresql://{db_user}:{db_password}@{db_host}:5432/{db_name}"

    SQLALCHEMY_DATABASE_URI = SQLALCHEMY_DATABASE_URI
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    
    # Rate Limiting
    RATELIMIT_STORAGE_URI = os.getenv('REDIS_URL', 'memory://')
    REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
    
    # OpenAI
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    
    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = 'uploads'
    
    # Environment
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False

    # Frontend
    FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:8000')