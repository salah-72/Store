"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.phone = exports.ymd = exports.signedMoney = exports.money = exports.pageMeta = exports.pagination = void 0;
const zod_1 = require("zod");
exports.pagination = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
const pageMeta = (total, page, limit) => ({
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
});
exports.pageMeta = pageMeta;
const round2 = (v) => Math.round(v * 100) / 100;
exports.money = zod_1.z.coerce
    .number()
    .min(0)
    .max(9_999_999.99)
    .transform(round2);
exports.signedMoney = zod_1.z.coerce
    .number()
    .min(-9_999_999.99)
    .max(9_999_999.99)
    .transform(round2);
exports.ymd = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
    .refine((v) => {
    const t = Date.parse(`${v}T00:00:00Z`);
    return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
}, 'Invalid date');
exports.phone = zod_1.z.string().trim().max(30);
