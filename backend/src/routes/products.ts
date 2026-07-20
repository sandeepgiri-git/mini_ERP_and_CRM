import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { AppError } from '../middleware/errorHandler';
import { qs } from '../lib/queryHelper';

export const productsRouter = Router();
productsRouter.use(authenticate);

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().min(1),
  unitPrice: z.number().positive(),
  currentStock: z.number().int().min(0).default(0),
  minStockAlert: z.number().int().min(0).default(5),
  location: z.string().optional(),
});

const stockMovementSchema = z.object({
  movementType: z.enum(['IN', 'OUT']),
  quantityChanged: z.number().int().positive(),
  reason: z.string().min(1),
});

// POST /products — Admin, Warehouse
productsRouter.post('/', authorize('ADMIN', 'WAREHOUSE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = productSchema.parse(req.body);
    const product = await prisma.product.create({ data });
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

// GET /products
productsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(qs(req.query.page) ?? '1') || 1;
    const limit = parseInt(qs(req.query.limit) ?? '20') || 20;
    const search = qs(req.query.search);
    const lowStock = qs(req.query.lowStock) === 'true';

    const where: Prisma.ProductWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.product.count({ where }),
    ]);

    // Apply low-stock filter in app layer
    const filteredProducts = lowStock
      ? products.filter(p => p.currentStock <= p.minStockAlert)
      : products;

    res.json({ products: filteredProducts, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /products/:id
productsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!product) throw new AppError(404, 'Product not found', 'NOT_FOUND');
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// PUT /products/:id — Admin, Warehouse
productsRouter.put('/:id', authorize('ADMIN', 'WAREHOUSE'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = productSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id },
      data,
    });
    res.json(product);
  } catch (err) {
    next(err);
  }
});

// POST /products/:id/stock-movements — Admin, Warehouse
productsRouter.post(
  '/:id/stock-movements',
  authorize('ADMIN', 'WAREHOUSE'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { movementType, quantityChanged, reason } = stockMovementSchema.parse(req.body);
      const id = String(req.params.id);

      const result = await prisma.$transaction(async (tx) => {
        const product = await tx.product.findUniqueOrThrow({
          where: { id },
        });

        if (movementType === 'OUT' && product.currentStock < quantityChanged) {
          throw new AppError(
            409,
            `Insufficient stock. Available: ${product.currentStock}, requested: ${quantityChanged}`,
            'INSUFFICIENT_STOCK'
          );
        }

        const updatedProduct = await tx.product.update({
          where: { id },
          data: {
            currentStock:
              movementType === 'IN'
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
            createdById: req.user!.userId,
          },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        });

        return { product: updatedProduct, movement };
      });

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /products/:id/stock-movements
productsRouter.get('/:id/stock-movements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const page = parseInt(qs(req.query.page) ?? '1') || 1;
    const limit = parseInt(qs(req.query.limit) ?? '20') || 20;

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where: { productId: id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true, role: true } } },
      }),
      prisma.stockMovement.count({ where: { productId: id } }),
    ]);

    res.json({ movements, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});
