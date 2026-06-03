/**
 * Middleware: authenticateToken
 * Purpose: Verifies the JWT token from the Authorization header.
 * Data Flow: Authorization Header (Bearer token) -> jwt.verify -> req.user (decoded payload) -> next()
 * On failure: Returns 401 (no token) or 403 (invalid/expired token).
 */
const jwt = require('jsonwebtoken');

module.exports = function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: ไม่พบ Token กรุณา Login ก่อนใช้งาน' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id: userId } ที่ผ่านการตรวจสอบแล้ว
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Forbidden: Token ไม่ถูกต้องหรือหมดอายุ กรุณา Login ใหม่' });
    }
};
