-- ============================================================
-- BilgiFit: Gym Reservation System
-- CMPE 372 - Final Project | Group 3
-- Relational schema (PostgreSQL) - matches the deployed Flask app (app.py)
-- ============================================================
-- This DDL reflects the schema actually used by the live application
-- (Neon PostgreSQL). Table and column names match the queries in app.py.
-- ============================================================

-- Clean slate (safe re-run)
DROP TABLE IF EXISTS session_participants CASCADE;
DROP TABLE IF EXISTS pt_bookings        CASCADE;
DROP TABLE IF EXISTS reservations       CASCADE;
DROP TABLE IF EXISTS personal_trainers  CASCADE;
DROP TABLE IF EXISTS group_sessions     CASCADE;
DROP TABLE IF EXISTS facility_slots     CASCADE;
DROP TABLE IF EXISTS users              CASCADE;

-- ------------------------------------------------------------
-- USERS: registered student / member accounts
-- ------------------------------------------------------------
CREATE TABLE users (
    id        SERIAL PRIMARY KEY,
    fullname  VARCHAR(120) NOT NULL,
    email     VARCHAR(160) NOT NULL UNIQUE,          -- enforces "one account per email"
    password  VARCHAR(255) NOT NULL,                 -- Werkzeug password hash (never plaintext)
    CONSTRAINT chk_users_email_domain
        CHECK (email LIKE '%@bilgi.edu.tr' OR email LIKE '%@bilgiedu.net')
);

-- ------------------------------------------------------------
-- FACILITY_SLOTS: bookable facility time slots (gym / boxing / basketball)
-- ------------------------------------------------------------
CREATE TABLE facility_slots (
    id            SERIAL PRIMARY KEY,
    facility_name VARCHAR(120) NOT NULL,
    facility_type VARCHAR(40)  NOT NULL
        CHECK (facility_type IN ('gym', 'boxing', 'basketball')),
    slot_time     VARCHAR(40)  NOT NULL,             -- e.g. '08:00 - 09:00'
    capacity      INTEGER      NOT NULL CHECK (capacity > 0),
    booked        INTEGER      NOT NULL DEFAULT 0 CHECK (booked >= 0),
    CONSTRAINT chk_facility_not_overbooked CHECK (booked <= capacity)
);

-- ------------------------------------------------------------
-- GROUP_SESSIONS: instructor-led classes
-- ------------------------------------------------------------
CREATE TABLE group_sessions (
    id                SERIAL PRIMARY KEY,
    session_name      VARCHAR(120) NOT NULL,
    instructor        VARCHAR(120) NOT NULL,
    schedule          VARCHAR(80)  NOT NULL,         -- e.g. 'Mon/Wed 07:00'
    participant_count INTEGER      NOT NULL DEFAULT 0 CHECK (participant_count >= 0),
    max_capacity      INTEGER      NOT NULL CHECK (max_capacity > 0),
    level             VARCHAR(40)  NOT NULL
        CHECK (level IN ('Beginner', 'Intermediate', 'Advanced', 'All Levels')),
    CONSTRAINT chk_session_not_overfilled CHECK (participant_count <= max_capacity)
);

-- ------------------------------------------------------------
-- PERSONAL_TRAINERS: trainer profiles
-- ------------------------------------------------------------
CREATE TABLE personal_trainers (
    id            SERIAL PRIMARY KEY,
    trainer_name  VARCHAR(120)  NOT NULL,
    specialty     VARCHAR(120)  NOT NULL,
    rating        NUMERIC(2,1)  NOT NULL DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    session_count INTEGER       NOT NULL DEFAULT 0 CHECK (session_count >= 0),
    available     BOOLEAN       NOT NULL DEFAULT TRUE
);

