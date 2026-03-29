import logging
import threading
from typing import Callable

logger = logging.getLogger(__name__)

def run_background_task(func: Callable, *args, **kwargs) -> None:
    """
    Runs a function in a background thread.
    """
    def wrapper():
        try:
            func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Background task failed: {e}")

    thread = threading.Thread(target=wrapper)
    thread.daemon = True
    thread.start()