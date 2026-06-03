-- ============================================================
--  EduCenter — Database Schema
--  เวอร์ชันที่ปรับปรุงแล้ว: เพิ่ม NOT NULL, UNIQUE, CHECK,
--  IF NOT EXISTS และ ON DELETE ที่ถูกต้อง
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
    id            INTEGER   PRIMARY KEY AUTOINCREMENT,
    username      VARCHAR   NOT NULL,
    email         VARCHAR   NOT NULL UNIQUE COLLATE NOCASE,
    password_hash VARCHAR   NOT NULL,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id               INTEGER  PRIMARY KEY AUTOINCREMENT,
    title            VARCHAR  NOT NULL,
    description      TEXT,
    price            DECIMAL  NOT NULL DEFAULT 0,
    max_capacity     INT      NOT NULL,
    current_capacity INT      NOT NULL DEFAULT 0,
    course_date      DATE     NOT NULL,
    start_time       TIME     NOT NULL,
    end_time         TIME     NOT NULL,
    image_url        VARCHAR,
    category         VARCHAR  NOT NULL DEFAULT 'General',
    CHECK (current_capacity >= 0),
    CHECK (current_capacity <= max_capacity)
);

CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER   PRIMARY KEY AUTOINCREMENT,
    user_id     INT       NOT NULL,
    total_price DECIMAL   NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking_items (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id            INT     NOT NULL,
    course_id             INT     NOT NULL,
    snapshot_price        DECIMAL NOT NULL,
    snapshot_max_capacity INT     NOT NULL,
    snapshot_course_date  DATE    NOT NULL,
    snapshot_start_time   TIME    NOT NULL,
    snapshot_end_time     TIME    NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id)  REFERENCES courses(id)  ON DELETE RESTRICT
);
