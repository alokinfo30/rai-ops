from flask import Blueprint, jsonify, Response
from sqlalchemy import text
from .extensions import db

health_bp = Blueprint("health", __name__, url_prefix="/health")

@health_bp.route("", methods=["GET"])
def health_check() -> tuple[Response, int]:
    """
    Health check endpoint for container orchestration probes.
    """
    health_status = {"status": "ok", "database": "unknown"}
    
    try:
        db.session.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["status"] = "degraded"
        health_status["database"] = str(e)
        return jsonify(health_status), 503

    return jsonify(health_status), 200