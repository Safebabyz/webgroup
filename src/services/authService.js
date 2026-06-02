const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../data/database.sqlite');
const db = new sqlite3.Database(dbPath);

// Remove duplicate email records before enforcing a unique email index.
db.serialize(() => {
    db.run(
        `DELETE FROM users
         WHERE id NOT IN (
             SELECT MIN(id)
             FROM users
             GROUP BY LOWER(email)
         )`
    );

    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(email COLLATE NOCASE)`);
});

/**
 * Function: findUserByEmail
 * Purpose: Fetches a user record from the database by their email address.
 * Data Flow: Executes a SELECT query on 'users' table -> Returns a Promise resolving to the user object (if found).
 */
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

/**
 * Function: createUser
 * Purpose: Inserts a new user record into the database.
 * Data Flow: Executes an INSERT query on 'users' table -> Returns a Promise resolving to an object containing the new user's ID, username, and email.
 */
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
