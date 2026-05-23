const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

exports.getAllCourses = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.*, COUNT(bi.id) AS current_bookings
            FROM courses c
            LEFT JOIN booking_items bi ON c.id = bi.course_id
            GROUP BY c.id
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
};
