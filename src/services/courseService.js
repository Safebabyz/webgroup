const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

/**
 * Function: getAllCourses
 * Purpose: Retrieves all course records from the database.
 * Data Flow: Executes a SELECT query on the 'courses' table -> Returns a Promise resolving to an array of course objects.
 */
exports.getAllCourses = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT c.*
            FROM courses c
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
