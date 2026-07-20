import { Request, Response, NextFunction } from 'express';

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: { message: 'Authentication required', code: 'UNAUTHENTICATED' } });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          message: `Access denied. Required roles: ${roles.join(', ')}`,
          code: 'FORBIDDEN',
        },
      });
      return;
    }

    next();
  };
}
