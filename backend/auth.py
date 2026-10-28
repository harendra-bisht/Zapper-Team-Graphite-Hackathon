"""
Authentication & Authorization Module
======================================
Handles password hashing, JWT encoding/decoding, and role-based route protection.
"""

import os
import jwt
from datetime import datetime, timezone, timedelta
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
import database as db

SECRET_KEY = os.getenv('SECRET_KEY', 'spams-jwt-secret-key-btech-2026')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24


def hash_password(password: str) -> str:
    """Hashes a plaintext password using Werkzeug scrypt."""
    return generate_password_hash(password)


def verify_password(password: str, hashed: str) -> bool:
    """Verifies a plaintext password against stored hash."""
    return check_password_hash(hashed, password)


def generate_token(user_id: int, username: str, role: str) -> str:
    """Generates a signed JWT access token."""
    payload = {
        'sub': str(user_id),
        'username': username,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str):
    """Decodes and validates a JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception as e:
        return None


def get_current_user_from_request():
    """Extracts user information from the Authorization header."""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    token = auth_header.split(' ', 1)[1]
    payload = decode_token(token)
    if not payload or not payload.get('sub'):
        return None
    
    user_id = int(payload['sub'])
    user = db.query_one("""
        SELECT u.id, u.username, u.email, u.role, u.full_name, u.phone, u.department, u.status,
               s.id AS student_id, s.roll_number, s.course_id, s.current_semester_id,
               fp.id AS faculty_id, fp.employee_id, fp.designation
        FROM users u
        LEFT JOIN students s ON u.id = s.user_id
        LEFT JOIN faculty_profiles fp ON u.id = fp.user_id
        WHERE u.id = %s
    """, (user_id,))
    return user


def token_required(f):
    """Decorator requiring a valid JWT token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        current_user = get_current_user_from_request()
        if not current_user:
            return jsonify({'error': 'Unauthorized. Missing or invalid authentication token.'}), 401
        if current_user.get('status') != 'active':
            return jsonify({'error': 'Account is inactive. Contact the administrator.'}), 403
        return f(current_user, *args, **kwargs)
    return decorated


def role_required(allowed_roles):
    """Decorator restricting route access to specific roles. Use beneath @token_required."""
    def decorator(f):
        @wraps(f)
        def decorated(current_user, *args, **kwargs):
            if not current_user:
                return jsonify({'error': 'Unauthorized. Authentication required.'}), 401
            if current_user.get('role') not in allowed_roles:
                return jsonify({
                    'error': f"Access denied. Requires one of roles: {', '.join(allowed_roles)}. Your role: '{current_user.get('role')}'"
                }), 403
            return f(current_user, *args, **kwargs)
        return decorated
    return decorator
