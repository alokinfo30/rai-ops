import logging
import os
from flask import Flask
from .scheduler import start_scheduler

logger = logging.getLogger(__name__)

def on_startup(app: Flask) -> None:
    """
    Common startup hook to initialize background services.
    Ensures scheduler runs only once (handles debug reloader and production).
    """
    # Check if we are in a reloader environment (Werkzeug)
    # If app.debug is True, WERKZEUG_RUN_MAIN is set in the child process.
    # If app.debug is False, we just run.
    if not app.debug or os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        try:
            start_scheduler(app)
            logger.info("Background scheduler initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize background scheduler: {e}")