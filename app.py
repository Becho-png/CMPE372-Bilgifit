import os
import psycopg2
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html")

@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")

    if not fullname or not email or not password:
        return jsonify({
            "success": False,
            "message": "All fields are required."
        }), 400

    allowed_domains = (
        "@bilgi.edu.tr",
        "@bilgiedu.net"
    )

    if not email.lower().endswith(allowed_domains):
        return jsonify({
            "success": False,
            "message": "Only @bilgi.edu.tr or @bilgiedu.net emails are accepted."
        }), 400

    hashed_password = generate_password_hash(password)

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "INSERT INTO users (fullname, email, password) VALUES (%s, %s, %s)",
            (fullname, email, hashed_password)
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Account created successfully."
        }), 201

    except psycopg2.errors.UniqueViolation:
        return jsonify({
            "success": False,
            "message": "This email is already registered."
        }), 409

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id, fullname, email, password FROM users WHERE email = %s",
            (email,)
        )

        user = cur.fetchone()

        cur.close()
        conn.close()

        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404

        user_id, fullname, user_email, hashed_password = user

        if not check_password_hash(hashed_password, password):
            return jsonify({"success": False, "message": "Incorrect password."}), 401

        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {
                "id": user_id,
                "fullname": fullname,
                "email": user_email
            }
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
