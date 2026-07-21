"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate_1 = require("../middleware/authenticate");
const errorHandler_1 = require("../middleware/errorHandler");
exports.authRouter = (0, express_1.Router)();
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// POST /auth/login
exports.authRouter.post('/login', async (req, res, next) => {
    try {
        const { email, password } = loginSchema.parse(req.body);
        const user = await prisma_1.default.user.findUnique({ where: { email } });
        if (!user) {
            throw new errorHandler_1.AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }
        const valid = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!valid) {
            throw new errorHandler_1.AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS');
        }
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new errorHandler_1.AppError(500, 'Server misconfiguration', 'SERVER_ERROR');
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: user.role }, secret, { expiresIn: '8h' });
        // console.log(token)
        res.json({
            token,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        });
    }
    catch (err) {
        next(err);
    }
});
// GET /auth/me
exports.authRouter.get('/me', authenticate_1.authenticate, async (req, res, next) => {
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, name: true, email: true, role: true, createdAt: true },
        });
        if (!user)
            throw new errorHandler_1.AppError(404, 'User not found', 'NOT_FOUND');
        res.json(user);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=auth.js.map