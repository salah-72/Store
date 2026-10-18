"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.staleStockQuery = exports.topItemsQuery = exports.salesByDayQuery = exports.overviewQuery = exports.dashboardQuery = void 0;
const schemas_1 = require("../../common/utils/schemas.js");
const zod_1 = require("zod");
const days = (from, to) => (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
    86_400_000 +
    1;
const fromBeforeTo = {
    message: '"from" must not be after "to"',
    path: ['from'],
};
exports.dashboardQuery = zod_1.z.object({
    expiryDays: zod_1.z.coerce.number().int().min(1).max(365).default(60), // "near expiry" = expires within this many days
});
exports.overviewQuery = zod_1.z
    .object({ from: schemas_1.ymd.optional(), to: schemas_1.ymd.optional() })
    .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo);
exports.salesByDayQuery = zod_1.z
    .object({ from: schemas_1.ymd.optional(), to: schemas_1.ymd.optional() })
    .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo)
    .refine((q) => !q.from || !q.to || days(q.from, q.to) <= 366, {
    message: 'The range can not be longer than 366 days',
    path: ['to'],
});
exports.topItemsQuery = zod_1.z
    .object({
    from: schemas_1.ymd.optional(),
    to: schemas_1.ymd.optional(),
    by: zod_1.z.enum(['revenue', 'quantity']).default('revenue'),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
})
    .refine((q) => !q.from || !q.to || q.from <= q.to, fromBeforeTo);
exports.staleStockQuery = zod_1.z.object({
    days: zod_1.z.coerce.number().int().min(7).max(730).default(90),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(30),
});
