require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Defensive startup checks
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is missing.');
    process.exit(1);
}
if (!process.env.DB_PATH) {
    console.error('FATAL ERROR: DB_PATH environment variable is missing.');
    process.exit(1);
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../theme')));

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

// Global Error Handler ("Two-Face" Pattern)
app.use((err, req, res, next) => {
    // Log internal error for developer debugging
    console.error(`[ERROR] ${new Date().toISOString()}`);
    console.error(err.stack || err);

    if (process.env.NODE_ENV === 'production') {
        // Obfuscate stack trace and detailed errors in production
        return res.status(500).json({ message: 'Internal Server Error' });
    } else {
        // Expose full error trace in development
        return res.status(500).json({ error: err.message, stack: err.stack });
    }
});


const PORT = process.env.PORT || 8000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
