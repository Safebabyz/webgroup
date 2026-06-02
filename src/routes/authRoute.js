const express = require('express');
const router = express.Router();
let authController;
try {
    authController = require('../controllers/authController');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.warn('[Warning] authController not found. Route /api/auth will return 503 Service Unavailable.');
    } else {
        throw err;
    }
}

/**
 * Route: POST /login
 * Purpose: Authenticates a user and returns a JWT token.
 * Data Flow: Request Body (email, password) -> authController.login -> Response (token, userId)
 */
router.post('/login', (req, res, next) => {
    if (!authController || !authController.login) {
        return res.status(503).json({ message: 'Authentication service is currently unavailable.' });
    }
    authController.login(req, res, next);
});

/**
 * Route: POST /register
 * Purpose: Registers a new user and returns a JWT token.
 * Data Flow: Request Body (name, email, password) -> authController.register -> Response (token, userId)
 */
router.post('/register', (req, res, next) => {
    if (!authController || !authController.register) {
        return res.status(503).json({ message: 'Authentication service is currently unavailable.' });
    }
    authController.register(req, res, next);
});

module.exports = router;
