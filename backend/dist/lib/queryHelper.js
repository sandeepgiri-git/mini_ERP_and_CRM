"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qs = qs;
// Helper to safely cast query param to string
function qs(param) {
    if (typeof param === 'string')
        return param || undefined;
    if (Array.isArray(param))
        return param[0] || undefined;
    return undefined;
}
//# sourceMappingURL=queryHelper.js.map