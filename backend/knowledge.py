from datetime import datetime

from backend.extensions import db


class ExpertSession(db.Model):
    __tablename__ = "expert_sessions"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    expert_name = db.Column(db.String(200))
    domain = db.Column(db.String(200))
    experience = db.Column(db.Integer)
    knowledge_graph = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "expert_name": self.expert_name,
            "domain": self.domain,
            "experience": self.experience,
            "knowledge_graph": self.knowledge_graph,
            "created_at": self.created_at.isoformat(),
        }