from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
import bcrypt
import sys
sys.path.append('..')
from models import db, User, Restaurant

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/signup', methods=['POST'])
def signup():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    role = data.get('role')
    restaurant_id = data.get('restaurant_id')
    restaurant_name = data.get('restaurant_name')
    restaurant_address = data.get('restaurant_address')
    
    if not username or not password or not role:
        return jsonify({'error': 'Username, password, and role are required'}), 400
    
    if role not in ['owner', 'waiter', 'kitchen']:
        return jsonify({'error': 'Invalid role'}), 400
    
    existing_user = User.query.filter_by(username=username).first()
    if existing_user:
        return jsonify({'error': 'Username already exists'}), 400
    
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if role == 'owner':
        if not restaurant_name or not restaurant_address:
            return jsonify({'error': 'Restaurant name and address are required for owners'}), 400
        
        restaurant = Restaurant(
            name=restaurant_name,
            address=restaurant_address,
            details=data.get('restaurant_details', '')
        )
        db.session.add(restaurant)
        db.session.flush()
        
        user = User(
            username=username,
            password_hash=password_hash,
            role=role,
            is_approved=True,
            restaurant_id=restaurant.id
        )
    else:
        if not restaurant_id:
            return jsonify({'error': 'Restaurant selection is required for staff'}), 400
        
        restaurant = Restaurant.query.get(restaurant_id)
        if not restaurant:
            return jsonify({'error': 'Restaurant not found'}), 404
        
        user = User(
            username=username,
            password_hash=password_hash,
            role=role,
            is_approved=False,
            restaurant_id=restaurant_id
        )
    
    db.session.add(user)
    db.session.commit()
    
    if role == 'owner':
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'message': 'Owner account created successfully',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201
    else:
        return jsonify({
            'message': 'Account created. Waiting for owner approval.',
            'user': user.to_dict()
        }), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_approved:
        return jsonify({
            'error': 'Your account is pending approval',
            'pending': True
        }), 403
    
    access_token = create_access_token(identity=str(user.id))
    
    return jsonify({
        'message': 'Login successful',
        'user': user.to_dict(),
        'access_token': access_token
    }), 200

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200
