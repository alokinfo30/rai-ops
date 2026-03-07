from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
import os
import sys
import random
from models import db, User, AITest, ComplianceLog, ModelDrift, Alert, ExpertSession
from config import Config

def create_app(config_class=Config):
    # Determine static folder path (robust for different execution contexts)
    basedir = os.path.abspath(os.path.dirname(__file__))
    static_folder = os.path.join(basedir, '../frontend')

    if not os.path.exists(static_folder):
        print(f"WARNING: Static folder not found at {static_folder}. Frontend may not be served correctly.", file=sys.stderr)

    app = Flask(__name__, static_folder=static_folder)
    app.config.from_object(config_class)

    # Initialize extensions
    CORS(app)
    JWTManager(app)
    db.init_app(app)

    # Register Blueprints / Routes
    register_routes(app)

    # Register CLI commands
    @app.cli.command("init-db")
    def init_db_command():
        """Creates the database tables."""
        with app.app_context():
            db.create_all()
        print("Initialized the database.")

    return app

def register_routes(app):
    # Health Check Endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()}), 200

    # Serve frontend
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')

    # Authentication routes
    @app.route('/api/auth/register', methods=['POST'])
    def register():
        data = request.json
        
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        user = User(
            username=data['username'],
            email=data['email'],
            company=data.get('company', '')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({'message': 'User created successfully', 'user': user.to_dict()}), 201

    @app.route('/api/auth/login', methods=['POST'])
    def login():
        data = request.json
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            access_token = create_access_token(identity=user.id)
            return jsonify({
                'access_token': access_token,
                'user': user.to_dict()
            })
        
        return jsonify({'error': 'Invalid credentials'}), 401

    # Dashboard routes
    @app.route('/api/dashboard/stats', methods=['GET'])
    @jwt_required()
    def get_dashboard_stats():
        try:
            security_tests_count = db.session.query(AITest).count()
            active_alerts_count = db.session.query(Alert).filter_by(resolved=False).count()
            models_monitored_count = db.session.query(ModelDrift.model_name).distinct().count()
            
            # Compliance score is complex, simulate for now as a percentage
            compliance_score = 85
            
            return jsonify({
                'securityTests': security_tests_count,
                'activeAlerts': active_alerts_count,
                'modelsMonitored': models_monitored_count,
                'complianceScore': compliance_score
            })
        except Exception as e:
            print(f"Error fetching dashboard stats: {e}", file=sys.stderr)
            return jsonify({'error': 'Could not fetch dashboard statistics'}), 500

    @app.route('/api/dashboard/recent-activity', methods=['GET'])
    @jwt_required()
    def get_recent_activity():
        try:
            # The view is already ordered by date, limit to 10 for the dashboard
            result = db.session.execute(db.text("SELECT * FROM recent_activity LIMIT 10"))
            activities = [dict(row._mapping) for row in result]
            
            # Serialize datetime objects
            for activity in activities:
                if 'created_at' in activity and activity['created_at']:
                    activity['created_at'] = activity['created_at'].isoformat()

            return jsonify(activities)
        except Exception as e:
            print(f"Error fetching recent activity: {e}", file=sys.stderr)
            # Handle case where view doesn't exist or other DB errors
            return jsonify({'error': 'Could not fetch recent activity'}), 500

    # Red Teaming routes
    @app.route('/api/redteam/test', methods=['POST'])
    @jwt_required()
    def create_redteam_test():
        user_id = get_jwt_identity()
        data = request.json
        
        test = AITest(
            user_id=user_id,
            test_name=data['test_name'],
            test_type=data['test_type'],
            target_system=data['target_system'],
            status='pending'
        )
        
        db.session.add(test)
        db.session.commit()
        
        # Log compliance
        log = ComplianceLog(
            user_id=user_id,
            action='CREATE_TEST',
            resource=f'test/{test.id}',
            status='SUCCESS',
            details={'test_type': data['test_type']},
            ip_address=request.remote_addr
        )
        db.session.add(log)
        db.session.commit()
        
        return jsonify({'message': 'Test created', 'test': test.to_dict()}), 201

    @app.route('/api/redteam/test/<int:test_id>/run', methods=['POST'])
    @jwt_required()
    def run_redteam_test(test_id):
        user_id = get_jwt_identity()
        test = AITest.query.filter_by(id=test_id, user_id=user_id).first()
        
        if not test:
            return jsonify({'error': 'Test not found'}), 404
        
        test.status = 'running'
        db.session.commit()
        
        # Simulate AI red teaming
        results = simulate_redteam_attack(test.test_type)
        
        test.status = 'completed'
        test.results = results
        test.completed_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({'message': 'Test completed', 'results': results})

    @app.route('/api/redteam/tests', methods=['GET'])
    @jwt_required()
    def get_recent_redteam_tests():
        user_id = get_jwt_identity()
        # Return the 10 most recent tests for the current user
        tests = AITest.query.filter_by(user_id=user_id).order_by(AITest.created_at.desc()).limit(10).all()
        return jsonify([test.to_dict() for test in tests])

    def simulate_redteam_attack(test_type):
        """Simulate different types of AI red teaming attacks"""
        
        if test_type == 'deepfake':
            return {
                'attack_type': 'Deepfake Detection Test',
                'tests_conducted': 100,
                'successful_bypasses': random.randint(5, 30),
                'vulnerabilities_found': [
                    {
                        'severity': 'high',
                        'description': 'Model fails to detect synthetic facial movements',
                        'recommendation': 'Implement temporal consistency checks'
                    },
                    {
                        'severity': 'medium', 
                        'description': 'Poor performance on low-light conditions',
                        'recommendation': 'Enhance training data diversity'
                    }
                ],
                'overall_score': random.uniform(0.5, 0.95),
                'risk_level': random.choice(['low', 'medium', 'high'])
            }
        
        elif test_type == 'adversarial':
            return {
                'attack_type': 'Adversarial Prompt Injection',
                'tests_conducted': 150,
                'successful_injections': random.randint(10, 50),
                'vulnerabilities_found': [
                    {
                        'severity': 'critical',
                        'description': 'Prompt injection bypasses content filters',
                        'recommendation': 'Implement input sanitization and prompt validation'
                    },
                    {
                        'severity': 'high',
                        'description': 'Jailbreak techniques successful on 15% of attempts',
                        'recommendation': 'Update safety training data'
                    }
                ],
                'overall_score': random.uniform(0.4, 0.9),
                'risk_level': random.choice(['low', 'medium', 'high', 'critical'])
            }
        
        else:  # synthetic
            return {
                'attack_type': 'Synthetic Identity Fraud Test',
                'tests_conducted': 200,
                'successful_frauds': random.randint(3, 25),
                'vulnerabilities_found': [
                    {
                        'severity': 'high',
                        'description': 'Synthetic identities bypass KYC checks',
                        'recommendation': 'Implement behavioral biometrics'
                    },
                    {
                        'severity': 'medium',
                        'description': 'Document forgery detection fails on 8% of tests',
                        'recommendation': 'Update document verification models'
                    }
                ],
                'overall_score': random.uniform(0.6, 0.98),
                'risk_level': random.choice(['low', 'medium', 'high'])
            }

    # Continuous Monitoring routes
    @app.route('/api/monitoring/drift', methods=['GET'])
    @jwt_required()
    def get_model_drift():
        # NOTE: In a production environment, this data generation should be handled
        # by a separate, scheduled background task (e.g., using Celery).
        # This endpoint is modified for demonstration purposes to simulate
        # periodic monitoring checks and persist the results.
        models = ['Fraud Detection v2', 'Content Filter v3', 'Biometric Auth v1', 'KYC Classifier']
        metrics = ['accuracy', 'precision', 'recall', 'f1_score']
        
        for model in models:
            for metric in metrics:
                # Find the original baseline for this model/metric
                baseline_entry = ModelDrift.query.filter_by(model_name=model, metric_name=metric).order_by(ModelDrift.created_at.asc()).first()
                
                if baseline_entry:
                    baseline = baseline_entry.baseline_value
                else:
                    # Create a new baseline if none exists
                    baseline = random.uniform(0.85, 0.98)

                # Simulate a new current value, ensuring it doesn't exceed 1.0
                current = min(baseline * random.uniform(0.85, 1.02), 1.0)
                drift = abs(current - baseline) / baseline if baseline > 0 else 0
                
                # Persist the new drift record
                drift_entry = ModelDrift(
                    model_name=model,
                    metric_name=metric,
                    baseline_value=baseline,
                    current_value=current,
                    drift_score=drift,
                    alert_threshold=0.1
                )
                db.session.add(drift_entry)

                # If drift is significant, create an alert
                if drift > 0.1:
                    alert_message = f'Model drift detected in {model} ({metric}): {drift:.2%} drift from baseline.'
                    # Avoid creating duplicate, unresolved alerts
                    existing_alert = Alert.query.filter_by(message=alert_message, resolved=False).first()
                    if not existing_alert:
                        alert = Alert(
                            severity='high' if drift > 0.15 else 'medium',
                            message=alert_message,
                        )
                        db.session.add(alert)

        db.session.commit()
        
        # Return the most recent drift records
        drift_data = ModelDrift.query.order_by(ModelDrift.created_at.desc()).limit(50).all()
        return jsonify([d.to_dict() for d in drift_data])

    @app.route('/api/monitoring/compliance-logs', methods=['GET'])
    @jwt_required()
    def get_compliance_logs():
        logs = ComplianceLog.query.order_by(ComplianceLog.timestamp.desc()).limit(100).all()
        return jsonify([log.to_dict() for log in logs])

    @app.route('/api/monitoring/alerts', methods=['GET'])
    @jwt_required()
    def get_alerts():
        alerts = Alert.query.order_by(Alert.timestamp.desc()).all()
        return jsonify([alert.to_dict() for alert in alerts])

    @app.route('/api/monitoring/alerts/<int:alert_id>/resolve', methods=['POST'])
    @jwt_required()
    def resolve_alert(alert_id):
        alert = Alert.query.get(alert_id)
        if not alert:
            return jsonify({'error': 'Alert not found'}), 404
        
        alert.resolved = True
        db.session.commit()
        
        return jsonify({'message': 'Alert resolved', 'alert': alert.to_dict()})

    # Knowledge Transfer routes
    @app.route('/api/knowledge/expert/session', methods=['POST'])
    @jwt_required()
    def create_expert_session():
        user_id = get_jwt_identity()
        data = request.json
        # Simulate expert interview and knowledge extraction
        
        knowledge_graph = {
            'expert_name': data.get('expert_name', 'Unknown'),
            'domain': data.get('domain', 'General'),
            'key_insights': [
                'Critical decision patterns identified',
                'Risk mitigation strategies documented',
                'Common pitfalls and solutions mapped'
            ],
            'decision_trees': [
                {
                    'scenario': 'Unusual transaction pattern',
                    'decision_path': ['check_amount', 'verify_location', 'review_history', 'flag_risk'],
                    'expert_override': 'Manual review required if amount > $10,000'
                }
            ]
        }
        
        session = ExpertSession(
            user_id=user_id,
            expert_name=data.get('expert_name', 'Unknown'),
            domain=data.get('domain', 'General'),
            knowledge_graph=knowledge_graph
        )
        db.session.add(session)
        db.session.commit()
        
        return jsonify({
            'message': 'Expert session created',
            'session': session.to_dict()
        }), 201

    @app.route('/api/knowledge/virtual-apprentice/<int:session_id>', methods=['GET'])
    @jwt_required()
    def get_virtual_apprentice(session_id):
        session = ExpertSession.query.get(session_id)
        
        if not session:
            return jsonify({'error': 'Expert session not found'}), 404
            
        # Generate virtual apprentice based on knowledge graph from the session
        apprentice = {
            'session_id': session.id,
            'based_on_expert': session.expert_name,
            'domain': session.domain,
            'capabilities': [
                'Can explain complex decision processes from the knowledge graph',
                'Provides step-by-step guidance based on decision trees',
                'Simulates expert reasoning',
                'Offers alternative solutions'
            ],
            'current_questions': [
                {
                    'question': 'How would you handle a transaction flagged for potential fraud?',
                    'hint': 'Consider the decision trees in the knowledge graph',
                    'expert_answer': 'First verify identity, then check transaction patterns, finally assess risk score'
                }
            ],
            'source_graph': session.knowledge_graph
        }
        return jsonify(apprentice)

if __name__ == '__main__':
    app = create_app()
    app.run(host='0.0.0.0', port=5000, debug=True)