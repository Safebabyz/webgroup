CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR,
    email VARCHAR,
    password_hash VARCHAR,
    created_at TIMESTAMP
);

CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR,
    description TEXT,
    price DECIMAL,
    max_capacity INT,
    current_capacity INT,
    course_date DATE,
    start_time TIME,
    end_time TIME,
    image_url VARCHAR,
    category VARCHAR
);

CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INT,
    total_price DECIMAL,
    created_at TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE booking_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INT,
    course_id INT,
    snapshot_price DECIMAL,
    snapshot_max_capacity INT,
    snapshot_course_date DATE,
    snapshot_start_time TIME,
    snapshot_end_time TIME,
    FOREIGN KEY(booking_id) REFERENCES bookings(id),
    FOREIGN KEY(course_id) REFERENCES courses(id)
);
