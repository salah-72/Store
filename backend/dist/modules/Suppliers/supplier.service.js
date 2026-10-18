"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summariesFor = summariesFor;
exports.createSupplierService = createSupplierService;
exports.updateSupplierService = updateSupplierService;
exports.setSupplierStatusService = setSupplierStatusService;
exports.listSuppliers = listSuppliers;
exports.getSupplier = getSupplier;
exports.getStatement = getStatement;
const postgres_1 = require("../../config/postgres.js");
const statement_1 = require("../../common/utils/statement");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const date_1 = require("../../common/utils/date.js");
const ZERO = new client_1.Prisma.Decimal(0);
const sum = (v) => v ?? ZERO;
async function isNameUnique(name) {
    const existingName = await postgres_1.prisma.supplier.findFirst({
        where: {
            name: { equals: name, mode: 'insensitive' },
        },
    });
    if (existingName)
        throw new appError_1.default('A supplier with this name already exists', 400);
}
async function summariesFor(suppliers) {
    const result = new Map();
    if (suppliers.length === 0)
        return result;
    const where = { supplierId: { in: suppliers.map((s) => s.id) } };
    const [purchases, payments, returns] = await Promise.all([
        postgres_1.prisma.purchase.groupBy({
            by: ['supplierId'],
            where,
            _sum: { total: true, paid: true },
        }),
        postgres_1.prisma.payment.groupBy({
            by: ['supplierId'],
            where,
            _sum: { amount: true },
        }),
        postgres_1.prisma.purchaseReturn.groupBy({
            by: ['supplierId'],
            where,
            _sum: { total: true, cashRefund: true },
        }),
    ]);
    const purchaseBy = new Map(purchases.map((r) => [r.supplierId, r._sum]));
    const paymentBy = new Map(payments.map((r) => [r.supplierId, r._sum]));
    const returnBy = new Map(returns.map((r) => [r.supplierId, r._sum]));
    for (const s of suppliers) {
        const totalPurchases = sum(purchaseBy.get(s.id)?.total);
        const paidAtPurchase = sum(purchaseBy.get(s.id)?.paid);
        const paidLater = sum(paymentBy.get(s.id)?.amount);
        const returned = sum(returnBy.get(s.id)?.total);
        const cashBack = sum(returnBy.get(s.id)?.cashRefund);
        result.set(s.id, {
            openingBalance: s.openingBalance,
            totalPurchases,
            totalReturns: returned,
            netPurchases: totalPurchases.sub(returned),
            totalPaid: paidAtPurchase.add(paidLater),
            remaining: s.openingBalance
                .add(totalPurchases)
                .sub(paidAtPurchase)
                .sub(paidLater)
                .sub(returned)
                .add(cashBack),
        });
    }
    return result;
}
async function createSupplierService(input) {
    await isNameUnique(input.name);
    return await postgres_1.prisma.supplier.create({
        data: {
            name: input.name,
            phone: input.phone,
            openingBalance: input.openingBalance,
        },
    });
}
async function updateSupplierService(id, input) {
    const supplier = await postgres_1.prisma.supplier.findUnique({
        where: { id },
    });
    if (!supplier) {
        throw new appError_1.default('Supplier not found', 404);
    }
    if (input.name !== undefined &&
        input.name.toLowerCase() !== supplier.name.toLowerCase()) {
        await isNameUnique(input.name);
    }
    return postgres_1.prisma.supplier.update({
        where: { id },
        data: {
            name: input.name,
            phone: input.phone,
            openingBalance: input.openingBalance,
        },
    });
}
async function setSupplierStatusService(id, isActive) {
    const supplier = await postgres_1.prisma.supplier.findUnique({
        where: { id },
    });
    if (!supplier) {
        throw new appError_1.default('Supplier not found', 404);
    }
    return postgres_1.prisma.supplier.update({
        where: { id },
        data: {
            isActive,
        },
    });
}
async function listSuppliers(q) {
    const where = {};
    if (q.search) {
        where.OR = [
            { name: { contains: q.search, mode: 'insensitive' } },
            { phone: { contains: q.search } },
        ];
    }
    if (q.active !== 'all')
        where.isActive = q.active === 'true';
    if (q.owed) {
        const candidates = await postgres_1.prisma.supplier.findMany({
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
    const [total, suppliers] = await Promise.all([
        postgres_1.prisma.supplier.count({ where }),
        postgres_1.prisma.supplier.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
        }),
    ]);
    const sums = await summariesFor(suppliers);
    return {
        suppliers: suppliers.map((s) => ({ ...s, ...sums.get(s.id) })),
        total,
    };
}
async function getSupplier(id) {
    const supplier = await postgres_1.prisma.supplier.findUnique({ where: { id } });
    if (!supplier)
        throw new appError_1.default('Supplier not found', 404);
    const sums = await summariesFor([supplier]);
    return { ...supplier, ...sums.get(id) };
}
async function getStatement(id, from, to) {
    const supplier = await postgres_1.prisma.supplier.findUnique({
        where: { id },
        select: { id: true, name: true, phone: true, openingBalance: true },
    });
    if (!supplier)
        throw new appError_1.default('Supplier not found', 404);
    const [purchases, payments, returns] = await Promise.all([
        postgres_1.prisma.purchase.findMany({
            where: { supplierId: id },
            select: { id: true, date: true, total: true, paid: true, note: true },
        }),
        postgres_1.prisma.payment.findMany({
            where: { supplierId: id },
            select: { id: true, date: true, amount: true, note: true },
        }),
        postgres_1.prisma.purchaseReturn.findMany({
            where: { supplierId: id },
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
        ...purchases.map((p) => ({
            date: p.date,
            type: 'PURCHASE',
            ref: p.id,
            debit: p.total,
            credit: p.paid,
            note: p.note,
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
    const result = (0, statement_1.buildStatement)(supplier.openingBalance, moves, from ? (0, date_1.cairoStartOfDay)(from) : undefined, to ? (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(to, 1)) : undefined);
    return {
        supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone },
        period: { from: from ?? null, to: to ?? null },
        openingBalance: result.opening,
        rows: result.rows,
        totals: result.totals,
        closingBalance: result.closing,
    };
}
