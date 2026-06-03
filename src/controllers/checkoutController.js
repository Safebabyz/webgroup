let checkoutService;
try {
    checkoutService = require('../services/checkoutService');
} catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
        console.warn('[Warning] checkoutService not found. Checkout features will be unavailable.');
    } else {
        throw err;
    }
}

function parseMinutes(time) {
    if (!time) return null;
    const parts = String(time).split(':').slice(0, 2);
    const hour = Number(parts[0]);
    const minute = Number(parts[1] || 0);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
}

function timesOverlap(startA, endA, startB, endB) {
    const a = parseMinutes(startA);
    const b = parseMinutes(endA);
    const c = parseMinutes(startB);
    const d = parseMinutes(endB);
    if (a === null || b === null || c === null || d === null) return false;
    return a < d && c < b;
}

function formatConflictTitles(titles) {
    if (!titles || !titles.length) return '';
    if (titles.length === 1) return titles[0];
    if (titles.length === 2) return titles[0] + ' and ' + titles[1];
    return titles.slice(0, -1).join(', ') + ', and ' + titles[titles.length - 1];
}

/**
 * Function: processCheckout
 * Purpose: Handles the checkout process, verifying course availability, checking schedule conflicts, creating the booking, and updating capacities within a transaction.
 * Data Flow: Request Body (userId, courses, totalAmount) -> checkoutService (Transaction, Check Capacity, Create Booking, Add Items, Update Capacity) -> Response (201 with booking details, or 400/404/409/500 error)
 */
exports.processCheckout = async (req, res, next) => {
    if (!checkoutService) {
        return res.status(503).json({ message: 'Checkout service is currently unavailable.' });
    }
    let transactionStarted = false;

    try {
        // userId ดึงจาก JWT ที่ผ่านการตรวจสอบแล้ว (ไม่รับจาก client โดยตรง)
        const userId = req.user.id;
        const { courses } = req.body;

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

        // Check for schedule conflicts among the courses being checked out
        const scheduleConflicts = [];
        for (let i = 0; i < courseSnapshots.length; i++) {
            for (let j = i + 1; j < courseSnapshots.length; j++) {
                const a = courseSnapshots[i];
                const b = courseSnapshots[j];
                
                if (a.course_date && b.course_date && a.course_date === b.course_date) {
                    if (timesOverlap(a.start_time, a.end_time, b.start_time, b.end_time)) {
                        scheduleConflicts.push(a.title);
                        scheduleConflicts.push(b.title);
                    }
                }
            }
        }

        if (scheduleConflicts.length > 0) {
            await checkoutService.rollbackTransaction();
            const uniqueConflicts = [...new Set(scheduleConflicts)];
            return res.status(409).json({
                message: `Schedule conflict detected among selected courses: ${formatConflictTitles(uniqueConflicts)}.`,
                conflicts: uniqueConflicts
            });
        }

        // คำนวณ totalAmount จากราคาจริงใน DB (courseSnapshots) ไม่ใช่ราคาที่ client ส่งมา
        // นี่คือหลัก Gatekeeper Pattern — ไม่ไว้ใจตัวเลขจาก client เด็ดขาด
        const totalAmount = courseSnapshots.reduce(function (sum, c) {
            return sum + (Number(c.price) || 0);
        }, 0);
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

        next(err);
    }
};

/**
 * Function: getUserBookings
 * Purpose: Retrieves all bookings for a given user.
 * Data Flow: Request Params (userId) -> checkoutService.getUserBookings -> Response (200 with bookings array, or 400/500 error)
 */
exports.getUserBookings = async (req, res, next) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        if (!checkoutService) {
            return res.status(503).json({ message: 'Checkout service is currently unavailable.' });
        }
        const bookings = await checkoutService.getUserBookings(userId);
        res.status(200).json(bookings);
    } catch (err) {
        next(err);
    }
};
