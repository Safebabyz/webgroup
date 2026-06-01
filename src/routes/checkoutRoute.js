const express = require('express');
const router = express.Router();
const checkoutController = require('../controllers/checkoutController');

router.post('/process', checkoutController.processCheckout);
router.get('/bookings/:userId', checkoutController.getUserBookings);

module.exports = router;
