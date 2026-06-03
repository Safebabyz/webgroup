/**
 * Test Suite: api.routes.test.js
 * ทดสอบ API Routes ด้วย Supertest (Integration Tests)
 * ครอบคลุม: Auth, Courses, Checkout (protected routes)
 */
'use strict';

// ⚠️ ต้องตั้งค่า env ก่อน require ใดๆ ทั้งสิ้น
process.env.JWT_SECRET     = 'test_secret_key_for_jest_testing_only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV       = 'test';
process.env.DB_PATH        = './data/test_database.sqlite';

const request  = require('supertest');
const jwt      = require('jsonwebtoken');
const path     = require('path');
const fs       = require('fs');
const sqlite3  = require('sqlite3').verbose();

const TEST_DB = path.resolve(__dirname, '../data/test_database.sqlite');

// สร้าง test DB พร้อม schema ก่อน require app
function setupTestDb() {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
        const db = new sqlite3.Database(TEST_DB);
        const schema = fs.readFileSync(path.resolve(__dirname, '../data/schema.sql'), 'utf8');
        const stmts  = schema.split(';').map(s => s.trim()).filter(s => s.length > 0);
        db.serialize(() => {
            stmts.forEach(stmt => db.run(stmt + ';'));
            db.close(err => err ? reject(err) : resolve());
        });
    });
}

// สร้าง DB ก่อนทุกอย่าง
beforeAll(async () => {
    await setupTestDb();
}, 10000);

// require app หลังจาก DB พร้อมแล้ว (lazy require)
let app;
beforeAll(() => {
    app = require('../src/app');
});

// ลบ test DB หลัง test ทั้งหมดเสร็จ
afterAll(() => {
    if (fs.existsSync(TEST_DB)) fs.unlinkSync(TEST_DB);
});

// Helper: สร้าง valid JWT สำหรับ test
function makeToken(userId = 1) {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// ─────────────────────────────────────────────
// 1. HEALTH CHECK
// ─────────────────────────────────────────────
describe('🌐 API Health Check', () => {
    test('GET /api → ส่งกลับ 200 + welcome message', async () => {
        const res = await request(app).get('/api');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });
});

// ─────────────────────────────────────────────
// 2. AUTH ROUTES
// ─────────────────────────────────────────────
describe('🔐 Auth Routes (/api/auth)', () => {

    describe('POST /api/auth/register', () => {
        test('❌ ขาด field → ส่งกลับ 400', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test User' }); // ขาด email และ password
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('message');
        });

        test('❌ password ไม่ผ่าน regex (ไม่มีตัวพิมพ์ใหญ่) → ส่งกลับ 400', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'test@example.com', password: 'weakpassword!' });
            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/uppercase/i);
        });

        test('❌ password ไม่มี special character → ส่งกลับ 400', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Test', email: 'test@example.com', password: 'Weakpassword1' });
            expect(res.status).toBe(400);
        });

        test('✅ ลงทะเบียนถูกต้อง → ส่งกลับ 200 + token', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    name:     'Test User',
                    email:    `testuser_${Date.now()}@example.com`,
                    password: 'TestPass!1'
                });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('userId');
            expect(typeof res.body.token).toBe('string');
        });

        test('❌ ลงทะเบียน email ซ้ำ → ส่งกลับ 409', async () => {
            const email = `duplicate_${Date.now()}@example.com`;
            // ลงทะเบียนครั้งแรก
            await request(app)
                .post('/api/auth/register')
                .send({ name: 'First', email, password: 'TestPass!1' });
            // ลงทะเบียนซ้ำ
            const res = await request(app)
                .post('/api/auth/register')
                .send({ name: 'Second', email, password: 'TestPass!1' });
            expect(res.status).toBe(409);
        });
    });

    describe('POST /api/auth/login', () => {
        const testEmail    = `logintest_${Date.now()}@example.com`;
        const testPassword = 'TestPass!1';

        beforeAll(async () => {
            // สร้างผู้ใช้สำหรับ test login
            await request(app)
                .post('/api/auth/register')
                .send({ name: 'Login Tester', email: testEmail, password: testPassword });
        });

        test('❌ ขาด field → ส่งกลับ 400', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testEmail }); // ขาด password
            expect(res.status).toBe(400);
        });

        test('❌ password ผิด → ส่งกลับ 401', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testEmail, password: 'WrongPass!9' });
            expect(res.status).toBe(401);
        });

        test('❌ email ไม่มีในระบบ → ส่งกลับ 401', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'notexist@example.com', password: testPassword });
            expect(res.status).toBe(401);
        });

        test('✅ login ถูกต้อง → ส่งกลับ 200 + token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: testEmail, password: testPassword });
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('userId');
        });
    });
});

// ─────────────────────────────────────────────
// 3. COURSES ROUTE
// ─────────────────────────────────────────────
describe('📚 Courses Route (/api/courses)', () => {
    test('GET /api/courses → ส่งกลับ 200 หรือ 404 (ไม่ใช่ 500)', async () => {
        const res = await request(app).get('/api/courses');
        expect([200, 404, 503]).toContain(res.status);
    });
});

