const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH ? path.resolve(process.cwd(), process.env.DB_PATH) : path.resolve(__dirname, '../../data/database.sqlite');
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

/**
 * Function: beginTransaction / commitTransaction / rollbackTransaction
 * Purpose: Manages database transactions.
 * Data Flow: Executes BEGIN/COMMIT/ROLLBACK on the database -> Returns a Promise.
 */
exports.beginTransaction = () => runQuery('BEGIN TRANSACTION;', []);
exports.commitTransaction = () => runQuery('COMMIT;', []);
exports.rollbackTransaction = () => runQuery('ROLLBACK;', []);

/**
 * Function: getUserBookings
 * Purpose: Retrieves all bookings made by a specific user.
 * Data Flow: Executes a SELECT query on 'bookings' table -> Returns a Promise resolving to an array of booking objects.
 */
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

/**
 * Function: createBooking
 * Purpose: Creates a new booking record for a user.
 * Data Flow: Executes an INSERT query on 'bookings' table -> Returns a Promise resolving to an object containing the new booking's ID, userId, and totalAmount.
 */
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

/**
 * Function: addBookingItems
 * Purpose: Adds multiple course items to an existing booking.
 * Data Flow: Executes multiple INSERT queries on 'booking_items' table -> Returns a Promise resolving when all inserts are complete.
 */
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

/**
 * Function: getCourseById
 * Purpose: Fetches basic details of a course by its ID.
 * Data Flow: Executes a SELECT query on 'courses' table -> Returns a Promise resolving to the course object.
 */
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

/**
 * Function: updateCourseCapacity
 * Purpose: Increments the current capacity of a course, failing if it exceeds max capacity.
 * Data Flow: Executes an UPDATE query on 'courses' table -> Returns a Promise resolving to the number of changes, or rejecting with a 'COURSE_FULL' error.
 */
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

/**
 * Function: getCourseForSnapshot
 * Purpose: Retrieves comprehensive details of a course needed to create a historical snapshot at the time of booking.
 * Data Flow: Executes a SELECT query on 'courses' table -> Returns a Promise resolving to the detailed course object.
 */
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
