#!/usr/bin/env python3
"""
Development startup script for RAI Ops application.
This script sets up the development environment and starts both backend and frontend services.
"""

import os
import sys
import subprocess
import signal
import time
from pathlib import Path

def setup_logging():
    """Set up logging for the development server."""
    import logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler('logs/dev_server.log')
        ]
    )
    return logging.getLogger(__name__)

def create_logs_directory():
    """Create logs directory if it doesn't exist."""
    logs_dir = Path("logs")
    logs_dir.mkdir(exist_ok=True)

def check_environment():
    """Check if the development environment is properly set up."""
    logger = setup_logging()
    logger.info("Checking development environment...")
    
    # Check if required directories exist
    required_dirs = ["backend", "frontend", "logs"]
    for dir_name in required_dirs:
        if not Path(dir_name).exists():
            logger.error(f"Required directory '{dir_name}' not found!")
            return False
    
    # Check if package.json exists in backend
    if not Path("backend/package.json").exists():
        logger.error("backend/package.json not found!")
        return False
    
    # Check if requirements.txt exists in backend
    if not Path("backend/requirements.txt").exists():
        logger.error("backend/requirements.txt not found!")
        return False
    
    logger.info("Environment check passed!")
    return True

def install_dependencies():
    """Install Python and Node.js dependencies."""
    logger = setup_logging()
    logger.info("Installing dependencies...")
    
    # Install Python dependencies
    logger.info("Installing Python dependencies...")
    result = subprocess.run([sys.executable, "-m", "pip", "install", "-r", "backend/requirements.txt"], 
                          capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to install Python dependencies: {result.stderr}")
        return False
    
    # Install Node.js dependencies
    logger.info("Installing Node.js dependencies...")
    result = subprocess.run(["npm", "install"], cwd="backend", 
                          capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to install Node.js dependencies: {result.stderr}")
        return False
    
    logger.info("Dependencies installed successfully!")
    return True

def start_backend():
    """Start the backend Flask server."""
    logger = setup_logging()
    logger.info("Starting backend server...")
    
    # Set environment variables for development
    env = os.environ.copy()
    env.update({
        'FLASK_ENV': 'development',
        'FLASK_DEBUG': '1',
        'SECRET_KEY': 'dev-secret-key-change-in-production',
        'JWT_SECRET_KEY': 'dev-jwt-secret-change-in-production',
        'DATABASE_URL': 'sqlite:///rai_ops_dev.db',
        'CORS_ORIGINS': 'http://localhost:5173,http://127.0.0.1:5173',
        'LOG_LEVEL': 'DEBUG',
        'MAIL_SUPPRESS_SEND': 'True',  # Don't send emails in development
        'OPENAI_API_KEY': env.get('OPENAI_API_KEY', 'dummy-key-for-development')
    })
    
    # Start backend server
    backend_process = subprocess.Popen(
        [sys.executable, "-m", "backend.app"],
        env=env,
        cwd=".",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for backend to start
    time.sleep(3)
    
    if backend_process.poll() is not None:
        stdout, stderr = backend_process.communicate()
        logger.error(f"Backend failed to start: {stderr}")
        return None
    
    logger.info("Backend server started successfully!")
    return backend_process

def start_frontend():
    """Start the frontend Vite server."""
    logger = setup_logging()
    logger.info("Starting frontend server...")
    
    # Set environment variables for frontend development
    env = os.environ.copy()
    env.update({
        'VITE_API_URL': 'http://localhost:5000',
        'VITE_ENVIRONMENT': 'development'
    })
    
    # Start frontend server
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev"],
        env=env,
        cwd="backend",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for frontend to start
    time.sleep(5)
    
    if frontend_process.poll() is not None:
        stdout, stderr = frontend_process.communicate()
        logger.error(f"Frontend failed to start: {stderr}")
        return None
    
    logger.info("Frontend server started successfully!")
    return frontend_process

def main():
    """Main function to start the development environment."""
    logger = setup_logging()
    logger.info("Starting RAI Ops development environment...")
    
    # Create logs directory
    create_logs_directory()
    
    # Check environment
    if not check_environment():
        logger.error("Environment check failed!")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        logger.error("Failed to install dependencies!")
        sys.exit(1)
    
    # Start services
    backend_process = start_backend()
    if not backend_process:
        logger.error("Failed to start backend server!")
        sys.exit(1)
    
    frontend_process = start_frontend()
    if not frontend_process:
        logger.error("Failed to start frontend server!")
        backend_process.terminate()
        sys.exit(1)
    
    logger.info("Development environment started successfully!")
    logger.info("Backend: http://localhost:5000")
    logger.info("Frontend: http://localhost:5173")
    logger.info("Press Ctrl+C to stop all services...")
    
    try:
        # Keep the script running and monitor processes
        while True:
            time.sleep(1)
            if backend_process.poll() is not None:
                logger.error("Backend server stopped unexpectedly!")
                break
            if frontend_process.poll() is not None:
                logger.error("Frontend server stopped unexpectedly!")
                break
    except KeyboardInterrupt:
        logger.info("Shutting down development environment...")
        backend_process.terminate()
        frontend_process.terminate()
        backend_process.wait()
        frontend_process.wait()
        logger.info("Development environment stopped!")

if __name__ == "__main__":
    main()