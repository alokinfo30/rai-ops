import json
import logging
import os

logger = logging.getLogger(__name__)

# Initialize OpenAI client if the API key is available
try:
    import openai

    # The openai library looks for the OPENAI_API_KEY environment variable by default.
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        client = openai.OpenAI()
    else:
        client = None
        logger.warning(
            "OPENAI_API_KEY not set. Knowledge graph generation will be simulated."
        )
except ImportError:
    client = None
    logger.warning(
        "'openai' library not installed. Knowledge graph generation will be simulated."
    )
except Exception as e:
    client = None
    logger.warning(f"OpenAI could not be configured ({e}). Logic will be simulated.")


def generate_expert_knowledge_graph(expert_name: str, domain: str, experience: int = 0) -> dict:
    """Simulate generating a knowledge graph from an expert session"""
    domain_lower = domain.lower()

    # Try to use OpenAI if available for a real graph
    if client:
        try:
            prompt = (
                f"Generate a structured knowledge graph for an expert in {domain} named"
                f" {expert_name} with {experience} years of experience. Return JSON with"
                " 'key_insights' (list of strings) and 'decision_trees' (list of"
                " objects with 'scenario', 'decision_path' (list of steps), and"
                " 'expert_override')."
            )
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a knowledge engineer extracting expert rules. Output valid JSON.",  # noqa: E501
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                response_format={"type": "json_object"},
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            return {
                "expert_name": expert_name,
                "domain": domain,
                "key_insights": data.get("key_insights", []),
                "decision_trees": data.get("decision_trees", []),
            }
        except Exception as e:
            logger.error(f"OpenAI KG generation failed: {e}. Falling back to deterministic logic.")
            # Fall through to deterministic logic
    
    # Dynamic generation based on domain keywords
    insights = [
        f"Critical decision patterns identified in {domain}",
        "Risk mitigation strategies documented",
        "Common pitfalls and solutions mapped",
    ]

    if experience > 10:
        insights.append("Advanced edge cases and their resolutions documented")

    decision_tree = {
        "scenario": "Standard Procedure",
        "decision_path": ["initial_check", "validate_input", "assess_risk", "finalize"],
        "expert_override": "Manual review if confidence score < 0.85",
    }

    if "fraud" in domain_lower or "security" in domain_lower:
        insights.append("Anomalous behavior patterns flagged for review")
        decision_tree = {
            "scenario": "Suspicious Activity Detected",
            "decision_path": [
                "verify_ip_geo",
                "check_device_fingerprint",
                "analyze_velocity",
                "block_or_challenge",
            ],
            "expert_override": "Immediate block if entity appears on sanctions list",
        }
    elif "loan" in domain_lower or "credit" in domain_lower:
        insights.append("Credit utilization trends identified as key indicator")
        decision_tree = {
            "scenario": "High-Value Application",
            "decision_path": [
                "check_credit_score",
                "verify_income_source",
                "calculate_dti",
                "approve_conditional",
            ],
            "expert_override": "Require secondary approval for amounts > $50k",
        }
    elif "support" in domain_lower or "service" in domain_lower:
        insights.append("Sentiment analysis thresholds calibrated")
        decision_tree = {
            "scenario": "Angry Customer Escalation",
            "decision_path": [
                "detect_sentiment",
                "classify_issue",
                "assign_priority_queue",
                "connect_agent",
            ],
            "expert_override": "Offer compensation voucher if wait time > 5 mins",
        }

    return {
        "expert_name": expert_name,
        "domain": domain,
        "key_insights": insights,
        "decision_trees": [decision_tree],
    }

def generate_virtual_apprentice_data(session) -> dict:
    """Generate virtual apprentice capabilities based on session"""

    # Create context-aware question based on the first decision tree
    decision_trees = session.knowledge_graph.get("decision_trees", [])
    if not decision_trees:
        return {"error": "Knowledge graph contains no decision trees"}
        
    dt = decision_trees[0]
    scenario = dt.get("scenario", "Complex Scenario")
    decision_path = dt.get("decision_path", [])

    # Generate dynamic answer based on the actual decision path in the graph
    steps_str = ", then ".join([s.replace("_", " ") for s in decision_path])
    if not steps_str:
        steps_str = "assess the situation carefully"
    expert_answer = f"According to the protocol for {scenario}, I would first {steps_str}."

    return {
        "session_id": session.id,
        "based_on_expert": session.expert_name,
        "domain": session.domain,
        "capabilities": [
            f"Can explain decision processes for {session.domain}",
            f"Provides guidance on {scenario}",
            f"Simulates {session.expert_name}'s reasoning style",
            "Flags edge cases requiring manual intervention",
        ],
        "current_questions": [
            {
                "question": f'How would you handle the "{scenario}" scenario?',
                "hint": "Consider the decision trees in the knowledge graph",
                "expert_answer": expert_answer,
            }
        ],
        "source_graph": session.knowledge_graph,
    }