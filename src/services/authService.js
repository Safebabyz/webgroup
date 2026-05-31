const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

exports.findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`;
        db.get(query, [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
};

exports.createUser = (username, email, passwordHash) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`;
        db.run(query, [username, email, passwordHash], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, username, email });
            }
        });
    });
};
