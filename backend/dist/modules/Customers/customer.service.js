"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summariesFor = summariesFor;
exports.createCustomer = createCustomer;
exports.updateCustomer = updateCustomer;
exports.setCustomerStatus = setCustomerStatus;
exports.listCustomers = listCustomers;
exports.getCustomer = getCustomer;
exports.getStatement = getStatement;
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const statement_1 = require("../../common/utils/statement.js");
const date_1 = require("../../common/utils/date.js");
const ZERO = new client_1.Prisma.Decimal(0);
const sum = (v) => v ?? ZERO;
async function isNameUnique(name) {
    const existingName = await postgres_1.prisma.customer.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
        },
    });
    if (existingName)
        throw new appError_1.default('A customer with this name already exists', 400);
}
async function summariesFor(customers) {
    const result = new Map();
    if (customers.length === 0)
        return result;
    const where = { customerId: { in: customers.map((c) => c.id) } };
    const [sales, payments, returns] = await Promise.all([
        postgres_1.prisma.sale.groupBy({
            by: ['customerId'],
            where,
            _sum: { total: true, paid: true },
        }),
        postgres_1.prisma.payment.groupBy({
            by: ['customerId'],
            where,
            _sum: { amount: true },
        }),
        postgres_1.prisma.saleReturn.groupBy({
            by: ['customerId'],
            where,
            _sum: { total: true, cashRefund: true },
        }),
    ]);
    const saleBy = new Map(sales.map((r) => [r.customerId, r._sum]));
    const paymentBy = new Map(payments.map((r) => [r.customerId, r._sum]));
    const returnBy = new Map(returns.map((r) => [r.customerId, r._sum]));
    for (const c of customers) {
        const totalSales = sum(saleBy.get(c.id)?.total);
        const paidAtSale = sum(saleBy.get(c.id)?.paid);
        const paidLater = sum(paymentBy.get(c.id)?.amount);
        const returned = sum(returnBy.get(c.id)?.total);
        const cashBack = sum(returnBy.get(c.id)?.cashRefund);
        result.set(c.id, {
            openingBalance: c.openingBalance,
            totalSales,
            totalReturns: returned,
            netSales: totalSales.sub(returned),
            totalPaid: paidAtSale.add(paidLater),
            remaining: c.openingBalance
                .add(totalSales)
                .sub(paidAtSale)
                .sub(paidLater)
                .sub(returned)
                .add(cashBack),
        });
    }
    return result;
}
async function createCustomer(input) {
    await isNameUnique(input.name);
    return postgres_1.prisma.customer.create({
        data: {
            name: input.name,
            phone: input.phone,
            openingBalance: input.openingBalance,
        },
    });
}
async function updateCustomer(id, input) {
    const customer = await postgres_1.prisma.customer.findUnique({ where: { id } });
    if (!customer)
        throw new appError_1.default('Customer not found', 404);
    if (input.name !== undefined &&
        input.name.toLowerCase() !== customer.name.toLowerCase()) {
        await isNameUnique(input.name);
    }
    return postgres_1.prisma.customer.update({
        where: { id },
        data: {
            name: input.name,
            phone: input.phone,
            openingBalance: input.openingBalance,
        },
    });
}
async function setCustomerStatus(id, isActive) {
    const customer = await postgres_1.prisma.customer.findUnique({ where: { id } });
    if (!customer)
        throw new appError_1.default('Customer not found', 404);
    return postgres_1.prisma.customer.update({ where: { id }, data: { isActive } });
}
async function listCustomers(q) {
    const where = {};
    if (q.search) {
        where.OR = [
            { name: { contains: q.search, mode: 'insensitive' } },
            { phone: { contains: q.search } },
        ];
    }
    if (q.active !== 'all')
        where.isActive = q.active === 'true';
    if (q.debtors) {
        const candidates = await postgres_1.prisma.customer.findMany({
            where,
            select: { id: true, openingBalance: true },
        });
        const sums = await summariesFor(candidates);
        where.id = {
            in: candidates
                .filter((c) => sums.get(c.id).remaining.gt(0))
                .map((c) => c.id),
        };
    }
    const [total, customers] = await Promise.all([
        postgres_1.prisma.customer.count({ where }),
        postgres_1.prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
        }),
    ]);
    const sums = await summariesFor(customers);
    return {
        customers: customers.map((c) => ({ ...c, ...sums.get(c.id) })),
        total,
    };
}
async function getCustomer(id) {
    const customer = await postgres_1.prisma.customer.findUnique({ where: { id } });
    if (!customer)
        throw new appError_1.default('Customer not found', 404);
    const sums = await summariesFor([customer]);
    return { ...customer, ...sums.get(id) };
}
async function getStatement(id, from, to) {
    const customer = await postgres_1.prisma.customer.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, openingBalance: true },
    });
    if (!customer)
        throw new appError_1.default('Customer not found', 404);
    const [sales, payments, returns] = await Promise.all([
        postgres_1.prisma.sale.findMany({
            where: { customerId: id },
            select: { id: true, date: true, total: true, paid: true, note: true },
        }),
        postgres_1.prisma.payment.findMany({
            where: { customerId: id },
            select: { id: true, date: true, amount: true, note: true },
        }),
        postgres_1.prisma.saleReturn.findMany({
            where: { customerId: id },
            select: {
                id: true,
                date: true,
                total: true,
                cashRefund: true,
                note: true,
            },
        }),
    ]);
    const moves = [
        ...sales.map((s) => ({
            date: s.date,
            type: 'SALE',
            ref: s.id,
            debit: s.total,
            credit: s.paid,
            note: s.note,
        })),
        ...payments.map((p) => ({
            date: p.date,
            type: 'PAYMENT',
            ref: p.id,
            debit: ZERO,
            credit: p.amount,
            note: p.note,
        })),
        ...returns.map((r) => ({
            date: r.date,
            type: 'RETURN',
            ref: r.id,
            debit: r.cashRefund,
            credit: r.total,
            note: r.note,
        })),
    ];
    const result = (0, statement_1.buildStatement)(customer.openingBalance, moves, from ? (0, date_1.cairoStartOfDay)(from) : undefined, to ? (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(to, 1)) : undefined);
    return {
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
        period: { from: from ?? null, to: to ?? null },
        openingBalance: result.opening,
        rows: result.rows,
        totals: result.totals,
        closingBalance: result.closing,
    };
}
