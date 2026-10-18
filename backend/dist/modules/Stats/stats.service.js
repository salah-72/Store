"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.getSalesByDay = getSalesByDay;
exports.getTopItems = getTopItems;
exports.getStaleStock = getStaleStock;
exports.getDashboard = getDashboard;
const date_1 = require("../../common/utils/date.js");
const stats_helpers_1 = require("./stats.helpers");
const postgres_1 = require("../../config/postgres.js");
const client_1 = require("@prisma/client");
const supplier_service_1 = require("../Suppliers/supplier.service");
const customer_service_1 = require("../Customers/customer.service");
const ZERO = new client_1.Prisma.Decimal(0);
const sum = (v) => v ?? ZERO;
const rangeOf = (from, to) => ({
    gte: (0, date_1.cairoStartOfDay)(from),
    lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(to, 1)),
});
async function costByBatch(ids) {
    const map = new Map();
    if (ids.length === 0)
        return map;
    const rows = await postgres_1.prisma.batch.findMany({
        where: { id: { in: ids } },
        select: { id: true, unitCost: true },
    });
    for (const b of rows)
        map.set(b.id, b.unitCost);
    return map;
}
async function fetchOverviewData(from, to) {
    const date = rangeOf(from, to);
    const [sales, saleReturns, purchases, purchaseReturns, expenses, byCategory, customerPay, supplierPay, soldCost, returnedLines, writtenOff,] = await Promise.all([
        postgres_1.prisma.sale.aggregate({
            where: { date },
            _sum: { total: true, discount: true, paid: true },
            _count: { _all: true },
        }),
        postgres_1.prisma.saleReturn.aggregate({
            where: { date },
            _sum: { total: true, cashRefund: true },
        }),
        postgres_1.prisma.purchase.aggregate({
            where: { date },
            _sum: { total: true, discount: true, paid: true },
            _count: { _all: true },
        }),
        postgres_1.prisma.purchaseReturn.aggregate({
            where: { date },
            _sum: { total: true, cashRefund: true },
        }),
        postgres_1.prisma.expense.aggregate({ where: { date }, _sum: { amount: true } }),
        postgres_1.prisma.expense.groupBy({
            by: ['category'],
            where: { date },
            _sum: { amount: true },
            _count: { _all: true },
            orderBy: { _sum: { amount: 'desc' } },
        }),
        postgres_1.prisma.payment.aggregate({
            where: { date, customerId: { not: null } },
            _sum: { amount: true },
        }),
        postgres_1.prisma.payment.aggregate({
            where: { date, supplierId: { not: null } },
            _sum: { amount: true },
        }),
        postgres_1.prisma.saleLineBatch.groupBy({
            by: ['unitCost'],
            where: { saleLine: { sale: { date } } },
            _sum: { baseQty: true },
        }),
        postgres_1.prisma.saleReturnLine.groupBy({
            by: ['batchId'],
            where: { saleReturn: { date } },
            _sum: { baseQty: true },
        }),
        postgres_1.prisma.stockAdjustment.groupBy({
            by: ['batchId'],
            where: { date },
            _sum: { baseQty: true },
        }),
    ]);
    const costs = await costByBatch([
        ...returnedLines.map((r) => r.batchId),
        ...writtenOff.map((w) => w.batchId),
    ]);
    const costOfBatches = (rows) => (0, stats_helpers_1.costOf)(rows.map((r) => ({
        unitCost: costs.get(r.batchId) ?? ZERO,
        qty: r._sum.baseQty ?? 0,
    })));
    return {
        sales: {
            count: sales._count._all,
            total: sum(sales._sum.total),
            discount: sum(sales._sum.discount),
            paid: sum(sales._sum.paid),
        },
        saleReturns: {
            total: sum(saleReturns._sum.total),
            cashRefund: sum(saleReturns._sum.cashRefund),
        },
        purchases: {
            count: purchases._count._all,
            total: sum(purchases._sum.total),
            discount: sum(purchases._sum.discount),
            paid: sum(purchases._sum.paid),
        },
        purchaseReturns: {
            total: sum(purchaseReturns._sum.total),
            cashRefund: sum(purchaseReturns._sum.cashRefund),
        },
        expenses: {
            total: sum(expenses._sum.amount),
            byCategory: byCategory.map((r) => ({
                category: r.category,
                amount: sum(r._sum.amount),
                count: r._count._all,
            })),
        },
        customerPayments: sum(customerPay._sum.amount),
        supplierPayments: sum(supplierPay._sum.amount),
        costSold: (0, stats_helpers_1.costOf)(soldCost.map((g) => ({ unitCost: g.unitCost, qty: g._sum.baseQty ?? 0 }))),
        costReturned: costOfBatches(returnedLines),
        writeOffCost: costOfBatches(writtenOff),
    };
}
async function getOverview(from, to) {
    const today = (0, date_1.cairoToday)();
    const start = from ?? (0, stats_helpers_1.monthStart)(today);
    const end = to ?? today;
    return {
        period: { from: start, to: end },
        ...(0, stats_helpers_1.assembleOverview)(await fetchOverviewData(start, end)),
    };
}
async function salesPerDay(days) {
    const date = {
        gte: (0, date_1.cairoStartOfDay)(days[0]),
        lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(days[days.length - 1], 1)),
    };
    const [sales, returns] = await Promise.all([
        postgres_1.prisma.sale.findMany({
            where: { date },
            select: { date: true, total: true },
        }),
        postgres_1.prisma.saleReturn.findMany({
            where: { date },
            select: { date: true, total: true },
        }),
    ]);
    return (0, stats_helpers_1.bucketByDay)(days, sales, returns, date_1.cairoDay);
}
async function getSalesByDay(q) {
    const today = (0, date_1.cairoToday)();
    const to = q.to ?? today;
    const from = q.from ?? (0, date_1.addDaysYMD)(to, -29);
    const days = await salesPerDay((0, stats_helpers_1.daysBetween)(from, to));
    const total = days.reduce((s, d) => s.add(d.sales), ZERO);
    const returns = days.reduce((s, d) => s.add(d.returns), ZERO);
    return {
        period: { from, to },
        days,
        summary: {
            count: days.reduce((n, d) => n + d.count, 0),
            sales: total,
            returns,
            net: total.sub(returns),
        },
    };
}
async function getTopItems(q) {
    const today = (0, date_1.cairoToday)();
    const from = q.from ?? (0, stats_helpers_1.monthStart)(today);
    const to = q.to ?? today;
    const date = rangeOf(from, to);
    const [sold, returned] = await Promise.all([
        postgres_1.prisma.saleLine.groupBy({
            by: ['itemId'],
            where: { sale: { date } },
            _sum: { baseQty: true, lineTotal: true },
        }),
        postgres_1.prisma.saleReturnLine.groupBy({
            by: ['itemId'],
            where: { saleReturn: { date } },
            _sum: { baseQty: true },
        }),
    ]);
    const ranked = (0, stats_helpers_1.rankTopItems)(sold.map((s) => ({
        itemId: s.itemId,
        qty: s._sum.baseQty ?? 0,
        revenue: sum(s._sum.lineTotal),
    })), returned.map((r) => ({ itemId: r.itemId, qty: r._sum.baseQty ?? 0 })), q.by, q.limit);
    const items = await postgres_1.prisma.item.findMany({
        where: { id: { in: ranked.map((r) => r.itemId) } },
        select: { id: true, name: true, unit: true },
    });
    const byId = new Map(items.map((i) => [i.id, i]));
    return {
        period: { from, to },
        by: q.by,
        items: ranked.map((r) => ({
            ...r,
            name: byId.get(r.itemId)?.name ?? '',
            unit: byId.get(r.itemId)?.unit ?? null,
        })),
    };
}
const todayAsDate = (today) => new Date(`${today}T00:00:00.000Z`);
async function getStaleStock(q) {
    const today = (0, date_1.cairoToday)();
    const since = { gte: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(today, -q.days)) };
    const [batches, items, soldRecently, boughtRecently] = await Promise.all([
        postgres_1.prisma.batch.findMany({
            where: { qtyRemaining: { gt: 0 } },
            select: {
                id: true,
                itemId: true,
                qtyRemaining: true,
                unitCost: true,
                expiryDate: true,
            },
        }),
        postgres_1.prisma.item.findMany({
            select: {
                id: true,
                name: true,
                unit: true,
                reorderLevel: true,
                isActive: true,
            },
        }),
        postgres_1.prisma.saleLine.groupBy({
            by: ['itemId'],
            where: { sale: { date: since } },
            _count: { _all: true },
        }),
        postgres_1.prisma.purchaseLine.groupBy({
            by: ['itemId'],
            where: { purchase: { date: since } },
            _count: { _all: true },
        }),
    ]);
    const recent = new Set([...soldRecently, ...boughtRecently].map((r) => r.itemId));
    const { byItem } = (0, stats_helpers_1.summarizeStock)(batches, todayAsDate(today));
    const rows = (0, stats_helpers_1.staleItems)(items, byItem, recent);
    return {
        days: q.days,
        count: rows.length,
        value: rows.reduce((s, r) => s.add(r.value), ZERO),
        items: rows.slice(0, q.limit),
    };
}
async function getDashboard(q) {
    const today = (0, date_1.cairoToday)();
    const todayDate = todayAsDate(today);
    const todayRange = rangeOf(today, today);
    const [month, salesToday, returnsToday, last7Days, customers, suppliers, batches, itemRows,] = await Promise.all([
        getOverview((0, stats_helpers_1.monthStart)(today), today),
        postgres_1.prisma.sale.aggregate({
            where: { date: todayRange },
            _sum: { total: true },
            _count: { _all: true },
        }),
        postgres_1.prisma.saleReturn.aggregate({
            where: { date: todayRange },
            _sum: { total: true },
        }),
        salesPerDay((0, stats_helpers_1.lastDays)(today, 7)),
        postgres_1.prisma.customer.findMany({
            select: { id: true, name: true, openingBalance: true },
        }),
        postgres_1.prisma.supplier.findMany({
            select: { id: true, name: true, openingBalance: true },
        }),
        postgres_1.prisma.batch.findMany({
            where: { qtyRemaining: { gt: 0 } },
            select: {
                id: true,
                itemId: true,
                qtyRemaining: true,
                unitCost: true,
                expiryDate: true,
            },
        }),
        postgres_1.prisma.item.findMany({
            select: {
                id: true,
                name: true,
                unit: true,
                reorderLevel: true,
                isActive: true,
            },
        }),
    ]);
    const [customerSums, supplierSums] = await Promise.all([
        (0, customer_service_1.summariesFor)(customers),
        (0, supplier_service_1.summariesFor)(suppliers),
    ]);
    const receivables = (0, stats_helpers_1.topOwed)(customers.map((c) => ({
        id: c.id,
        name: c.name,
        remaining: customerSums.get(c.id).remaining,
    })), 5);
    const payables = (0, stats_helpers_1.topOwed)(suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        remaining: supplierSums.get(s.id).remaining,
    })), 5);
    const items = new Map(itemRows.map((i) => [i.id, i]));
    const { byItem, value, expiredValue } = (0, stats_helpers_1.summarizeStock)(batches, todayDate);
    const low = (0, stats_helpers_1.lowStockItems)(itemRows, byItem);
    const near = (0, stats_helpers_1.nearExpiryBatches)(batches, items, todayDate, q.expiryDays);
    const expired = (0, stats_helpers_1.expiredBatches)(batches, items, todayDate);
    const soldToday = sum(salesToday._sum.total);
    const returnedToday = sum(returnsToday._sum.total);
    return {
        today: {
            date: today,
            salesCount: salesToday._count._all,
            sales: soldToday,
            returns: returnedToday,
            net: soldToday.sub(returnedToday),
        },
        month: {
            from: month.period.from,
            to: month.period.to,
            netSales: month.sales.net,
            grossProfit: month.grossProfit,
            expenses: month.expenses.total,
            netProfit: month.netProfit,
        },
        receivables,
        payables,
        last7Days,
        stock: { value, expiredValue },
        alerts: {
            lowStock: { count: low.length, items: low.slice(0, 10) },
            nearExpiry: {
                days: q.expiryDays,
                count: near.length,
                batches: near.slice(0, 10),
            },
            expired: {
                count: expired.length,
                value: expired.reduce((s, b) => s.add(b.value), ZERO),
                batches: expired.slice(0, 10),
            },
        },
    };
}
