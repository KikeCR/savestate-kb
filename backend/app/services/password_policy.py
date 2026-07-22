from app.constants import MIN_PASSWORD_LENGTH, PASSWORD_POLICY_HINT


def validate_password(password):
    """Returns None if the password satisfies the policy, otherwise a single
    error string describing what's missing."""
    has_upper = any(c.isupper() for c in password)
    has_special = any(not c.isalnum() for c in password)

    if len(password) < MIN_PASSWORD_LENGTH or not has_upper or not has_special:
        return f"password must contain {PASSWORD_POLICY_HINT}"
    return None
