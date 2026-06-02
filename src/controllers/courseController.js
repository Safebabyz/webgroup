const courseService = require('../services/courseService');

/**
 * Function: getCourses
 * Purpose: Handles the request to fetch all courses.
 * Data Flow: Calls courseService.getAllCourses() to fetch data from DB. Returns a 200 JSON response with the courses array, or 404 if none found.
 */
exports.getCourses = async (req, res) => {
    try {
        const courses = await courseService.getAllCourses();
        
        if (!courses || courses.length === 0) {
            return res.status(404).json({ message: 'No courses found.' });
        }
        
        res.status(200).json(courses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
