"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayment = getPayment;
exports.createPayment = createPayment;
exports.updatePayment = updatePayment;
exports.deletePayment = deletePayment;
exports.listPayments = listPayments;
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const date_1 = require("../../common/utils/date.js");
const customer_service_1 = require("../Customers/customer.service");
const supplier_service_1 = require("../Suppliers/supplier.service");
const client_1 = require("@prisma/client");
const directionOf = (p) => p.customerId !== null
    ? { type: 'CUSTOMER', direction: 'IN' }
    : { type: 'SUPPLIER', direction: 'OUT' };
async function getPayment(id) {
    const row = await postgres_1.prisma.payment.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            supplier: { select: { id: true, name: true, phone: true } },
        },
    });
    if (!row)
        throw new appError_1.default('Payment not found', 404);
    const { customer, supplier, ...p } = row;
    const currentBalance = p.customerId !== null
        ? (await (0, customer_service_1.getCustomer)(p.customerId)).remaining
        : (await (0, supplier_service_1.getSupplier)(p.supplierId)).remaining;
    return {
        ...p,
        ...directionOf(row),
        party: customer ?? supplier,
        currentBalance,
        hasCredit: currentBalance.lt(0),
    };
}
async function createPayment(input) {
    if (input.customerId !== undefined) {
        const c = await postgres_1.prisma.customer.findUnique({
            where: { id: input.customerId },
            select: { id: true },
        });
        if (!c)
            throw new appError_1.default('Customer not found', 404);
    }
    else {
        const s = await postgres_1.prisma.supplier.findUnique({
            where: { id: input.supplierId },
            select: { id: true },
        });
        if (!s)
            throw new appError_1.default('Supplier not found', 404);
    }
    const payment = await postgres_1.prisma.payment.create({
        data: {
            customerId: input.customerId ?? null,
            supplierId: input.supplierId ?? null,
            amount: input.amount,
            date: (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Payment date'),
            note: input.note?.trim() || null,
        },
    });
    return getPayment(payment.id);
}
async function updatePayment(id, input) {
    const current = await postgres_1.prisma.payment.findUnique({
        where: { id },
        select: { date: true },
    });
    if (!current)
        throw new appError_1.default('Payment not found', 404);
    await postgres_1.prisma.payment.update({
        where: { id },
        data: {
            amount: input.amount,
            note: input.note === undefined ? undefined : input.note?.trim() || null,
            date: input.date && input.date !== (0, date_1.cairoDay)(current.date)
                ? (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Payment date')
                : undefined,
        },
    });
    return getPayment(id);
}
async function deletePayment(id) {
    const r = await postgres_1.prisma.payment.deleteMany({ where: { id } });
    if (r.count === 0)
        throw new appError_1.default('Payment not found', 404);
}
const ZERO = new client_1.Prisma.Decimal(0);
async function listPayments(q) {
    const where = {};
    if (q.customerId)
        where.customerId = q.customerId;
    if (q.supplierId)
        where.supplierId = q.supplierId;
    if (q.type === 'customer' && !q.customerId)
        where.customerId = { not: null };
    if (q.type === 'supplier' && !q.supplierId)
        where.supplierId = { not: null };
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}), // the whole "to" day
        };
    }
    const [total, rows, sum] = await Promise.all([
        postgres_1.prisma.payment.count({ where }),
        postgres_1.prisma.payment.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
            include: {
                customer: { select: { id: true, name: true } },
                supplier: { select: { id: true, name: true } },
            },
        }),
        postgres_1.prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);
    return {
        payments: rows.map((row) => {
            const { customer, supplier, ...p } = row;
            return { ...p, ...directionOf(row), party: customer ?? supplier };
        }),
        total,
        amount: sum._sum.amount ?? ZERO,
    };
}
