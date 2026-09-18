from flask import Blueprint, current_app, render_template


web_bp = Blueprint("web", __name__)


@web_bp.get("/")
def index():
    return render_template("index.html", google_client_id=current_app.config["GOOGLE_CLIENT_ID"])