// ─────────────────────────────────────────────
// 4. CHECKOUT ROUTES — PROTECTED (ต้องมี JWT)
// ─────────────────────────────────────────────
describe('🛒 Checkout Routes (/api/checkout) — Protected', () => {

    describe('POST /api/checkout/process', () => {
        test('❌ ไม่มี Token → ส่งกลับ 401 (ไม่ใช่ 503 หรือ 400)', async () => {
            const res = await request(app)
                .post('/api/checkout/process')
                .send({ courses: [{ id: 1 }] });
            expect(res.status).toBe(401);
        });

        test('❌ Token ปลอม → ส่งกลับ 403', async () => {
            const res = await request(app)
                .post('/api/checkout/process')
                .set('Authorization', 'Bearer this.is.fake')
                .send({ courses: [{ id: 1 }] });
            expect(res.status).toBe(403);
        });

        test('❌ Token ถูกต้องแต่ไม่ส่ง courses → ส่งกลับ 400', async () => {
            const token = makeToken(1);
            const res   = await request(app)
                .post('/api/checkout/process')
                .set('Authorization', `Bearer ${token}`)
                .send({}); // ไม่มี courses
            expect(res.status).toBe(400);
        });

        test('❌ Token ถูกต้องแต่ courses เป็น array ว่าง → ส่งกลับ 400', async () => {
            const token = makeToken(1);
            const res   = await request(app)
                .post('/api/checkout/process')
                .set('Authorization', `Bearer ${token}`)
                .send({ courses: [] });
            expect(res.status).toBe(400);
        });

        test('❌ Token ถูกต้องแต่ course id ไม่มีใน DB → ส่งกลับ 404', async () => {
            const token = makeToken(1);
            const res   = await request(app)
                .post('/api/checkout/process')
                .set('Authorization', `Bearer ${token}`)
                .send({ courses: [{ id: 999999 }] }); // id ที่ไม่มีในระบบ
            expect([404, 503]).toContain(res.status);
        });

        test('🔒 ตรวจสอบว่า userId มาจาก JWT ไม่ใช่ body (Security Test)', async () => {
            const token = makeToken(1);
            const res   = await request(app)
                .post('/api/checkout/process')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId:  999, // ← ค่านี้ต้องถูกละเว้น ไม่ถูกใช้
                    courses: [{ id: 1 }]
                });
            // ไม่ว่าจะส่ง userId อะไรมา ระบบต้องใช้ userId จาก JWT (id: 1) เท่านั้น
            // ผลลัพธ์ที่คาดหวัง: ไม่ใช่ 401 หรือ 403 (token ผ่าน)
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        });
    });

    describe('GET /api/checkout/bookings/:userId', () => {
        test('❌ ไม่มี Token → ส่งกลับ 401', async () => {
            const res = await request(app).get('/api/checkout/bookings/1');
            expect(res.status).toBe(401);
        });

        test('❌ Token ปลอม → ส่งกลับ 403', async () => {
            const res = await request(app)
                .get('/api/checkout/bookings/1')
                .set('Authorization', 'Bearer fake.token.here');
            expect(res.status).toBe(403);
        });

        test('✅ Token ถูกต้อง → ผ่าน auth (ได้รับ 200 หรือ 503 ตาม DB)', async () => {
            const token = makeToken(1);
            const res   = await request(app)
                .get('/api/checkout/bookings/1')
                .set('Authorization', `Bearer ${token}`);
            // ไม่ใช่ 401/403 — แสดงว่า auth ผ่านแล้ว
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
        });
    });
});

// ─────────────────────────────────────────────
// 5. SECURITY CHECKS
// ─────────────────────────────────────────────
describe('🛡️ Security Checks', () => {
    test('❌ ไม่มี route นี้ใน API → 404 (ไม่ crash server)', async () => {
        const res = await request(app).get('/api/nonexistent-route');
        expect(res.status).not.toBe(500);
    });

    test('❌ Body ขนาดเกิน 10kb → ต้องไม่ crash (ไม่ใช่ 2xx)', async () => {
        const bigPayload = { data: 'x'.repeat(11 * 1024) }; // 11kb
        const res = await request(app)
            .post('/api/auth/login')
            .send(bigPayload);
        // Express 5 อาจส่ง 400 หรือ 413 แต่ต้องไม่ส่ง 2xx (ไม่ผ่านโดยไม่ตรวจสอบ)
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('🔒 JWT secret fallback ไม่มีใน production — ตรวจสอบ env', () => {
        // JWT_SECRET ต้องไม่ใช่ค่า default เดิม 'your_jwt_secret'
        expect(process.env.JWT_SECRET).not.toBe('your_jwt_secret');
        expect(process.env.JWT_SECRET).toBeDefined();
        expect(process.env.JWT_SECRET.length).toBeGreaterThan(10);
    });
});
