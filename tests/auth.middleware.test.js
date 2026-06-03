/**
 * Test Suite: auth.middleware.test.js
 * ทดสอบ JWT Authentication Middleware
 * ครอบคลุม: ไม่มี token, token ผิด, token หมดอายุ, token ถูกต้อง
 */
'use strict';

const jwt = require('jsonwebtoken');

// กำหนด JWT_SECRET ก่อน require middleware
process.env.JWT_SECRET = 'test_secret_key_for_jest_testing_only';
process.env.DB_PATH = './data/database.sqlite';

const authenticateToken = require('../src/middleware/auth');

// Helper: สร้าง mock req/res/next
function mockRes() {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json   = jest.fn().mockReturnValue(res);
    return res;
}

describe('🔐 JWT Middleware (authenticateToken)', () => {

    test('❌ ไม่มี Authorization header → ส่งกลับ 401', () => {
        const req  = { headers: {} };
        const res  = mockRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Unauthorized') })
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('❌ Header ไม่ขึ้นต้นด้วย Bearer → ส่งกลับ 401', () => {
        const req  = { headers: { authorization: 'Basic abc123' } };
        const res  = mockRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('❌ Token ไม่ถูกต้อง (random string) → ส่งกลับ 403', () => {
        const req  = { headers: { authorization: 'Bearer invalidtoken123' } };
        const res  = mockRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: expect.stringContaining('Forbidden') })
        );
        expect(next).not.toHaveBeenCalled();
    });

    test('❌ Token หมดอายุ → ส่งกลับ 403', () => {
        const expiredToken = jwt.sign(
            { id: 99 },
            process.env.JWT_SECRET,
            { expiresIn: -1 } // หมดอายุทันที
        );
        const req  = { headers: { authorization: `Bearer ${expiredToken}` } };
        const res  = mockRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test('✅ Token ถูกต้อง → เรียก next() และตั้ง req.user', () => {
        const validToken = jwt.sign(
            { id: 42 },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        const req  = { headers: { authorization: `Bearer ${validToken}` } };
        const res  = mockRes();
        const next = jest.fn();

        authenticateToken(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(42);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('✅ Token ถูกต้อง → req.user.id ตรงกับที่ sign ไว้', () => {
        const userId = 123;
        const token  = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const req    = { headers: { authorization: `Bearer ${token}` } };
        const res    = mockRes();
        const next   = jest.fn();

        authenticateToken(req, res, next);

        expect(req.user.id).toBe(userId);
    });
});