-- ------------------------------------------------------------
-- RESERVATIONS: unified reservation log (facility / session / trainer)
-- One row per user-facing booking; cancellation is a soft delete (status).
-- ------------------------------------------------------------
CREATE TABLE reservations (
    id                SERIAL PRIMARY KEY,
    user_id           INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reservation_title VARCHAR(160) NOT NULL,
    reservation_date  VARCHAR(40)  NOT NULL,
    reservation_time  VARCHAR(40)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Pending', 'Cancelled'))
);

-- ------------------------------------------------------------
-- SESSION_PARTICIPANTS: junction resolving User <-> GroupSession (N:M)
-- ------------------------------------------------------------
CREATE TABLE session_participants (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id)          ON DELETE CASCADE,
    session_id INTEGER NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
    CONSTRAINT uq_session_participant UNIQUE (user_id, session_id)  -- no double-join
);

-- ------------------------------------------------------------
-- PT_BOOKINGS: one-on-one personal-trainer bookings
-- ------------------------------------------------------------
CREATE TABLE pt_bookings (
    id           SERIAL PRIMARY KEY,
    user_id      INTEGER     NOT NULL REFERENCES users(id)             ON DELETE CASCADE,
    trainer_id   INTEGER     NOT NULL REFERENCES personal_trainers(id) ON DELETE RESTRICT,
    booking_date VARCHAR(40) NOT NULL,
    booking_time VARCHAR(40) NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending', 'Confirmed', 'Cancelled')),
    CONSTRAINT uq_pt_booking UNIQUE (user_id, trainer_id)           -- no duplicate booking
);

-- Helpful indexes for the read-heavy dashboard
CREATE INDEX idx_reservations_user   ON reservations (user_id);
CREATE INDEX idx_facility_type       ON facility_slots (facility_type);
CREATE INDEX idx_part_session        ON session_participants (session_id);

-- ============================================================
-- SEED DATA (mirrors the Figma prototype demo content)
-- ============================================================
INSERT INTO facility_slots (facility_name, facility_type, slot_time, capacity, booked) VALUES
    ('Gym Floor',          'gym',        '08:00 - 09:00', 10, 6),
    ('Boxing Ring 1',      'boxing',     '08:00 - 09:00',  4, 4),
    ('Basketball Court A', 'basketball', '08:00 - 09:00', 10, 3),
    ('Gym Floor',          'gym',        '09:00 - 10:00', 10, 8),
    ('Boxing Ring 2',      'boxing',     '09:00 - 10:00',  4, 2),
    ('Basketball Court B', 'basketball', '09:00 - 10:00', 10, 10);

INSERT INTO group_sessions (session_name, instructor, schedule, participant_count, max_capacity, level) VALUES
    ('HIIT Blast',          'Sarah M.', 'Mon/Wed 07:00',  3, 15, 'Intermediate'),
    ('Yoga Flow',           'David L.', 'Tue/Thu 08:00',  8, 12, 'All Levels'),
    ('Boxing Fundamentals', 'Mike R.',  'Mon/Fri 10:00',  2,  8, 'Beginner'),
    ('Spin Class',          'Anna K.',  'Wed/Fri 17:00', 15, 15, 'Advanced'),
    ('Pilates Core',        'Lisa T.',  'Tue/Thu 12:00',  5, 10, 'All Levels'),
    ('Strength Training',   'John B.',  'Mon/Wed 16:00',  7, 12, 'Intermediate');

INSERT INTO personal_trainers (trainer_name, specialty, rating, session_count, available) VALUES
    ('Melda Kara',  'HIIT & Cardio',           4.9, 120, TRUE),
    ('Mert Duru',   'Boxing',                  4.8,  95, TRUE),
    ('Yusuf Ates',  'Yoga & Flexibility',      4.7, 200, FALSE),
    ('Can Ozturk',  'Cycling & Spin',          4.9, 150, TRUE),
    ('Aylin Cetin', 'Strength & Powerlifting', 4.6,  80, TRUE),
    ('Pelin Teker', 'Pilates & Core',          4.8, 110, FALSE);
