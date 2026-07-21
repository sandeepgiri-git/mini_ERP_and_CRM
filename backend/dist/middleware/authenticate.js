"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHENTICATED' } });
        return;
    }
    const token = authHeader.slice(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        res.status(500).json({ error: { message: 'Server misconfiguration', code: 'SERVER_ERROR' } });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, secret);
        req.user = payload;
        next();
    }
    catch {
        res.status(401).json({ error: { message: 'Invalid or expired token', code: 'INVALID_TOKEN' } });
    }
}
//# sourceMappingURL=authenticate.js.map