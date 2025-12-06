from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sys
sys.path.append('..')
from models import db, MenuItem, User

menu_bp = Blueprint('menu', __name__)

@menu_bp.route('/', methods=['GET'])
@jwt_required()
def get_menu_items():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or not user.restaurant_id:
        return jsonify({'error': 'User not found or not associated with a restaurant'}), 404
    
    items = MenuItem.query.filter_by(restaurant_id=user.restaurant_id).all()
    return jsonify({'menu_items': [item.to_dict() for item in items]}), 200

@menu_bp.route('/', methods=['POST'])
@jwt_required()
def create_menu_item():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can add menu items'}), 403
    
    data = request.get_json()
    
    name = data.get('name')
    price = data.get('price')
    description = data.get('description', '')
    
    if not name or price is None:
        return jsonify({'error': 'Name and price are required'}), 400
    
    item = MenuItem(
        name=name,
        price=float(price),
        description=description,
        restaurant_id=user.restaurant_id
    )
    
    db.session.add(item)
    db.session.commit()
    
    return jsonify({'menu_item': item.to_dict(), 'message': 'Menu item created'}), 201

@menu_bp.route('/<int:item_id>', methods=['PUT'])
@jwt_required()
def update_menu_item(item_id):
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can edit menu items'}), 403
    
    item = MenuItem.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404
    
    if item.restaurant_id != user.restaurant_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    if 'name' in data:
        item.name = data['name']
    if 'price' in data:
        item.price = float(data['price'])
    if 'description' in data:
        item.description = data['description']
    
    db.session.commit()
    
    return jsonify({'menu_item': item.to_dict(), 'message': 'Menu item updated'}), 200

@menu_bp.route('/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_menu_item(item_id):
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can delete menu items'}), 403
    
    item = MenuItem.query.get(item_id)
    
    if not item:
        return jsonify({'error': 'Menu item not found'}), 404
    
    if item.restaurant_id != user.restaurant_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Menu item deleted'}), 200
