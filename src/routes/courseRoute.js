const express = require('express');
const router = express.Router();
let courseController;
try {
    courseController = require('../controllers/courseController');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.warn('[Warning] courseController not found. Route /api/courses will return 503 Service Unavailable.');
    } else {
        throw err;
    }
}

/**
 * Route: GET /
 * Purpose: Retrieves a list of all available courses.
 * Data Flow: Request -> courseController.getCourses -> Response (JSON array of courses)
 */
router.get('/', (req, res, next) => {
    if (!courseController || !courseController.getCourses) {
        return res.status(503).json({ message: 'Course service is currently unavailable.' });
    }
    courseController.getCourses(req, res, next);
});

module.exports = router;
