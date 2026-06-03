# BilgiFit

## Project Overview

BilgiFit is a web-based fitness center management and reservation system developed as part of the CMPE 372 Software Engineering course project.

The platform allows university students to register using their institutional email accounts, log into the system, reserve sports facilities, join group sessions, book personal trainers, and manage their reservations through a centralized dashboard.

The project follows a client-server architecture with a Flask backend, PostgreSQL database, and a responsive frontend interface.

---

## Features

### User Authentication

* User registration
* User login
* Password hashing using Werkzeug
* Institutional email validation
* Session persistence through browser storage

### Facility Booking

* View available facility slots
* Capacity tracking
* Real-time reservation creation
* Facility occupancy monitoring

### Group Sessions

* Browse available sessions
* Join group activities
* Participant tracking
* Capacity management

### Personal Trainer Booking

* Browse trainer profiles
* View trainer specialties
* Request trainer appointments
* Availability tracking

### Dashboard

* Reservation overview
* Facility statistics
* Occupancy information
* Booking management

### Reservation Management

* Create reservations
* View reservations
* Cancel reservations
* Track reservation status

---

## Technologies Used

### Frontend

* HTML5
* CSS3
* JavaScript (Vanilla JS)

### Backend

* Python
* Flask
* Flask-CORS
* Werkzeug

### Database

* PostgreSQL
* Neon Database

### Deployment

* Render

### Version Control

* Git
* GitHub

---

## System Architecture

```text
Frontend (HTML/CSS/JavaScript)
            |
            v
      Flask REST API
            |
            v
      Neon PostgreSQL
            |
            v
      Persistent Data
```

The frontend communicates with the Flask backend through REST API endpoints. The backend processes requests, validates data, and performs database operations using PostgreSQL hosted on Neon.

---

## Database Design

### Users

Stores registered student accounts.

| Column   | Type    |
| -------- | ------- |
| id       | SERIAL  |
| fullname | VARCHAR |
| email    | VARCHAR |
| password | VARCHAR |

### Facility Slots

Stores facility availability information.

| Column        | Type    |
| ------------- | ------- |
| id            | SERIAL  |
| facility_name | VARCHAR |
| facility_type | VARCHAR |
| slot_time     | VARCHAR |
| capacity      | INTEGER |
| booked        | INTEGER |

### Group Sessions

Stores available group exercise sessions.

| Column            | Type    |
| ----------------- | ------- |
| id                | SERIAL  |
| session_name      | VARCHAR |
| instructor        | VARCHAR |
| schedule          | VARCHAR |
| participant_count | INTEGER |
| max_capacity      | INTEGER |
| level             | VARCHAR |

### Personal Trainers

Stores trainer information.

| Column        | Type    |
| ------------- | ------- |
| id            | SERIAL  |
| trainer_name  | VARCHAR |
| specialty     | VARCHAR |
| rating        | NUMERIC |
| session_count | INTEGER |
| available     | BOOLEAN |

### Reservations

Stores facility, session, and trainer reservations.

| Column            | Type    |
| ----------------- | ------- |
| id                | SERIAL  |
| user_id           | INTEGER |
| reservation_title | VARCHAR |
| reservation_date  | VARCHAR |
| reservation_time  | VARCHAR |
| status            | VARCHAR |

### Session Participants

Stores users enrolled in group sessions.

| Column     | Type    |
| ---------- | ------- |
| id         | SERIAL  |
| user_id    | INTEGER |
| session_id | INTEGER |

### PT Bookings

Stores personal trainer bookings.

| Column       | Type    |
| ------------ | ------- |
| id           | SERIAL  |
| user_id      | INTEGER |
| trainer_id   | INTEGER |
| booking_date | VARCHAR |
| booking_time | VARCHAR |
| status       | VARCHAR |

---

## API Endpoints

### Authentication

```http
POST /register
POST /login
```

### Facilities

```http
GET /api/facilities
POST /api/reserve-facility
```

### Group Sessions

```http
GET /api/sessions
POST /api/join-session
```

### Personal Trainers

```http
GET /api/trainers
POST /api/book-trainer
```

### Reservations

```http
GET /api/reservations
POST /api/cancel-reservation
```

### Statistics

```http
GET /api/stats
```

---

## Deployment

The project is deployed using Render.

Backend services run through Flask and connect to a Neon-hosted PostgreSQL database using environment variables configured within Render.

---

## Installation

### Clone Repository

```bash
git clone https://github.com/Becho-png/CMPE372-Bilgifit.git
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Environment Variable

```bash
DATABASE_URL=your_neon_connection_string
```

### Run Application

```bash
python app.py
```

---

## Team Members

CMPE 372 – Software Engineering Project Team

BilgiFit was developed collaboratively as part of the course requirements.

---

## Future Improvements

* Email verification
* Password recovery
* Role-based access control
* Trainer schedules
* Facility-specific time management
* Mobile application support
* Analytics dashboard
* Notification system

---

## Live Demo

You can test the deployed application here:

https://cmpe372-bilgifit-1.onrender.com/

## License

This project was developed for academic purposes as part of the CMPE 372 Software Engineering course.
