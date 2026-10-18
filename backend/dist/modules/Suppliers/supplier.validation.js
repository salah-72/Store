"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.statementQuery = exports.listSuppliersQuery = exports.setSupplierStatusSchema = exports.updateSupplierSchema = exports.createSupplierSchema = exports.idParam = void 0;
const z = __importStar(require("zod"));
const schemas_1 = require("../../common/utils/schemas");
const name = z.string().trim().min(1, 'Name is required').max(100);
exports.idParam = z.object({ id: z.coerce.number().int().min(1) });
const fields = {
    name,
    phone: schemas_1.phone,
    openingBalance: schemas_1.signedMoney,
};
exports.createSupplierSchema = z
    .object({
    ...fields,
    phone: schemas_1.phone.default(''),
    openingBalance: schemas_1.signedMoney.default(0),
})
    .strict();
exports.updateSupplierSchema = z
    .object(fields)
    .partial()
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.setSupplierStatusSchema = z
    .object({
    isActive: z.boolean(),
})
    .strict();
exports.listSuppliersQuery = schemas_1.pagination.extend({
    search: z.string().trim().max(100).optional(),
    active: z.enum(['true', 'false', 'all']).default('true'),
    owed: z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
exports.statementQuery = z
    .object({ from: schemas_1.ymd.optional(), to: schemas_1.ymd.optional() })
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
