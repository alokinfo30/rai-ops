import random
from backend import create_app
from backend.extensions import db
from backend.models import Feedback, User

def generate_feedback():
    """Generates random feedback data for testing purposes."""
    app = create_app()
    with app.app_context():
        users = User.query.all()
        if not users:
            print("No users found. Please run seed.py first.")
            return

        pages = ["/dashboard", "/red-team", "/monitoring", "/knowledge", "/reports", "/settings"]
        messages = [
            "Great tool! Very intuitive.", "Found a bug in the chart rendering.", 
            "UI is a bit slow on mobile.", "Needs more export options.",
            "The dark mode looks amazing.", "How do I configure alerts?", 
            "Confusing navigation structure.", "Love the AI features!", 
            "Can we add more red team models?", "Documentation could be better."
        ]

        feedback_entries = []
        for _ in range(50):
            entry = Feedback(
                user_id=random.choice(users).id,
                message=random.choice(messages),
                page_context=random.choice(pages)
            )
            feedback_entries.append(entry)
        
        db.session.add_all(feedback_entries)
        db.session.commit()
        print(f"Successfully generated {len(feedback_entries)} feedback entries.")

if __name__ == "__main__":
    generate_feedback()