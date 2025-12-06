import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from models import db

load_dotenv()

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JWT_SECRET_KEY'] = os.environ.get('SESSION_SECRET', 'dev-secret-key')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours

CORS(app, supports_credentials=True, origins=["*"])

db.init_app(app)
jwt = JWTManager(app)

@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({'error': 'Invalid token', 'message': str(error)}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({'error': 'Missing Authorization Header', 'message': str(error)}), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired'}), 401

from routes.auth import auth_bp
from routes.restaurants import restaurants_bp
from routes.menu import menu_bp
from routes.staff import staff_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(restaurants_bp, url_prefix='/api/restaurants')
app.register_blueprint(menu_bp, url_prefix='/api/menu')
app.register_blueprint(staff_bp, url_prefix='/api/staff')

@app.route('/api/health')
def health():
    return jsonify({'status': 'healthy'})

with app.app_context():
    db.create_all()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True, use_reloader=False)
