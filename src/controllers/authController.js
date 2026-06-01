const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authService = require('../services/authService');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_EXPIRES_IN = '1h';

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*[!@#$%^&*]).{8,}$/;

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const user = await authService.findUserByEmail(email);

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: invalid email or password.' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Unauthorized: invalid email or password.' });
        }

        const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        return res.status(200).json({ token, userId: user.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email, and password are required.' });
        }

        if (!PASSWORD_REGEX.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long and include one uppercase letter and one special character.'
            });
        }

        const existingUser = await authService.findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: 'A user with that email already exists.' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await authService.createUser(name, email, passwordHash);

        const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
        console.log('DEBUG register response', { email, newUserId: newUser.id, token });
        const responseData = {
            message: 'Registration successful.',
            token: token,
            userId: newUser.id
        };
        return res.status(200).json(responseData);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};
