from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, ExpertSession
from services import generate_expert_knowledge_graph, generate_virtual_apprentice_data

knowledge_bp = Blueprint('knowledge', __name__, url_prefix='/api/knowledge')

@knowledge_bp.route('/expert/session', methods=['POST'])
@jwt_required()
def create_expert_session():
    user_id = get_jwt_identity()
    data = request.json
    knowledge_graph = generate_expert_knowledge_graph(data.get('expert_name', 'Unknown'), data.get('domain', 'General'))
    
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

@knowledge_bp.route('/virtual-apprentice/<int:session_id>', methods=['GET'])
@jwt_required()
def get_virtual_apprentice(session_id):
    session = ExpertSession.query.get(session_id)
    
    if not session:
        return jsonify({'error': 'Expert session not found'}), 404
        
    apprentice = generate_virtual_apprentice_data(session)
    return jsonify(apprentice)