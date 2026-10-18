"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSalesQuery = exports.updateSaleSchema = exports.createSaleSchema = exports.saleLineSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const positiveInt = zod_1.z.coerce.number().int().positive();
exports.saleLineSchema = zod_1.z
    .object({
    itemId: positiveInt,
    baseQty: zod_1.z.coerce.number().int().positive().max(2_000_000_000),
    price: schemas_1.money.optional(),
    lineTotal: schemas_1.money.optional(),
})
    .strict()
    .refine((l) => l.price === undefined || l.lineTotal === undefined, {
    message: 'Send either "price" or "lineTotal", not both',
    path: ['price'],
});
exports.createSaleSchema = zod_1.z
    .object({
    customerId: positiveInt.nullable().optional(),
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    discount: schemas_1.money.default(0),
    paid: schemas_1.money.optional(),
    lines: zod_1.z
        .array(exports.saleLineSchema)
        .min(1, 'At least one line is required')
        .max(100),
})
    .strict();
exports.updateSaleSchema = zod_1.z
    .object({
    customerId: positiveInt.nullable().optional(),
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
    discount: schemas_1.money.optional(),
    paid: schemas_1.money.optional(),
    lines: zod_1.z
        .array(exports.saleLineSchema)
        .min(1, 'At least one line is required')
        .max(100)
        .optional(),
})
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listSalesQuery = schemas_1.pagination
    .extend({
    customerId: positiveInt.optional(),
    cash: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
})
    .refine((q) => !(q.cash && q.customerId), {
    message: 'Use either "cash" or "customerId", not both',
    path: ['cash'],
});
