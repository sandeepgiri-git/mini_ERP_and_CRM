import { Request, Response, NextFunction } from 'express';
export interface AuthPayload {
    userId: string;
    role: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: AuthPayload;
        }
    }
}
export declare function authenticate(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=authenticate.d.ts.map