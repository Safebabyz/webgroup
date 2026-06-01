const courseService = require('../services/courseService');

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
