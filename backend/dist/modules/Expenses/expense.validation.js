"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listExpensesQuery = exports.updateExpenseSchema = exports.createExpenseSchema = void 0;
const zod_1 = require("zod");
const schemas_1 = require("../../common/utils/schemas");
const amount = schemas_1.money.refine((v) => v > 0, 'Amount must be greater than zero');
const category = zod_1.z
    .string()
    .trim()
    .min(1, 'Category is required')
    .max(50)
    .transform((s) => s.replace(/\s+/g, ' '));
exports.createExpenseSchema = zod_1.z.object({
    category,
    amount,
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
});
exports.updateExpenseSchema = zod_1.z
    .object({
    category: category.optional(),
    amount: amount.optional(),
    date: schemas_1.ymd.optional(),
    note: zod_1.z.string().trim().max(500).nullable().optional(),
})
    .strict()
    .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
exports.listExpensesQuery = schemas_1.pagination
    .extend({
    category: zod_1.z.string().trim().max(50).optional(),
    search: zod_1.z.string().trim().max(100).optional(),
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, {
    message: '"from" must not be after "to"',
    path: ['from'],
});
