import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
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
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
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

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}
