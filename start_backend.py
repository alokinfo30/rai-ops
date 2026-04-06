#!/usr/bin/env python
"""
Simple script to start the RAI Ops backend server.
"""
import sys
import os

# Add the current directory to Python path so we can import backend modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend import create_app
from backend.migrations import run_migrations
from backend.startup import on_startup

if __name__ == "__main__":
    app = create_app()
    run_migrations(app)
    on_startup(app)
    print("Starting RAI Ops Backend Server...")
    print("Server running at: http://localhost:5000")
    print("Press Ctrl+C to stop the server")
    app.run(host="0.0.0.0", port=5000, debug=True)