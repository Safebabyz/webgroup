const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

/**
 * Route: POST /process
 * Purpose: Processes a checkout, verifying course capacities and schedules, and creates a booking.
 * Data Flow: Request Body (userId, courses, totalAmount) -> checkoutController.processCheckout -> Response (booking confirmation)
 */
router.post('/process', checkoutController.processCheckout);

/**
 * Route: GET /bookings/:userId
 * Purpose: Retrieves all past bookings for a specific user.
 * Data Flow: Request Params (userId) -> checkoutController.getUserBookings -> Response (JSON array of user's bookings)
 */
router.get('/bookings/:userId', checkoutController.getUserBookings);

module.exports = router;
