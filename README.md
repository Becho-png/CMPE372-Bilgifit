# CMPE372 BilgiFit

BilgiFit is a campus gym reservation system prototype for CMPE 372. The system is designed for students, instructors, and administrators who need a simple way to manage gym reservations, group sessions, personal trainer bookings, and facility capacity.

## Current Status

This repository includes a Flask backend and a dynamic HTML/CSS/JavaScript dashboard prototype.

Implemented code features:

- Login and register screen with client-side validation.
- Bilgi email domain validation for `@bilgi.edu.tr` and `@bilgiedu.net`.
- Flask `/register` and `/login` routes with hashed password support.
- Dashboard screen with reservation summary, live occupancy, quick actions, and reservation table.
- Facility Booking screen with filters, capacity bars, disabled full slots, and confirmation modal.
- Group Sessions screen with join logic and participant count updates.
- Personal Trainers screen with booking state and unavailable trainer state.
- My Profile screen with profile validation and save feedback.
- Responsive layout for desktop and mobile viewports.

## Demo Mode

The app can run without a PostgreSQL database.

If `DATABASE_URL` is not set, the backend uses an in-memory demo user store. This is useful for local testing and classroom demo purposes.

Demo mode behavior:

- New users can register from the UI.
- Passwords are still hashed with Werkzeug.
- Login works for users registered during the same server session.
- Data is reset when the Flask server restarts.
- This mode is not for production use.

Example demo flow:

1. Start the server.
2. Open `http://127.0.0.1:5000`.
3. Register with an email like `test@bilgi.edu.tr`.
4. Log in with the same email and password.
5. Use the dashboard prototype.

## PostgreSQL Mode

If `DATABASE_URL` is set, the backend connects to PostgreSQL with `psycopg2`.

Expected current `users` table fields:

- `id`
- `fullname`
- `email`
- `password`

The final report contains the larger planned database model for the full BilgiFit system, including `User`, `Facility`, `Reservation`, `GroupSession`, `PersonalTrainer`, `PTBooking`, and `SessionParticipant`.

## How to Run Locally

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the Flask app:

```bash
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Project Files

- `app.py` - Flask routes and authentication logic.
- `templates/index.html` - Login/Register page.
- `templates/dashboard.html` - Dashboard application shell.
- `static/script.js` - Login/Register page interaction logic.
- `static/dashboard.js` - Dashboard, booking, session, trainer, and profile interaction logic.
- `static/style.css` - Shared UI styling and responsive layout.
- `Group3_CMPE_FinalProject.docx` - Final CMPE 372 project report.

## Final Report

The final report combines previous assignments and the final project requirements. It includes:

- Project overview
- Personas
- User stories
- User journey map
- Information architecture
- Site map
- Page content inventory
- Figma prototype link
- Accessibility review
- Dynamic UI logic
- Database model and ER diagram
- UI-database CRUD mapping
- Sample SQL logic
- Front-end implementation summary
- Final reflection

Figma prototype:

```text
https://www.figma.com/design/rs4aRJcavArfGf8ne2doTo/BilgiFit-Assignment-3---High-Fidelity-UI?node-id=8-3
```
