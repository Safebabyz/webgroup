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

const courseRoute = require('./routes/courseRoute');
const authRoute = require('./routes/authRoute');
const checkoutRoute = require('./routes/checkoutRoute');

app.use('/api/courses', courseRoute);
app.use('/api/auth', authRoute);
app.use('/api/checkout', checkoutRoute);

const PORT = process.env.PORT || 8000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;
