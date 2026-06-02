const checkoutService = require('../services/checkoutService');

// Process checkout and create booking
exports.processCheckout = async (req, res) => {
    let transactionStarted = false;

    try {
        const { userId, courses, totalAmount } = req.body;

        if (!userId || !courses || courses.length === 0) {
            return res.status(400).json({ message: 'Missing required checkout information.' });
        }

        await checkoutService.beginTransaction();
        transactionStarted = true;

        const conflicts = [];
        const courseSnapshots = [];

        for (const course of courses) {
            const courseData = await checkoutService.getCourseForSnapshot(course.id);
            if (!courseData) {
                await checkoutService.rollbackTransaction();
                return res.status(404).json({ message: `Course ${course.id} not found.` });
            }

            if (courseData.current_capacity != null && courseData.max_capacity != null && Number(courseData.current_capacity) >= Number(courseData.max_capacity)) {
                conflicts.push({ id: courseData.id, title: courseData.title });
            }

            courseSnapshots.push(courseData);
        }

        if (conflicts.length > 0) {
            await checkoutService.rollbackTransaction();
            return res.status(409).json({
                message: 'Some selected courses are full and cannot be processed right now.',
                conflicts: conflicts
            });
        }

        const booking = await checkoutService.createBooking(userId, totalAmount);
        await checkoutService.addBookingItems(booking.id, courseSnapshots);

        for (const courseData of courseSnapshots) {
            await checkoutService.updateCourseCapacity(courseData.id, 1, courseData.title);
        }

        await checkoutService.commitTransaction();

        res.status(201).json({
            message: 'Booking created successfully.',
            bookingId: booking.id,
            totalAmount: booking.totalAmount
        });
    } catch (err) {
        if (transactionStarted) {
            try {
                await checkoutService.rollbackTransaction();
            } catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
            }
        }

        if (err.code === 'COURSE_FULL') {
            return res.status(409).json({
                message: 'One or more selected courses became full during checkout. Please remove them from your list and try again.',
                conflicts: [{ id: err.courseId, title: err.courseTitle || 'Unavailable course' }]
            });
        }

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
