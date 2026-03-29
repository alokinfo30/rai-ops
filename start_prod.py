#!/usr/bin/env python3
"""
Production startup script for RAI Ops application.
This script sets up the production environment and starts the backend server with Gunicorn.
"""

import os
import sys
import subprocess
import logging
from pathlib import Path

def setup_logging():
    """Set up logging for the production server."""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/prod_server.log')
        ]
    )
    return logging.getLogger(__name__)

def check_production_environment():
    """Check if the production environment is properly configured."""
    logger = setup_logging()
    logger.info("Checking production environment...")
    
    # Check required environment variables
    required_env_vars = [
        'SECRET_KEY',
        'JWT_SECRET_KEY',
        'DATABASE_URL',
        'MAIL_USERNAME',
        'MAIL_PASSWORD',
        'OPENAI_API_KEY'
    ]
    
    missing_vars = []
    for var in required_env_vars:
        if not os.environ.get(var):
            missing_vars.append(var)
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {', '.join(missing_vars)}")
        logger.error("Please set these variables in your .env file or environment.")
        return False
    
    # Check if database URL is PostgreSQL (required for production)
    db_url = os.environ.get('DATABASE_URL', '')
    if not db_url.startswith('postgresql'):
        logger.error("Production environment must use PostgreSQL database")
        logger.error(f"Current DATABASE_URL: {db_url}")
        return False
    
    # Check if backend directory exists
    if not Path("backend").exists():
        logger.error("backend directory not found!")
        return False
    
    logger.info("Production environment check passed!")
    return True

def install_production_dependencies():
    """Install production dependencies."""
    logger = setup_logging()
    logger.info("Installing production dependencies...")
    
    # Install Python dependencies
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "backend/requirements.txt"], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to install Python dependencies: {result.stderr}")
        return False
    
    logger.info("Production dependencies installed successfully!")
    return True

def run_migrations():
    """Run database migrations."""
    logger = setup_logging()
    logger.info("Running database migrations...")
    
    try:
        # Import and run migrations
        from backend.migrations import run_migrations
        from backend import create_app
        
        app = create_app()
        with app.app_context():
            run_migrations(app)
        logger.info("Database migrations completed successfully!")
        return True
    except Exception as e:
        logger.error(f"Failed to run migrations: {e}")
        return False

def start_production_server():
    """Start the production server with Gunicorn."""
    logger = setup_logging()
    logger.info("Starting production server with Gunicorn...")
    
    # Set production environment variables
    env = os.environ.copy()
    env.update({
        'FLASK_ENV': 'production',
        'FLASK_DEBUG': '0',
        'LOG_LEVEL': 'INFO'
    })
    
    # Gunicorn configuration
    gunicorn_cmd = [
        'gunicorn',
        '--bind', '0.0.0.0:5000',
        '--workers', str(os.cpu_count() * 2 + 1),
        '--worker-class', 'gevent',
        '--worker-connections', '1000',
        '--max-requests', '1000',
        '--max-requests-jitter', '50',
        '--timeout', '30',
        '--keep-alive', '2',
        '--log-level', 'info',
        '--access-logfile', 'logs/gunicorn_access.log',
        '--error-logfile', 'logs/gunicorn_error.log',
        '--capture-output',
        '--enable-stdio-inheritance',
        'backend.app:app'
    ]
    
    logger.info(f"Starting Gunicorn with command: {' '.join(gunicorn_cmd)}")
    
    # Start Gunicorn server
    process = subprocess.Popen(
        gunicorn_cmd,
        env=env,
        cwd=".",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait a moment to check if server started successfully
    import time
    time.sleep(3)
    
    if process.poll() is not None:
        stdout, stderr = process.communicate()
        logger.error(f"Production server failed to start: {stderr}")
        return None
    
    logger.info("Production server started successfully!")
    logger.info("Server listening on http://0.0.0.0:5000")
    return process

def main():
    """Main function to start the production environment."""
    logger = setup_logging()
    logger.info("Starting RAI Ops production environment...")
    
    # Check environment
    if not check_production_environment():
        logger.error("Production environment check failed!")
        sys.exit(1)
    
    # Install dependencies
    if not install_production_dependencies():
        logger.error("Failed to install production dependencies!")
        sys.exit(1)
    
    # Run migrations
    if not run_migrations():
        logger.error("Failed to run database migrations!")
        sys.exit(1)
    
    # Start production server
    process = start_production_server()
    if not process:
        logger.error("Failed to start production server!")
        sys.exit(1)
    
    logger.info("Production environment started successfully!")
    logger.info("Server: http://0.0.0.0:5000")
    logger.info("Press Ctrl+C to stop the server...")
    
    try:
        # Keep the script running and monitor the process
        process.wait()
    except KeyboardInterrupt:
        logger.info("Shutting down production server...")
        process.terminate()
        process.wait()
        logger.info("Production server stopped!")

if __name__ == "__main__":
    main()