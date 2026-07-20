import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/authenticate';
import { AppError } from '../middleware/errorHandler';
import { qs } from '../lib/queryHelper';

export const customersRouter = Router();
customersRouter.use(authenticate);

const customerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(6),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  customerType: z.enum(['RETAIL', 'WHOLESALE', 'DISTRIBUTOR']),
  address: z.string().optional(),
  status: z.enum(['LEAD', 'ACTIVE', 'INACTIVE']).default('LEAD'),
  followUpDate: z.string().datetime().optional().or(z.literal('')),
});

const noteSchema = z.object({
  note: z.string().min(1),
  followUpDate: z.string().datetime().optional().or(z.literal('')),
});

// POST /customers
customersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.create({
      data: {
        ...data,
        email: data.email || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

// GET /customers
customersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(qs(req.query.page) ?? '1') || 1;
    const limit = parseInt(qs(req.query.limit) ?? '20') || 20;
    const search = qs(req.query.search);
    const status = qs(req.query.status);
    const customerType = qs(req.query.customerType);

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status as Prisma.EnumCustomerStatusFilter['equals'];
    if (customerType) where.customerType = customerType as Prisma.EnumCustomerTypeFilter['equals'];

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({ customers, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// GET /customers/:id
customersRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { createdBy: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// PUT /customers/:id
customersRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const data = customerSchema.parse(req.body);
    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        followUpDate: data.followUpDate ? new Date(data.followUpDate) : null,
      },
    });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

// POST /customers/:id/notes
customersRouter.post('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { note, followUpDate } = noteSchema.parse(req.body);

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) throw new AppError(404, 'Customer not found', 'NOT_FOUND');

    const [newNote] = await prisma.$transaction([
      prisma.customerNote.create({
        data: {
          customerId: id,
          note,
          createdById: req.user!.userId,
        },
        include: { createdBy: { select: { id: true, name: true, role: true } } },
      }),
      ...(followUpDate
        ? [prisma.customer.update({
            where: { id },
            data: { followUpDate: new Date(followUpDate) },
          })]
        : []),
    ]);

    res.status(201).json(newNote);
  } catch (err) {
    next(err);
  }
});
