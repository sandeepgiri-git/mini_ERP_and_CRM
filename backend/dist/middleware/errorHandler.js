"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
function errorHandler(err, _req, res, _next) {
    // Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: {
                message: 'Validation failed',
                code: 'VALIDATION_ERROR',
                details: err.flatten().fieldErrors,
            },
        });
        return;
    }
    // Prisma unique constraint violation
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            res.status(409).json({
                error: { message: 'A record with that value already exists', code: 'CONFLICT' },
            });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({
                error: { message: 'Record not found', code: 'NOT_FOUND' },
            });
            return;
        }
    }
    // Known application errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: { message: err.message, code: err.code },
        });
        return;
    }
    // Unknown errors
    console.error('[Server Error]', err);
    res.status(500).json({
        error: { message: 'Internal server error', code: 'SERVER_ERROR' },
    });
}
class AppError extends Error {
    constructor(statusCode, message, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
//# sourceMappingURL=errorHandler.js.map