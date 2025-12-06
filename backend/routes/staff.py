from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import sys
sys.path.append('..')
from models import db, User

staff_bp = Blueprint('staff', __name__)

@staff_bp.route('/', methods=['GET'])
@jwt_required()
def get_staff():
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can view staff'}), 403
    
    staff = User.query.filter(
        User.restaurant_id == user.restaurant_id,
        User.role.in_(['waiter', 'kitchen'])
    ).all()
    
    return jsonify({'staff': [s.to_dict() for s in staff]}), 200

@staff_bp.route('/<int:staff_id>/approve', methods=['POST'])
@jwt_required()
def approve_staff(staff_id):
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can approve staff'}), 403
    
    staff_member = User.query.get(staff_id)
    
    if not staff_member:
        return jsonify({'error': 'Staff member not found'}), 404
    
    if staff_member.restaurant_id != user.restaurant_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    staff_member.is_approved = True
    db.session.commit()
    
    return jsonify({
        'message': 'Staff member approved',
        'staff': staff_member.to_dict()
    }), 200

@staff_bp.route('/<int:staff_id>/revoke', methods=['POST'])
@jwt_required()
def revoke_staff(staff_id):
    identity = get_jwt_identity()
    user = User.query.get(identity['id'])
    
    if not user or user.role != 'owner':
        return jsonify({'error': 'Only owners can revoke staff access'}), 403
    
    staff_member = User.query.get(staff_id)
    
    if not staff_member:
        return jsonify({'error': 'Staff member not found'}), 404
    
    if staff_member.restaurant_id != user.restaurant_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    staff_member.is_approved = False
    db.session.commit()
    
    return jsonify({
        'message': 'Staff access revoked',
        'staff': staff_member.to_dict()
    }), 200
