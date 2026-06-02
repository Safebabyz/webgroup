const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');

/**
 * Route: GET /
 * Purpose: Retrieves a list of all available courses.
 * Data Flow: Request -> courseController.getCourses -> Response (JSON array of courses)
 */
router.get('/', courseController.getCourses);

module.exports = router;
