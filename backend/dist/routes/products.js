"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.productsRouter = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = __importDefault(require("../lib/prisma"));
const authenticate_1 = require("../middleware/authenticate");
const authorize_1 = require("../middleware/authorize");
const errorHandler_1 = require("../middleware/errorHandler");
const queryHelper_1 = require("../lib/queryHelper");
exports.productsRouter = (0, express_1.Router)();
exports.productsRouter.use(authenticate_1.authenticate);
const productSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    sku: zod_1.z.string().min(1),
    category: zod_1.z.string().min(1),
    unitPrice: zod_1.z.number().positive(),
    currentStock: zod_1.z.number().int().min(0).default(0),
    minStockAlert: zod_1.z.number().int().min(0).default(5),
    location: zod_1.z.string().optional(),
});
const stockMovementSchema = zod_1.z.object({
    movementType: zod_1.z.enum(['IN', 'OUT']),
    quantityChanged: zod_1.z.number().int().positive(),
    reason: zod_1.z.string().min(1),
});
// POST /products — Admin, Warehouse
exports.productsRouter.post('/', (0, authorize_1.authorize)('ADMIN', 'WAREHOUSE'), async (req, res, next) => {
    try {
        const data = productSchema.parse(req.body);
        const product = await prisma_1.default.product.create({ data });
        res.status(201).json(product);
    }
    catch (err) {
        next(err);
    }
});
// GET /products
exports.productsRouter.get('/', async (req, res, next) => {
    try {
        const page = parseInt((0, queryHelper_1.qs)(req.query.page) ?? '1') || 1;
        const limit = parseInt((0, queryHelper_1.qs)(req.query.limit) ?? '20') || 20;
        const search = (0, queryHelper_1.qs)(req.query.search);
        const lowStock = (0, queryHelper_1.qs)(req.query.lowStock) === 'true';
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { category: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [products, total] = await Promise.all([
            prisma_1.default.product.findMany({
                where,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { name: 'asc' },
            }),
            prisma_1.default.product.count({ where }),
        ]);
        // Apply low-stock filter in app layer
        const filteredProducts = lowStock
            ? products.filter(p => p.currentStock <= p.minStockAlert)
            : products;
        res.json({ products: filteredProducts, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
// GET /products/:id
exports.productsRouter.get('/:id', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const product = await prisma_1.default.product.findUnique({
            where: { id },
            include: {
                stockMovements: {
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                    include: { createdBy: { select: { id: true, name: true, role: true } } },
                },
            },
        });
        if (!product)
            throw new errorHandler_1.AppError(404, 'Product not found', 'NOT_FOUND');
        res.json(product);
    }
    catch (err) {
        next(err);
    }
});
// PUT /products/:id — Admin, Warehouse
exports.productsRouter.put('/:id', (0, authorize_1.authorize)('ADMIN', 'WAREHOUSE'), async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const data = productSchema.parse(req.body);
        const product = await prisma_1.default.product.update({
            where: { id },
            data,
        });
        res.json(product);
    }
    catch (err) {
        next(err);
    }
});
// POST /products/:id/stock-movements — Admin, Warehouse
exports.productsRouter.post('/:id/stock-movements', (0, authorize_1.authorize)('ADMIN', 'WAREHOUSE'), async (req, res, next) => {
    try {
        const { movementType, quantityChanged, reason } = stockMovementSchema.parse(req.body);
        const id = String(req.params.id);
        const result = await prisma_1.default.$transaction(async (tx) => {
            const product = await tx.product.findUniqueOrThrow({
                where: { id },
            });
            if (movementType === 'OUT' && product.currentStock < quantityChanged) {
                throw new errorHandler_1.AppError(409, `Insufficient stock. Available: ${product.currentStock}, requested: ${quantityChanged}`, 'INSUFFICIENT_STOCK');
            }
            const updatedProduct = await tx.product.update({
                where: { id },
                data: {
                    currentStock: movementType === 'IN'
                        ? product.currentStock + quantityChanged
                        : product.currentStock - quantityChanged,
                },
            });
            const movement = await tx.stockMovement.create({
                data: {
                    productId: id,
                    quantityChanged,
                    movementType,
                    reason,
                    createdById: req.user.userId,
                },
                include: { createdBy: { select: { id: true, name: true, role: true } } },
            });
            return { product: updatedProduct, movement };
        });
        res.status(201).json(result);
    }
    catch (err) {
        next(err);
    }
});
// GET /products/:id/stock-movements
exports.productsRouter.get('/:id/stock-movements', async (req, res, next) => {
    try {
        const id = String(req.params.id);
        const page = parseInt((0, queryHelper_1.qs)(req.query.page) ?? '1') || 1;
        const limit = parseInt((0, queryHelper_1.qs)(req.query.limit) ?? '20') || 20;
        const [movements, total] = await Promise.all([
            prisma_1.default.stockMovement.findMany({
                where: { productId: id },
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: { createdBy: { select: { id: true, name: true, role: true } } },
            }),
            prisma_1.default.stockMovement.count({ where: { productId: id } }),
        ]);
        res.json({ movements, total, page, limit, pages: Math.ceil(total / limit) });
    }
    catch (err) {
        next(err);
    }
});
//# sourceMappingURL=products.js.map