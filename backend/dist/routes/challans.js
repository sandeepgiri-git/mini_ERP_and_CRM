"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.challansRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate_1 = require("../middleware/authenticate");
const authorize_1 = require("../middleware/authorize");
const errorHandler_1 = require("../middleware/errorHandler");
const queryHelper_1 = require("../lib/queryHelper");
exports.challansRouter = (0, express_1.Router)();
exports.challansRouter.use(authenticate_1.authenticate);
const challanItemSchema = zod_1.z.object({
    productId: zod_1.z.string(),
    quantity: zod_1.z.number().int().positive(),
});
const createChallanSchema = zod_1.z.object({
    customerId: zod_1.z.string(),
    items: zod_1.z.array(challanItemSchema).min(1),
    status: zod_1.z.enum(['DRAFT', 'CONFIRMED']).default('DRAFT'),
});
const updateChallanSchema = zod_1.z.object({
    customerId: zod_1.z.string().optional(),
    items: zod_1.z.array(challanItemSchema).min(1).optional(),
});
// ─── Challan Number Generator ──────────────────────────────────────────────────
async function generateChallanNumber(tx) {
    const year = new Date().getFullYear();
    const prefix = `CH-${year}-`;
    const last = await tx.challan.findFirst({
        where: { challanNumber: { startsWith: prefix } },
        orderBy: { challanNumber: 'desc' },
    });
    let seq = 1;
    if (last) {
        const parts = last.challanNumber.split('-');
        seq = parseInt(parts[parts.length - 1], 10) + 1;
    }
    return `${prefix}${String(seq).padStart(4, '0')}`;
}
// POST /challans
exports.challansRouter.post('/', (0, authorize_1.authorize)('ADMIN', 'SALES'), async (req, res, next) => {
    try {
        const { customerId, items, status } = createChallanSchema.parse(req.body);
        const challan = await prisma_1.default.$transaction(async (tx) => {
            const challanNumber = await generateChallanNumber(tx);
            const productIds = items.map(i => i.productId);
            const products = await tx.product.findMany({ where: { id: { in: productIds } } });
            if (products.length !== productIds.length) {
                throw new errorHandler_1.AppError(400, 'One or more products not found', 'INVALID_PRODUCT');
            }
            const productMap = new Map(products.map(p => [p.id, p]));
            const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
            if (status === 'CONFIRMED') {
                const shortages = [];
                for (const item of items) {
                    const product = productMap.get(item.productId);
                    if (product.currentStock < item.quantity) {
                        shortages.push(`${product.name} (available: ${product.currentStock}, requested: ${item.quantity})`);
                    }
                }
                if (shortages.length > 0) {
                    throw new errorHandler_1.AppError(409, `Insufficient stock for: ${shortages.join('; ')}`, 'INSUFFICIENT_STOCK');
                }
            }
            const newChallan = await tx.challan.create({
                data: {
                    challanNumber,
                    customerId,
                    totalQuantity,
                    status,
                    createdById: req.user.userId,
                    items: {
                        create: items.map(item => {
                            const product = productMap.get(item.productId);
                            return {
                                productId: item.productId,
                                productNameSnapshot: product.name,
                                productSkuSnapshot: product.sku,
                                unitPriceSnapshot: product.unitPrice,
                                quantity: item.quantity,
                            };
                        }),
                    },
                },
                include: {
                    items: true,
                    customer: { select: { id: true, name: true, businessName: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });
            if (status === 'CONFIRMED') {
                for (const item of items) {
                    const product = productMap.get(item.productId);
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { currentStock: product.currentStock - item.quantity },
                    });
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantityChanged: item.quantity,
                            movementType: 'OUT',
                            reason: `Challan ${challanNumber}`,
                            createdById: req.user.userId,
                        },
                    });
                }
            }
            return newChallan;
        });
        res.status(201).json(challan);
    }
    catch (err) {
        next(err);
    }
});
// GET /challans
exports.challansRouter.get('/', async (req, res, next) => {
    try {
        const page = parseInt((0, queryHelper_1.qs)(req.query.page) ?? '1') || 1;
        const limit = parseInt((0, queryHelper_1.qs)(req.query.limit) ?? '20') || 20;
        const status = (0, queryHelper_1.qs)(req.query.status);
        const customerId = (0, queryHelper_1.qs)(req.query.customerId);
        const dateFrom = (0, queryHelper_1.qs)(req.query.dateFrom);
        const dateTo = (0, queryHelper_1.qs)(req.query.dateTo);
        const search = (0, queryHelper_1.qs)(req.query.search);
        const where = {};
        if (status)
            where.status = status;
        if (customerId)
            where.customerId = customerId;
        if (dateFrom || dateTo) {
            where.createdAt = {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo) } : {}),
            };
        }
        if (search) {
            where.OR = [
                { challanNumber: { contains: search, mode: 'insensitive' } },
                { customer: { name: { contains: search, mode: 'insensitive' } } },
            ];
        }
        const [challans, total] = await Promise.all([
            prisma_1.default.challan.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    customer: { select: { id: true, name: true, businessName: true } },
                    createdBy: { select: { id: true, name: true } },
                    _count: { select: { items: true } },
                },
            }),
            prisma_1.default.challan.count({ where }),
        ]);
        res.json({ challans, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
// GET /challans/:id
exports.challansRouter.get('/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const challan = await prisma_1.default.challan.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true, sku: true, currentStock: true } } },
                },
                customer: true,
                createdBy: { select: { id: true, name: true, role: true } },
            },
        });
        if (!challan)
            throw new errorHandler_1.AppError(404, 'Challan not found', 'NOT_FOUND');
        res.json(challan);
    }
    catch (err) {
        next(err);
    }
});
// PUT /challans/:id — DRAFT only
exports.challansRouter.put('/:id', (0, authorize_1.authorize)('ADMIN', 'SALES'), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const data = updateChallanSchema.parse(req.body);
        const existing = await prisma_1.default.challan.findUnique({ where: { id } });
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Challan not found', 'NOT_FOUND');
        if (existing.status !== 'DRAFT') {
            throw new errorHandler_1.AppError(400, 'Only DRAFT challans can be edited', 'INVALID_STATUS');
        }
        const challan = await prisma_1.default.$transaction(async (tx) => {
            if (data.items) {
                await tx.challanItem.deleteMany({ where: { challanId: id } });
                const productIds = data.items.map(i => i.productId);
                const products = await tx.product.findMany({ where: { id: { in: productIds } } });
                const productMap = new Map(products.map(p => [p.id, p]));
                const totalQuantity = data.items.reduce((sum, i) => sum + i.quantity, 0);
                return tx.challan.update({
                    where: { id },
                    data: {
                        customerId: data.customerId,
                        totalQuantity,
                        items: {
                            create: data.items.map(item => {
                                const product = productMap.get(item.productId);
                                return {
                                    productId: item.productId,
                                    productNameSnapshot: product.name,
                                    productSkuSnapshot: product.sku,
                                    unitPriceSnapshot: product.unitPrice,
                                    quantity: item.quantity,
                                };
                            }),
                        },
                    },
                    include: { items: true, customer: { select: { id: true, name: true } } },
                });
            }
            return tx.challan.update({
                where: { id },
                data: { customerId: data.customerId },
                include: { items: true, customer: { select: { id: true, name: true } } },
            });
        });
        res.json(challan);
    }
    catch (err) {
        next(err);
    }
});
// POST /challans/:id/confirm
exports.challansRouter.post('/:id/confirm', (0, authorize_1.authorize)('ADMIN', 'SALES'), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const challan = await prisma_1.default.$transaction(async (tx) => {
            const existing = await tx.challan.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!existing)
                throw new errorHandler_1.AppError(404, 'Challan not found', 'NOT_FOUND');
            if (existing.status !== 'DRAFT') {
                throw new errorHandler_1.AppError(400, `Cannot confirm a ${existing.status} challan`, 'INVALID_STATUS');
            }
            const productIds = existing.items.map(i => i.productId);
            const products = await tx.product.findMany({ where: { id: { in: productIds } } });
            const productMap = new Map(products.map(p => [p.id, p]));
            const shortages = [];
            for (const item of existing.items) {
                const product = productMap.get(item.productId);
                if (product.currentStock < item.quantity) {
                    shortages.push(`${product.name} (available: ${product.currentStock}, requested: ${item.quantity})`);
                }
            }
            if (shortages.length > 0) {
                throw new errorHandler_1.AppError(409, `Insufficient stock for: ${shortages.join('; ')}`, 'INSUFFICIENT_STOCK');
            }
            for (const item of existing.items) {
                const product = productMap.get(item.productId);
                await tx.product.update({
                    where: { id: item.productId },
                    data: { currentStock: product.currentStock - item.quantity },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantityChanged: item.quantity,
                        movementType: 'OUT',
                        reason: `Challan ${existing.challanNumber}`,
                        createdById: req.user.userId,
                    },
                });
            }
            return tx.challan.update({
                where: { id },
                data: { status: 'CONFIRMED' },
                include: {
                    items: true,
                    customer: { select: { id: true, name: true, businessName: true } },
                    createdBy: { select: { id: true, name: true } },
                },
            });
        });
        res.json(challan);
    }
    catch (err) {
        next(err);
    }
});
// POST /challans/:id/cancel — DRAFT only
exports.challansRouter.post('/:id/cancel', (0, authorize_1.authorize)('ADMIN', 'SALES'), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const existing = await prisma_1.default.challan.findUnique({ where: { id } });
        if (!existing)
            throw new errorHandler_1.AppError(404, 'Challan not found', 'NOT_FOUND');
        if (existing.status !== 'DRAFT') {
            throw new errorHandler_1.AppError(400, 'Only DRAFT challans can be cancelled', 'INVALID_STATUS');
        }
        const challan = await prisma_1.default.challan.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });
        res.json(challan);
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=challans.js.map