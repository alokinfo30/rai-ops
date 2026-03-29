from flask import Blueprint, jsonify, request, Response
from flask_jwt_extended import get_jwt_identity, jwt_required

from .extensions import db
from .models import ExpertSession
from .knowledge_service import generate_expert_knowledge_graph, generate_virtual_apprentice_data

knowledge_bp = Blueprint("knowledge", __name__, url_prefix="/api/knowledge")

# Mock data for the prototype
POLICIES = [
    {"id": 1, "title": "AI Ethics Guidelines", "category": "General", "updated": "2023-10-01", "content": "All models must adhere to..."},
    {"id": 2, "title": "LLM Deployment Standard", "category": "Technical", "updated": "2023-11-15", "content": "Before deployment, check..."},
    {"id": 3, "title": "Data Privacy Mandate", "category": "Legal", "updated": "2023-09-20", "content": "PII scrubbing is required..."},
]

@knowledge_bp.route("/policies", methods=["GET"])
@jwt_required()
def get_policies() -> Response:
    return jsonify(POLICIES)

@knowledge_bp.route("/search", methods=["POST"])
@jwt_required()
def search_knowledge() -> tuple[Response, int]:
    data = request.json or {}
    query = data.get("query", "").lower()
    
    results = [
        p for p in POLICIES 
        if query in p["title"].lower() or query in p["category"].lower() or query in p["content"].lower()
    ]
    
    return jsonify(results), 200

@knowledge_bp.route("/expert/session", methods=["POST"])
@jwt_required()
def create_expert_session() -> tuple[Response, int]:
    """
    Starts an expert session to capture knowledge.
    """
    user_id = get_jwt_identity()
    data = request.json or {}
    
    expert_name = data.get("expert_name")
    domain = data.get("domain")
    experience = data.get("experience", 0)
    
    if not expert_name or not domain:
        return jsonify({"error": "Missing expert_name or domain"}), 400
        
    # Generate knowledge graph (using LLM or fallback simulation)
    kg_data = generate_expert_knowledge_graph(expert_name, domain, experience)
    
    session = ExpertSession(
        user_id=user_id,
        expert_name=expert_name,
        domain=domain,
        experience=experience,
        knowledge_graph=kg_data
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({"message": "Session created", "session": session.to_dict()}), 201

@knowledge_bp.route("/virtual-apprentice/<int:session_id>", methods=["GET"])
@jwt_required()
def get_virtual_apprentice(session_id: int) -> tuple[Response, int]:
    """
    Generates a virtual apprentice interface based on a captured expert session.
    """
    user_id = get_jwt_identity()
    session = ExpertSession.query.filter_by(id=session_id, user_id=user_id).first()
    
    if not session:
        return jsonify({"error": "Session not found"}), 404
        
    apprentice_data = generate_virtual_apprentice_data(session)
    return jsonify(apprentice_data), 200

@knowledge_bp.route("/graph", methods=["GET"])
@jwt_required()
def get_knowledge_graph() -> Response:
    """
    Returns nodes and links for the knowledge graph visualization.
    """
    user_id = get_jwt_identity()
    sessions = ExpertSession.query.filter_by(user_id=user_id).all()
    
    nodes = []
    links = []
    domain_map = {} # Track domain IDs to avoid duplicates
    
    # Add Domain Nodes
    for session in sessions:
        if session.domain not in domain_map:
            d_id = f"d_{len(domain_map)}"
            domain_map[session.domain] = d_id
            nodes.append({"id": d_id, "name": session.domain, "type": "domain", "val": 12})
        
        d_id = domain_map[session.domain]
        expert_id = f"e_{session.id}"
        
        nodes.append({
            "id": expert_id, 
            "name": session.expert_name, 
            "type": "expert", 
            "val": 4 + (session.experience / 5) # Scale node size by experience
        })
        links.append({"source": d_id, "target": expert_id})
            
    return jsonify({"nodes": nodes, "links": links})