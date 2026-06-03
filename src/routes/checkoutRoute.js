const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
let checkoutController;
try {
    checkoutController = require('../controllers/checkoutController');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.warn('[Warning] checkoutController not found. Route /api/checkout will return 503 Service Unavailable.');
    } else {
        throw err;
    }
}

/**
 * Route: POST /process
 * Purpose: Processes a checkout, verifying course capacities and schedules, and creates a booking.
 * Data Flow: Request Body (userId, courses, totalAmount) -> checkoutController.processCheckout -> Response (booking confirmation)
 */
router.post('/process', authenticateToken, (req, res, next) => {
    if (!checkoutController || !checkoutController.processCheckout) {
        return res.status(503).json({ message: 'Checkout service is currently unavailable.' });
    }
    checkoutController.processCheckout(req, res, next);
});

/**
 * Route: GET /bookings/:userId
 * Purpose: Retrieves all past bookings for a specific user.
 * Data Flow: Request Params (userId) -> checkoutController.getUserBookings -> Response (JSON array of user's bookings)
 */
router.get('/bookings/:userId', authenticateToken, (req, res, next) => {
    if (!checkoutController || !checkoutController.getUserBookings) {
        return res.status(503).json({ message: 'Checkout service is currently unavailable.' });
    }
    checkoutController.getUserBookings(req, res, next);
});

module.exports = router;
