const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * Route: POST /login
 * Purpose: Authenticates a user and returns a JWT token.
 * Data Flow: Request Body (email, password) -> authController.login -> Response (token, userId)
 */
router.post('/login', authController.login);

/**
 * Route: POST /register
 * Purpose: Registers a new user and returns a JWT token.
 * Data Flow: Request Body (name, email, password) -> authController.register -> Response (token, userId)
 */
router.post('/register', authController.register);

module.exports = router;
