"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPurchasesQuery = exports.updatePurchaseSchema = exports.createPurchaseSchema = exports.purchaseLineSchema = void 0;
const schemas_1 = require("../../common/utils/schemas.js");
const zod_1 = require("zod");
const positiveInt = zod_1.z.coerce.number().int().positive();
exports.purchaseLineSchema = zod_1.z
    .object({
    itemId: positiveInt,
    packs: zod_1.z.coerce.number().positive().max(1_000_000).optional(),
    baseQty: zod_1.z.coerce.number().int().positive().max(2_000_000_000).optional(),
    lineTotal: schemas_1.money,
    expiryDate: schemas_1.ymd
        .refine((v) => v <= '2100-12-31', 'Expiry date is too far in the future')
        .nullable(),
})
    .strict()
    .refine((l) => (l.packs === undefined) !== (l.baseQty === undefined), {
    message: 'Send either "packs" or "baseQty" (not both)',
    path: ['packs'],
});
exports.createPurchaseSchema = zod_1.z
    .object({
    supplierId: positiveInt,
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    paid: schemas_1.money.default(0),
    discount: schemas_1.money.default(0),
    lines: zod_1.z
        .array(exports.purchaseLineSchema)
        .min(1, 'At least one line is required')
        .max(100),
})
    .strict();
exports.updatePurchaseSchema = zod_1.z
    .object({
    supplierId: positiveInt.optional(),
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    paid: schemas_1.money.optional(),
    discount: schemas_1.money.optional(),
    lines: zod_1.z
        .array(exports.purchaseLineSchema)
        .min(1, 'At least one line is required')
        .max(100)
        .optional(),
})
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listPurchasesQuery = schemas_1.pagination
    .extend({
    supplierId: positiveInt.optional(),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
