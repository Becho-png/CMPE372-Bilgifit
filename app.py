import os
from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

try:
    import psycopg2
except ImportError:
    psycopg2 = None

DBUniqueViolation = psycopg2.errors.UniqueViolation if psycopg2 else type("DBUniqueViolation", (Exception,), {})

app = Flask(__name__)
CORS(app)

DATABASE_URL = os.environ.get("DATABASE_URL")
DEMO_USERS = {}


def get_db_connection():
    if not DATABASE_URL:
        return None
    if psycopg2 is None:
        raise RuntimeError("psycopg2 is required when DATABASE_URL is configured.")
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
    normalized_email = email.lower()

    if not DATABASE_URL:
        if normalized_email in DEMO_USERS:
            return jsonify({
                "success": False,
                "message": "This email is already registered."
            }), 409

        DEMO_USERS[normalized_email] = {
            "id": len(DEMO_USERS) + 1,
            "fullname": fullname,
            "email": normalized_email,
            "password": hashed_password
        }

        return jsonify({
            "success": True,
            "message": "Account created successfully."
        }), 201

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "INSERT INTO users (fullname, email, password) VALUES (%s, %s, %s)",
            (fullname, normalized_email, hashed_password)
        )

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            "success": True,
            "message": "Account created successfully."
        }), 201

    except DBUniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
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
    normalized_email = email.lower() if email else ""

    if not normalized_email or not password:
        return jsonify({"success": False, "message": "Email and password are required."}), 400

    if not DATABASE_URL:
        user = DEMO_USERS.get(normalized_email)
        if not user:
            return jsonify({"success": False, "message": "User not found."}), 404
        if not check_password_hash(user["password"], password):
            return jsonify({"success": False, "message": "Incorrect password."}), 401
        return jsonify({
            "success": True,
            "message": "Login successful.",
            "user": {
                "id": user["id"],
                "fullname": user["fullname"],
                "email": user["email"]
            }
        }), 200

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT id, fullname, email, password FROM users WHERE email = %s",
            (normalized_email,)
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


@app.route("/api/facilities", methods=["GET"])
def get_facilities():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, facility_name, facility_type, slot_time, capacity, booked
            FROM facility_slots
            ORDER BY id
        """)

        rows = cur.fetchall()

        facilities = []
        for row in rows:
            facilities.append({
                "id": row[0],
                "name": row[1],
                "type": row[2],
                "time": row[3],
                "capacity": row[4],
                "booked": row[5]
            })

        cur.close()
        conn.close()

        return jsonify(facilities), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, session_name, instructor, schedule, participant_count, max_capacity, level
            FROM group_sessions
            ORDER BY id
        """)

        rows = cur.fetchall()

        sessions = []
        for row in rows:
            sessions.append({
                "id": row[0],
                "name": row[1],
                "instructor": row[2],
                "schedule": row[3],
                "count": row[4],
                "max": row[5],
                "level": row[6]
            })

        cur.close()
        conn.close()

        return jsonify(sessions), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/trainers", methods=["GET"])
def get_trainers():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, trainer_name, specialty, rating, session_count, available
            FROM personal_trainers
            ORDER BY id
        """)

        rows = cur.fetchall()

        trainers = []
        for row in rows:
            trainers.append({
                "id": row[0],
                "name": row[1],
                "specialty": row[2],
                "rating": str(row[3]),
                "sessions": row[4],
                "available": row[5]
            })

        cur.close()
        conn.close()

        return jsonify(trainers), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reservations", methods=["GET"])
def get_reservations():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT reservation_title, reservation_date, reservation_time, status
            FROM reservations
            ORDER BY id
        """)

        rows = cur.fetchall()

        reservations = []
        for row in rows:
            reservations.append({
                "facility": row[0],
                "date": row[1],
                "time": row[2],
                "status": row[3]
            })

        cur.close()
        conn.close()

        return jsonify(reservations), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/stats", methods=["GET"])
def get_stats():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT COALESCE(MAX(booked), 0)
            FROM facility_slots
            WHERE facility_type = 'gym'
        """)
        gym_occupied = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM facility_slots
            WHERE facility_type = 'basketball'
            AND booked < capacity
        """)
        open_courts = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*)
            FROM reservations
            WHERE status IN ('Active', 'Pending')
        """)
        bookings_this_week = cur.fetchone()[0]

        cur.close()
        conn.close()

        return jsonify({
            "gymOccupied": gym_occupied,
            "gymCapacity": 10,
            "openCourts": open_courts,
            "bookingsThisWeek": bookings_this_week
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
