"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statementQuery = exports.listCustomersQuery = exports.setCustomerStatusSchema = exports.updateCustomerSchema = exports.createCustomerSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const name = zod_1.z.string().trim().min(1, 'Name is required').max(150);
const fields = {
    name,
    phone: schemas_1.phone,
    openingBalance: schemas_1.signedMoney,
};
exports.createCustomerSchema = zod_1.z
    .object({
    ...fields,
    phone: schemas_1.phone.default(''),
    openingBalance: schemas_1.signedMoney.default(0),
})
    .strict();
exports.updateCustomerSchema = zod_1.z
    .object(fields)
    .partial()
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.setCustomerStatusSchema = zod_1.z
    .object({
    isActive: zod_1.z.boolean(),
})
    .strict();
exports.listCustomersQuery = schemas_1.pagination.extend({
    search: zod_1.z.string().trim().max(100).optional(),
    active: zod_1.z.enum(['true', 'false', 'all']).default('true'),
    debtors: zod_1.z
        .enum(['true', 'false'])
        .optional()
        .transform((v) => v === 'true'),
});
exports.statementQuery = zod_1.z
    .object({ from: schemas_1.ymd.optional(), to: schemas_1.ymd.optional() })
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
