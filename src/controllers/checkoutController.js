const checkoutService = require('../services/checkoutService');

// Process checkout and create booking
exports.processCheckout = async (req, res) => {
    try {
        const { userId, courses, totalAmount } = req.body;

        if (!userId || !courses || courses.length === 0) {
            return res.status(400).json({ message: 'Missing required checkout information.' });
        }

        // Validate course objects exist
        for (const course of courses) {
            const courseData = await checkoutService.getCourseForSnapshot(course.id);
            if (!courseData) {
                return res.status(404).json({ message: `Course ${course.id} not found.` });
            }
        }

        // Create booking
        const booking = await checkoutService.createBooking(userId, totalAmount);

        // Add booking items with snapshot data
        await checkoutService.addBookingItems(booking.id, courses);

        // Update course capacities
        for (const course of courses) {
            await checkoutService.updateCourseCapacity(course.id, 1);
        }

        res.status(201).json({
            message: 'Booking created successfully.',
            bookingId: booking.id,
            totalAmount: booking.totalAmount
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get user's bookings
exports.getUserBookings = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const bookings = await checkoutService.getUserBookings(userId);
        res.status(200).json(bookings);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
