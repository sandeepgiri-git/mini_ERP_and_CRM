"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = authorize;
function authorize(...roles) {
    return (req, res, next) => {
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
//# sourceMappingURL=authorize.js.map