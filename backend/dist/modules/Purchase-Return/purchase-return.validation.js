"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.purchaseIdParam = exports.listPurchaseReturnsQuery = exports.updatePurchaseReturnSchema = exports.createPurchaseReturnSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const positiveInt = zod_1.z.coerce.number().int().positive();
const qty = zod_1.z.coerce.number().int().positive().max(2_000_000_000);
const invoiceLine = zod_1.z
    .object({ purchaseLineId: positiveInt, baseQty: qty })
    .strict();
exports.createPurchaseReturnSchema = zod_1.z
    .object({
    purchaseId: positiveInt,
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    cashRefund: schemas_1.money.optional(),
    lines: zod_1.z
        .array(invoiceLine)
        .min(1, 'At least one line is required')
        .max(100),
})
    .strict();
exports.updatePurchaseReturnSchema = zod_1.z
    .object({
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    cashRefund: schemas_1.money.optional(),
})
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listPurchaseReturnsQuery = schemas_1.pagination
    .extend({
    supplierId: positiveInt.optional(),
    purchaseId: positiveInt.optional(),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
exports.purchaseIdParam = zod_1.z.object({ purchaseId: positiveInt });
