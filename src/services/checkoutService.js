const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

function runQuery(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(this);
            }
        });
    });
}

exports.beginTransaction = () => runQuery('BEGIN TRANSACTION;', []);
exports.commitTransaction = () => runQuery('COMMIT;', []);
exports.rollbackTransaction = () => runQuery('ROLLBACK;', []);

// Get all bookings for a user
exports.getUserBookings = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT * FROM bookings 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;
        db.all(query, [userId], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};

// Create a new booking (order)
exports.createBooking = (userId, totalAmount) => {
    return new Promise((resolve, reject) => {
        const query = `
            INSERT INTO bookings (user_id, total_price, created_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
        `;
        db.run(query, [userId, totalAmount], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, userId, totalAmount });
            }
        });
    });
};

// Add booking items (courses purchased)
exports.addBookingItems = (bookingId, courses) => {
    return new Promise((resolve, reject) => {
        if (!courses || courses.length === 0) {
            resolve([]);
            return;
        }

        const query = `
            INSERT INTO booking_items (booking_id, course_id, snapshot_price, snapshot_max_capacity, snapshot_course_date, snapshot_start_time, snapshot_end_time)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        let completed = 0;
        let error = null;
        const results = [];

        courses.forEach((course) => {
            db.run(query, [bookingId, course.id, course.price, course.max_capacity, course.course_date, course.start_time, course.end_time], function (err) {
                completed++;
                if (err) {
                    error = err;
                }
                if (completed === courses.length) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(results);
                    }
                }
            });
        });
    });
};

// Check if course exists and get details
exports.getCourseById = (courseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, title, price FROM courses WHERE id = ? LIMIT 1`;
        db.get(query, [courseId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

// Update course capacity after purchase
exports.updateCourseCapacity = (courseId, increment = 1, title) => {
    return new Promise((resolve, reject) => {
        const query = `
            UPDATE courses 
            SET current_capacity = current_capacity + ? 
            WHERE id = ? AND current_capacity < max_capacity
        `;
        db.run(query, [increment, courseId], function (err) {
            if (err) {
                reject(err);
            } else if (this.changes === 0) {
                const error = new Error('Course is full.');
                error.code = 'COURSE_FULL';
                error.courseId = courseId;
                if (title) error.courseTitle = title;
                reject(error);
            } else {
                resolve({ changes: this.changes });
            }
        });
    });
};

// Get a course with all details for snapshot
exports.getCourseForSnapshot = (courseId) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, title, price, max_capacity, current_capacity, course_date, start_time, end_time FROM courses WHERE id = ? LIMIT 1`;
        db.get(query, [courseId], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};
