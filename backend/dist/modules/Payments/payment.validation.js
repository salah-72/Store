"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPaymentsQuery = exports.updatePaymentSchema = exports.createPaymentSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const positiveInt = zod_1.z.coerce.number().int().positive();
const amount = schemas_1.money.refine((v) => v > 0, 'Amount must be greater than zero');
exports.createPaymentSchema = zod_1.z
    .object({
    customerId: positiveInt.optional(),
    supplierId: positiveInt.optional(),
    amount,
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
})
    .strict()
    .refine((v) => (v.customerId === undefined) !== (v.supplierId === undefined), {
    message: 'Send exactly one of customerId or supplierId',
    path: ['customerId'],
});
exports.updatePaymentSchema = zod_1.z
    .object({
    amount: amount.optional(),
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
})
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listPaymentsQuery = schemas_1.pagination
    .extend({
    customerId: positiveInt.optional(),
    supplierId: positiveInt.optional(),
    type: zod_1.z.enum(['customer', 'supplier']).optional(),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
})
    .refine((q) => !(q.customerId && q.supplierId), {
    message: 'Use either customerId or supplierId, not both',
    path: ['supplierId'],
})
    .refine((q) => !(q.type === 'customer' && q.supplierId) &&
    !(q.type === 'supplier' && q.customerId), {
    message: '"type" does not match the id you sent',
    path: ['type'],
});
