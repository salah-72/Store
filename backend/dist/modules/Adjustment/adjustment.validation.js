"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdjustmentsQuery = exports.updateAdjustmentSchema = exports.createAdjustmentSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const date_1 = require("../../common/utils/date.js");
const positiveInt = zod_1.z.coerce.number().int().positive();
const reason = zod_1.z.string().trim().min(1, 'Reason is required').max(150);
exports.createAdjustmentSchema = zod_1.z
    .object({
    batchId: positiveInt,
    baseQty: positiveInt.max(2_000_000_000),
    reason: reason.default(date_1.ADJUSTMENT_REASON.DAMAGED),
    date: schemas_1.ymd.optional(),
})
    .strict();
exports.updateAdjustmentSchema = zod_1.z
    .object({ reason: reason.optional(), date: schemas_1.ymd.optional() })
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listAdjustmentsQuery = schemas_1.pagination
    .extend({
    itemId: positiveInt.optional(),
    batchId: positiveInt.optional(),
    reason: zod_1.z.string().trim().max(100).optional(),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
