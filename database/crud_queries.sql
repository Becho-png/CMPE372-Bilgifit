-- ============================================================
-- BilgiFit: Gym Reservation System
-- CMPE 372 - Final Project | Group 3
-- Representative CRUD queries (PostgreSQL)
-- ------------------------------------------------------------
-- Every query below corresponds to a real Flask endpoint in app.py.
-- Parameters are shown as $1, $2 ... (psycopg2 uses %s placeholders).
-- ============================================================


-- ============================================================
-- CREATE
-- ============================================================

-- C1. Register a new user            (POST /register)
INSERT INTO users (fullname, email, password)
VALUES ($1, $2, $3);

-- C2. Create a facility reservation   (POST /api/reserve-facility, step 2)
INSERT INTO reservations (user_id, reservation_title, reservation_date, reservation_time, status)
VALUES ($1, $2, 'Today', $3, 'Active');

-- C3. Add a member to a group session (POST /api/join-session, step 2)
INSERT INTO session_participants (user_id, session_id)
VALUES ($1, $2);

-- C4. Create a personal-trainer booking (POST /api/book-trainer, step 2)
INSERT INTO pt_bookings (user_id, trainer_id, booking_date, booking_time, status)
VALUES ($1, $2, 'Fri', '12:00', 'Pending');


-- ============================================================
-- READ
-- ============================================================

-- R1. Authenticate a user             (POST /login)
SELECT id, fullname, email, password
FROM users
WHERE email = $1;

-- R2. List all facility slots         (GET /api/facilities)
SELECT id, facility_name, facility_type, slot_time, capacity, booked
FROM facility_slots
ORDER BY id;

-- R3. List all group sessions         (GET /api/sessions)
SELECT id, session_name, instructor, schedule, participant_count, max_capacity, level
FROM group_sessions
ORDER BY id;

-- R4. List all personal trainers      (GET /api/trainers)
SELECT id, trainer_name, specialty, rating, session_count, available
FROM personal_trainers
ORDER BY id;

-- R5. List a user's reservations      (GET /api/reservations?user_id=)
SELECT id, reservation_title, reservation_date, reservation_time, status
FROM reservations
WHERE user_id = $1
ORDER BY id DESC;

-- R6. Dashboard statistics            (GET /api/stats)
-- 6a. peak gym occupancy
SELECT COALESCE(MAX(booked), 0) AS gym_occupied
FROM facility_slots
WHERE facility_type = 'gym';
-- 6b. open basketball courts
SELECT COUNT(*) AS open_courts
FROM facility_slots
WHERE facility_type = 'basketball' AND booked < capacity;
-- 6c. active bookings this week
SELECT COUNT(*) AS bookings_this_week
FROM reservations
WHERE status IN ('Active', 'Pending');

-- R7. Capacity guard before reserving (POST /api/reserve-facility, step 1)
SELECT id, facility_name, slot_time, capacity, booked
FROM facility_slots
WHERE id = $1;


-- ============================================================
-- UPDATE
-- ============================================================

-- U1. Increment facility booking count (POST /api/reserve-facility, step 3)
UPDATE facility_slots
SET booked = booked + 1
WHERE id = $1;

-- U2. Increment session participants   (POST /api/join-session, step 3)
UPDATE group_sessions
SET participant_count = participant_count + 1
WHERE id = $1;

-- U3. Mark a trainer unavailable        (POST /api/book-trainer, step 3)
UPDATE personal_trainers
SET available = FALSE
WHERE id = $1;

-- U4. Cancel a reservation (SOFT DELETE) (POST /api/cancel-reservation)
-- History is preserved for administrative auditing; the row is not removed.
UPDATE reservations
SET status = 'Cancelled'
WHERE id = $1;

-- U5. Update profile contact info (My Profile screen - planned server route)
UPDATE users
SET fullname = $1, email = $2
WHERE id = $3;


-- ============================================================
-- DELETE  (administrative / hard-delete cases)
-- ============================================================

-- D1. Remove a member from a group session (leave class)
DELETE FROM session_participants
WHERE user_id = $1 AND session_id = $2;

-- D2. Delete a pending PT booking record
DELETE FROM pt_bookings
WHERE id = $1 AND status = 'Pending';


-- ============================================================
-- JOIN examples (reporting / admin monitoring)
-- ============================================================

-- J1. A user's reservations with facility detail
SELECT r.id, r.reservation_title, fs.facility_type, r.reservation_time, r.status
FROM reservations r
LEFT JOIN facility_slots fs ON fs.facility_name = r.reservation_title
WHERE r.user_id = $1
ORDER BY r.id DESC;

-- J2. Group sessions with their enrolled participants
SELECT gs.session_name, gs.instructor, u.fullname AS participant
FROM group_sessions gs
JOIN session_participants sp ON sp.session_id = gs.id
JOIN users u                 ON u.id = sp.user_id
ORDER BY gs.session_name;

-- J3. Trainer booking volume (admin report)
SELECT pt.trainer_name, pt.specialty, COUNT(b.id) AS total_bookings
FROM personal_trainers pt
LEFT JOIN pt_bookings b ON b.trainer_id = pt.id
GROUP BY pt.id, pt.trainer_name, pt.specialty
ORDER BY total_bookings DESC;
