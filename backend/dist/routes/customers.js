"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customersRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate_1 = require("../middleware/authenticate");
const errorHandler_1 = require("../middleware/errorHandler");
const queryHelper_1 = require("../lib/queryHelper");
exports.customersRouter = (0, express_1.Router)();
exports.customersRouter.use(authenticate_1.authenticate);
const customerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    mobile: zod_1.z.string().min(6),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal('')),
    businessName: zod_1.z.string().optional(),
    gstNumber: zod_1.z.string().optional(),
    customerType: zod_1.z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
    address: zod_1.z.string().optional(),
    status: zod_1.z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
    followUpDate: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
});
const noteSchema = zod_1.z.object({
    note: zod_1.z.string().min(1),
    followUpDate: zod_1.z.string().datetime().optional().or(zod_1.z.literal('')),
});
// POST /customers
exports.customersRouter.post('/', async (req, res, next) => {
    try {
        const data = customerSchema.parse(req.body);
        const customer = await prisma_1.default.customer.create({
            data: {
                ...data,
                email: data.email || null,
                followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            },
        });
        res.status(201).json(customer);
    }
    catch (err) {
        next(err);
    }
});
// GET /customers
exports.customersRouter.get('/', async (req, res, next) => {
    try {
        const page = parseInt((0, queryHelper_1.qs)(req.query.page) ?? '1') || 1;
        const limit = parseInt((0, queryHelper_1.qs)(req.query.limit) ?? '20') || 20;
        const search = (0, queryHelper_1.qs)(req.query.search);
        const status = (0, queryHelper_1.qs)(req.query.status);
        const customerType = (0, queryHelper_1.qs)(req.query.customerType);
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { mobile: { contains: search, mode: 'insensitive' } },
                { businessName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (status)
            where.status = status;
        if (customerType)
            where.customerType = customerType;
        const [customers, total] = await Promise.all([
            prisma_1.default.customer.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { updatedAt: 'desc' },
            }),
            prisma_1.default.customer.count({ where }),
        ]);
        res.json({ customers, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
// GET /customers/:id
exports.customersRouter.get('/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const customer = await prisma_1.default.customer.findUnique({
            where: { id },
            include: {
                notes: {
                    orderBy: { createdAt: 'desc' },
                    include: { createdBy: { select: { id: true, name: true, role: true } } },
                },
            },
        });
        if (!customer)
            throw new errorHandler_1.AppError(404, 'Customer not found', 'NOT_FOUND');
        res.json(customer);
    }
    catch (err) {
        next(err);
    }
});
// PUT /customers/:id
exports.customersRouter.put('/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const data = customerSchema.parse(req.body);
        const customer = await prisma_1.default.customer.update({
            where: { id },
            data: {
                ...data,
                email: data.email || null,
                followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
            },
        });
        res.json(customer);
    }
    catch (err) {
        next(err);
    }
});
// POST /customers/:id/notes
exports.customersRouter.post('/:id/notes', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const { note, followUpDate } = noteSchema.parse(req.body);
        const customer = await prisma_1.default.customer.findUnique({ where: { id } });
        if (!customer)
            throw new errorHandler_1.AppError(404, 'Customer not found', 'NOT_FOUND');
        const [newNote] = await prisma_1.default.$transaction([
            prisma_1.default.customerNote.create({
                data: {
                    customerId: id,
                    note,
                    createdById: req.user.userId,
                },
                include: { createdBy: { select: { id: true, name: true, role: true } } },
            }),
            ...(followUpDate
                ? [prisma_1.default.customer.update({
                        where: { id },
                        data: { followUpDate: new Date(followUpDate) },
                    })]
                : []),
        ]);
        res.status(201).json(newNote);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=customers.js.map