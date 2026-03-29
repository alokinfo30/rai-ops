from flask import Blueprint, jsonify
from models import db
from datetime import datetime
import sys

health_bp = Blueprint('health', __name__)

@health_bp.route('/health')
def health_check():
    try:
        db.session.execute(db.text('SELECT 1'))
        db_status = 'connected'
    except Exception as e:
        print(f"Health check DB error: {e}", file=sys.stderr)
        db_status = f'error: {str(e)}'
    return jsonify({'status': 'healthy', 'database': db_status, 'timestamp': datetime.utcnow().isoformat()}), 200