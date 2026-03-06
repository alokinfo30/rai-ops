import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-please-change')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-key-please-change')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    REDIS_URL = os.environ.get('REDIS_URL')
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')