from flask import Flask

from config import Config
from .extensions import db
from .routes.api import api_bp
from .routes.web import web_bp


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    app.register_blueprint(web_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    with app.app_context():
        from . import models

        db.create_all()

    return app
