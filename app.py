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
        return jsonify({"success": False, "message": "All fields are required."}), 400

    allowed_domains = ("@bilgi.edu.tr", "@bilgiedu.net")

    if not email.lower().endswith(allowed_domains):
        return jsonify({
            "success": False,
            "message": "Only @bilgi.edu.tr or @bilgiedu.net emails are accepted."
        }), 400

    hashed_password = generate_password_hash(password)
    normalized_email = email.lower()

    if not DATABASE_URL:
        if normalized_email in DEMO_USERS:
            return jsonify({"success": False, "message": "This email is already registered."}), 409

        DEMO_USERS[normalized_email] = {
            "id": len(DEMO_USERS) + 1,
            "fullname": fullname,
            "email": normalized_email,
            "password": hashed_password
        }

        return jsonify({"success": True, "message": "Account created successfully."}), 201

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

        return jsonify({"success": True, "message": "Account created successfully."}), 201

    except DBUniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"success": False, "message": "This email is already registered."}), 409

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


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
        user_id = request.args.get("user_id")

        conn = get_db_connection()
        cur = conn.cursor()

        if user_id:
            cur.execute("""
                SELECT id, reservation_title, reservation_date, reservation_time, status
                FROM reservations
                WHERE user_id = %s
                ORDER BY id DESC
            """, (user_id,))
        else:
            cur.execute("""
                SELECT id, reservation_title, reservation_date, reservation_time, status
                FROM reservations
                ORDER BY id DESC
            """)

        rows = cur.fetchall()

        reservations = []
        for row in rows:
            reservations.append({
                "id": row[0],
                "facility": row[1],
                "date": row[2],
                "time": row[3],
                "status": row[4]
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


@app.route("/api/reserve-facility", methods=["POST"])
def reserve_facility():
    data = request.get_json()

    user_id = data.get("user_id")
    facility_id = data.get("facility_id")

    if not user_id or not facility_id:
        return jsonify({"success": False, "message": "user_id and facility_id are required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, facility_name, slot_time, capacity, booked
            FROM facility_slots
            WHERE id = %s
        """, (facility_id,))

        facility = cur.fetchone()

        if not facility:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Facility slot not found."}), 404

        slot_id, facility_name, slot_time, capacity, booked = facility

        if booked >= capacity:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "This facility slot is full."}), 400

        cur.execute("""
            UPDATE facility_slots
            SET booked = booked + 1
            WHERE id = %s
        """, (slot_id,))

        cur.execute("""
            INSERT INTO reservations (user_id, reservation_title, reservation_date, reservation_time, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, facility_name, "Today", slot_time, "Active"))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Facility reservation confirmed."}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/join-session", methods=["POST"])
def join_session_api():
    data = request.get_json()

    user_id = data.get("user_id")
    session_id = data.get("session_id")

    if not user_id or not session_id:
        return jsonify({"success": False, "message": "user_id and session_id are required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, session_name, schedule, participant_count, max_capacity
            FROM group_sessions
            WHERE id = %s
        """, (session_id,))

        session = cur.fetchone()

        if not session:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Session not found."}), 404

        sid, session_name, schedule, participant_count, max_capacity = session

        if participant_count >= max_capacity:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "This session is full."}), 400

        cur.execute("""
            INSERT INTO session_participants (user_id, session_id)
            VALUES (%s, %s)
        """, (user_id, sid))

        cur.execute("""
            UPDATE group_sessions
            SET participant_count = participant_count + 1
            WHERE id = %s
        """, (sid,))

        cur.execute("""
            INSERT INTO reservations (user_id, reservation_title, reservation_date, reservation_time, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, session_name, "This week", schedule, "Active"))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Group session joined."}), 201

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"success": False, "message": "You already joined this session."}), 409

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/book-trainer", methods=["POST"])
def book_trainer_api():
    data = request.get_json()

    user_id = data.get("user_id")
    trainer_id = data.get("trainer_id")

    if not user_id or not trainer_id:
        return jsonify({"success": False, "message": "user_id and trainer_id are required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, trainer_name, available
            FROM personal_trainers
            WHERE id = %s
        """, (trainer_id,))

        trainer = cur.fetchone()

        if not trainer:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Trainer not found."}), 404

        tid, trainer_name, available = trainer

        if not available:
            cur.close()
            conn.close()
            return jsonify({"success": False, "message": "Trainer is unavailable."}), 400

        cur.execute("""
            INSERT INTO pt_bookings (user_id, trainer_id, booking_date, booking_time, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, tid, "Fri", "12:00", "Pending"))

        cur.execute("""
            UPDATE personal_trainers
            SET available = FALSE
            WHERE id = %s
        """, (tid,))

        cur.execute("""
            INSERT INTO reservations (user_id, reservation_title, reservation_date, reservation_time, status)
            VALUES (%s, %s, %s, %s, %s)
        """, (user_id, "PT " + trainer_name, "Fri", "12:00", "Pending"))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Trainer booking requested."}), 201

    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        cur.close()
        conn.close()
        return jsonify({"success": False, "message": "You already booked this trainer."}), 409

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/cancel-reservation", methods=["POST"])
def cancel_reservation_api():
    data = request.get_json()

    reservation_id = data.get("reservation_id")

    if not reservation_id:
        return jsonify({"success": False, "message": "reservation_id is required."}), 400

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE reservations
            SET status = 'Cancelled'
            WHERE id = %s
        """, (reservation_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({"success": True, "message": "Reservation cancelled."}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
