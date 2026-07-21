import { Request, Response, NextFunction } from 'express';
export declare function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void;
export declare class AppError extends Error {
    readonly statusCode: number;
    readonly code: string;
    constructor(statusCode: number, message: string, code: string);
}
//# sourceMappingURL=errorHandler.d.ts.map