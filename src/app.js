require('dotenv').config();
const express = require('express');
const cors = require('cors');


const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/api', (req, res) => {
    res.json({ message: 'Welcome to the API Gateway' });
});

function safeRequire(modulePath) {
    try {
        return require(modulePath);
    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.warn(`[Warning] Module ${modulePath} not found. Proceeding without it.`);
            return null;
        }
        throw err;
    }
}

const courseRoute = safeRequire('./routes/courseRoute');
const authRoute = safeRequire('./routes/authRoute');
const checkoutRoute = safeRequire('./routes/checkoutRoute');

if (courseRoute) {
    app.use('/api/courses', courseRoute);
} else {
    app.use('/api/courses', (req, res) => {
        res.status(503).json({ message: 'Course service is currently unavailable.' });
    });
}

if (authRoute) {
    app.use('/api/auth', authRoute);
} else {
    app.use('/api/auth', (req, res) => {
        res.status(503).json({ message: 'Authentication service is currently unavailable.' });
    });
}

if (checkoutRoute) {
    app.use('/api/checkout', checkoutRoute);
} else {
    app.use('/api/checkout', (req, res) => {
        res.status(503).json({ message: 'Checkout service is currently unavailable.' });
    });
}


const PORT = process.env.PORT || 8000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
