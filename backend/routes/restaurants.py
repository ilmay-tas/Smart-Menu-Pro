from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
import sys
sys.path.append('..')
from models import Restaurant

restaurants_bp = Blueprint('restaurants', __name__)

@restaurants_bp.route('/', methods=['GET'])
def get_restaurants():
    restaurants = Restaurant.query.all()
    return jsonify({
        'restaurants': [r.to_dict() for r in restaurants]
    }), 200

@restaurants_bp.route('/<int:restaurant_id>', methods=['GET'])
@jwt_required()
def get_restaurant(restaurant_id):
    restaurant = Restaurant.query.get(restaurant_id)
    if not restaurant:
        return jsonify({'error': 'Restaurant not found'}), 404
    return jsonify({'restaurant': restaurant.to_dict()}), 200
