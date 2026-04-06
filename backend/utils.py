import hashlib
from datetime import datetime

def get_deterministic_score(seed_str: str, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """Generates a deterministic float between min_val and max_val based on a seed string."""
    if not seed_str:
        seed_str = str(datetime.utcnow())
    hash_obj = hashlib.md5(seed_str.encode())
    # Use first 8 chars of hash to create an integer
    hash_int = int(hash_obj.hexdigest()[:8], 16)
    # Normalize to 0-1 range
    normalized = hash_int / 0xFFFFFFFF
    return min_val + (normalized * (max_val - min_val))


def get_deterministic_int(seed_str: str, min_val: int, max_val: int) -> int:
    """Generates a deterministic integer based on a seed string."""
    return int(get_deterministic_score(seed_str, min_val, max_val))