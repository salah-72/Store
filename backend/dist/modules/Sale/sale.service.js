"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.takeFefo = takeFefo;
exports.createSale = createSale;
exports.getSale = getSale;
exports.updateSale = updateSale;
exports.deleteSale = deleteSale;
exports.listSales = listSales;
const date_1 = require("../../common/utils/date.js");
const sale_helper_1 = require("./sale.helper");
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const ZERO = new client_1.Prisma.Decimal(0);
const todayAsDate = (today) => new Date(`${today}T00:00:00.000Z`);
async function loadAndPrice(db, lines) {
    const ids = [...new Set(lines.map((l) => l.itemId))];
    const rows = await db.item.findMany({
        where: { id: { in: ids } },
        select: { id: true, name: true, price: true, priceBasis: true },
    });
    const items = new Map(rows.map((i) => [i.id, i]));
    const missing = ids.filter((id) => !items.has(id));
    if (missing.length > 0)
        throw new appError_1.default('Items not found', 404);
    const priced = lines.map((l) => ({
        itemId: l.itemId,
        baseQty: l.baseQty,
        ...(0, sale_helper_1.priceLine)(items.get(l.itemId), l),
    }));
    const subtotal = priced.reduce((s, l) => s.add(l.lineTotal), ZERO);
    return { priced, subtotal, items };
}
async function takeFefo(tx, item, qty, todayDate) {
    const taken = [];
    let need = qty;
    for (let attempt = 0; attempt < 5 && need > 0; attempt++) {
        const batches = await tx.batch.findMany({
            where: {
                itemId: item.id,
                qtyRemaining: { gt: 0 },
                expiryDate: { gte: todayDate },
            },
            orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
            select: { id: true, qtyRemaining: true, unitCost: true },
        });
        const { slices } = (0, sale_helper_1.planFefo)(batches, need);
        if (slices.length === 0)
            break; // nothing sellable left
        for (const s of slices) {
            const r = await tx.batch.updateMany({
                where: { id: s.batchId, qtyRemaining: { gte: s.baseQty } },
                data: { qtyRemaining: { decrement: s.baseQty } },
            });
            if (r.count !== 1)
                break;
            taken.push(s);
            need -= s.baseQty;
        }
    }
    if (need > 0) {
        const left = await tx.batch.aggregate({
            where: {
                itemId: item.id,
                qtyRemaining: { gt: 0 },
                expiryDate: { gt: todayDate },
            },
            _sum: { qtyRemaining: true },
        });
        const available = taken.reduce((s, t) => s + t.baseQty, 0) + (left._sum.qtyRemaining ?? 0);
        throw new appError_1.default(`Not enough stock of "${item.name}": requested ${qty}, available ${available} (expired batches are not sold)`, 409);
    }
    return taken;
}
async function sellLines(tx, saleId, priced, items, todayDate) {
    for (const l of priced) {
        const slices = await takeFefo(tx, items.get(l.itemId), l.baseQty, todayDate);
        await tx.saleLine.create({
            data: {
                saleId,
                itemId: l.itemId,
                baseQty: l.baseQty,
                unitPrice: l.unitPrice,
                lineTotal: l.lineTotal,
                batches: {
                    create: slices.map((s) => ({
                        batchId: s.batchId,
                        baseQty: s.baseQty,
                        unitCost: s.unitCost,
                    })),
                },
            },
        });
    }
}
async function restoreStock(tx, slices) {
    for (const [batchId, qty] of (0, sale_helper_1.sumSlices)(slices)) {
        await tx.batch.update({
            where: { id: batchId },
            data: { qtyRemaining: { increment: qty } },
        });
    }
}
async function createSale(input) {
    const customerId = input.customerId ?? null;
    const today = (0, date_1.cairoToday)();
    const date = (0, sale_helper_1.resolveSaleDate)(input.date, today);
    const id = await postgres_1.prisma.$transaction(async (tx) => {
        if (customerId !== null) {
            const customer = await tx.customer.findUnique({
                where: { id: customerId },
            });
            if (!customer)
                throw new appError_1.default('Customer not found', 404);
        }
        const { priced, subtotal, items } = await loadAndPrice(tx, input.lines);
        const discount = new client_1.Prisma.Decimal(input.discount);
        const paid = input.paid !== undefined
            ? new client_1.Prisma.Decimal(input.paid)
            : subtotal.sub(discount);
        const { total } = (0, sale_helper_1.saleTotals)(subtotal, discount, paid, customerId !== null);
        const sale = await tx.sale.create({
            data: {
                customerId,
                date,
                discount,
                total,
                paid,
                note: input.note?.trim() || null,
            },
        });
        await sellLines(tx, sale.id, priced, items, todayAsDate(today));
        return sale.id;
    }, { timeout: 40000 });
    return getSale(id);
}
async function getSale(id) {
    const sale = await postgres_1.prisma.sale.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: {
                        select: { id: true, name: true, unit: true, priceBasis: true },
                    },
                    batches: {
                        orderBy: { id: 'asc' },
                        include: { batch: { select: { expiryDate: true } } },
                    },
                },
            },
            returns: {
                select: { id: true, date: true, total: true, cashRefund: true },
            },
        },
    });
    if (!sale)
        throw new appError_1.default('Sale not found', 404);
    let totalCost = ZERO;
    const lines = sale.lines.map((l) => {
        const cost = l.batches
            .reduce((s, b) => s.add(b.unitCost.mul(b.baseQty)), ZERO)
            .toDecimalPlaces(2);
        totalCost = totalCost.add(cost);
        return {
            ...l,
            cost,
            profit: l.lineTotal.sub(cost),
            belowCost: l.lineTotal.lt(cost),
        };
    });
    return {
        ...sale,
        subtotal: sale.total.add(sale.discount),
        cost: totalCost,
        profit: sale.total.sub(totalCost),
        lines,
    };
}
async function updateSale(id, input) {
    const today = (0, date_1.cairoToday)();
    await postgres_1.prisma.$transaction(async (tx) => {
        const locked = await tx.sale.updateMany({
            where: { id },
            data: { total: { increment: 0 } },
        });
        if (locked.count === 0)
            throw new appError_1.default('Sale not found', 404);
        const sale = await tx.sale.findUniqueOrThrow({
            where: { id },
            include: { lines: { include: { batches: true } } },
        });
        const hasReturns = (await tx.saleReturn.count({ where: { saleId: id } })) > 0;
        const customerChanged = input.customerId !== undefined && input.customerId !== sale.customerId;
        if (customerChanged) {
            if (hasReturns)
                throw new appError_1.default('This sale has returns, so its customer cannot change', 409);
            if (input.customerId !== null && input.customerId !== undefined) {
                const customer = await tx.customer.findUnique({
                    where: { id: input.customerId },
                });
                if (!customer)
                    throw new appError_1.default('Customer not found', 404);
            }
        }
        const hasCustomer = (input.customerId === undefined
            ? sale.customerId
            : input.customerId) !== null;
        let subtotal = sale.total.add(sale.discount);
        if (input.lines) {
            if (hasReturns) {
                throw new appError_1.default('This sale has returns, so its lines cannot change: delete the returns first', 409);
            }
            await restoreStock(tx, sale.lines.flatMap((l) => l.batches));
            await tx.saleLine.deleteMany({ where: { saleId: id } });
            const r = await loadAndPrice(tx, input.lines);
            await sellLines(tx, id, r.priced, r.items, todayAsDate(today));
            subtotal = r.subtotal;
        }
        const discount = input.discount !== undefined
            ? new client_1.Prisma.Decimal(input.discount)
            : sale.discount;
        const afterDiscount = subtotal.sub(discount);
        const paid = input.paid !== undefined
            ? new client_1.Prisma.Decimal(input.paid)
            : hasCustomer
                ? sale.paid
                : afterDiscount;
        const { total } = (0, sale_helper_1.saleTotals)(subtotal, discount, paid, hasCustomer);
        await tx.sale.update({
            where: { id },
            data: {
                customerId: input.customerId,
                discount,
                total,
                paid,
                note: input.note === undefined ? undefined : input.note?.trim() || null,
                date: input.date && input.date !== (0, date_1.cairoDay)(sale.date)
                    ? (0, sale_helper_1.resolveSaleDate)(input.date, today)
                    : undefined,
            },
        });
    }, { timeout: 50000 });
    return getSale(id);
}
async function deleteSale(id) {
    await postgres_1.prisma.$transaction(async (tx) => {
        const locked = await tx.sale.updateMany({
            where: { id },
            data: { total: { increment: 0 } },
        });
        if (locked.count === 0)
            throw new appError_1.default('Sale not found', 404);
        if ((await tx.saleReturn.count({ where: { saleId: id } })) > 0) {
            throw new appError_1.default('This sale has returns: delete them first', 409);
        }
        const lines = await tx.saleLine.findMany({
            where: { saleId: id },
            include: { batches: true },
        });
        await restoreStock(tx, lines.flatMap((l) => l.batches));
        await tx.sale.delete({ where: { id } });
    });
}
async function listSales(q) {
    const where = {};
    if (q.customerId)
        where.customerId = q.customerId;
    if (q.cash)
        where.customerId = null;
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}), // the whole "to" day
        };
    }
    const [total, rows] = await Promise.all([
        postgres_1.prisma.sale.count({ where }),
        postgres_1.prisma.sale.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
            include: {
                customer: { select: { id: true, name: true } },
                _count: { select: { lines: true } },
            },
        }),
    ]);
    return {
        sales: rows.map(({ _count, ...s }) => ({
            ...s,
            subtotal: s.total.add(s.discount),
            linesCount: _count.lines,
        })),
        total,
    };
}
