"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPurchaseReturn = getPurchaseReturn;
exports.rowsFromInvoice = rowsFromInvoice;
exports.createPurchaseReturn = createPurchaseReturn;
exports.updatePurchaseReturn = updatePurchaseReturn;
exports.deletePurchaseReturn = deletePurchaseReturn;
exports.listPurchaseReturns = listPurchaseReturns;
exports.getReturnable = getReturnable;
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const postgres_1 = require("../../config/postgres.js");
const date_1 = require("../../common/utils/date.js");
const money_1 = require("../../common/utils/money.js");
const sale_helper_1 = require("../Sale/sale.helper");
const client_1 = require("@prisma/client");
const D = (n) => new client_1.Prisma.Decimal(n);
const ZERO = D(0);
async function loadPurchase(db, id) {
    return db.purchase.findUnique({
        where: { id },
        include: {
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: { select: { name: true } },
                    batch: { select: { qtyRemaining: true } },
                },
            },
        },
    });
}
async function getPurchaseReturn(id) {
    const r = await postgres_1.prisma.purchaseReturn.findUnique({
        where: { id },
        include: {
            supplier: { select: { id: true, name: true } },
            purchase: { select: { id: true, date: true, total: true } },
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: { select: { id: true, name: true, unit: true } },
                    batch: { select: { id: true, expiryDate: true, qtyRemaining: true } },
                },
            },
        },
    });
    if (!r)
        throw new appError_1.default('Purchase return not found', 404);
    return r;
}
function rowsFromInvoice(purchase, returned, lines) {
    const delivered = deliveredByBatch(purchase);
    const factor = (0, money_1.netFactor)(purchase.total, purchase.total.add(purchase.discount));
    const rows = [];
    const seen = new Set();
    for (const l of lines) {
        if (seen.has(l.purchaseLineId)) {
            throw new appError_1.default(`Invoice line ${l.purchaseLineId} appears twice: send it once`, 400);
        }
        seen.add(l.purchaseLineId);
        const line = purchase.lines.find((x) => x.id === l.purchaseLineId);
        if (!line)
            throw new appError_1.default(`Line ${l.purchaseLineId} does not belong to purchase ${purchase.id}`, 400);
        const room = (delivered.get(line.batchId) ?? 0) - (returned.get(line.batchId) ?? 0);
        if (l.baseQty > room) {
            throw new appError_1.default(`Only ${Math.max(0, room)} of "${line.item.name}" can still be returned against this invoice`, 409);
        }
        returned.set(line.batchId, (returned.get(line.batchId) ?? 0) + l.baseQty);
        const value = (0, money_1.proportionalValue)(line.lineTotal, line.baseQty, l.baseQty, factor);
        rows.push({
            itemId: line.itemId,
            batchId: line.batchId,
            baseQty: l.baseQty,
            lineTotal: value,
        });
    }
    return rows;
}
async function returnedByBatch(db, purchaseId) {
    const rows = await db.purchaseReturnLine.groupBy({
        by: ['batchId'],
        where: { purchaseReturn: { purchaseId } },
        _sum: { baseQty: true },
    });
    return new Map(rows.map((r) => [r.batchId, r._sum.baseQty ?? 0]));
}
const deliveredByBatch = (purchase) => (0, sale_helper_1.sumSlices)(purchase.lines);
async function createPurchaseReturn(input) {
    const today = (0, date_1.cairoToday)();
    const id = await postgres_1.prisma.$transaction(async (tx) => {
        const locked = await tx.purchase.updateMany({
            where: { id: input.purchaseId },
            data: { total: { increment: 0 } },
        });
        if (locked.count === 0)
            throw new appError_1.default('Purchase not found', 404);
        const purchase = (await loadPurchase(tx, input.purchaseId));
        const supplierId = purchase.supplierId;
        const date = (0, date_1.resolveDocDate)(input.date, today, 'Return date');
        const rows = rowsFromInvoice(purchase, await returnedByBatch(tx, purchase.id), input.lines);
        const total = rows.reduce((s, r) => s.add(r.lineTotal), ZERO);
        const cash = D(input.cashRefund ?? 0);
        (0, money_1.checkCashRefund)(total, cash, false);
        const ret = await tx.purchaseReturn.create({
            data: {
                supplierId,
                purchaseId: input.purchaseId,
                date,
                total,
                cashRefund: cash,
                note: input.note?.trim() || null,
            },
        });
        await tx.purchaseReturnLine.createMany({
            data: rows.map((r) => ({ returnId: ret.id, ...r })),
        });
        for (const [batchId, q] of (0, sale_helper_1.sumSlices)(rows)) {
            const r = await tx.batch.updateMany({
                where: { id: batchId, qtyRemaining: { gte: q } },
                data: { qtyRemaining: { decrement: q } },
            });
            if (r.count !== 1) {
                const b = await tx.batch.findUnique({
                    where: { id: batchId },
                    include: { item: { select: { name: true } } },
                });
                throw new appError_1.default(`Cannot return ${q} of "${b?.item.name}": only ${b?.qtyRemaining} are still in stock (the rest was sold)`, 409);
            }
        }
        return ret.id;
    }, { timeout: 40000 });
    return getPurchaseReturn(id);
}
async function updatePurchaseReturn(id, input) {
    const r = await postgres_1.prisma.purchaseReturn.findUnique({
        where: { id },
        include: { purchase: { select: { date: true } } },
    });
    if (!r)
        throw new appError_1.default('Purchase return not found', 404);
    const cash = input.cashRefund !== undefined ? D(input.cashRefund) : r.cashRefund;
    (0, money_1.checkCashRefund)(r.total, cash, false);
    let date;
    if (input.date && input.date !== (0, date_1.cairoDay)(r.date)) {
        date = (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Return date');
    }
    await postgres_1.prisma.purchaseReturn.update({
        where: { id },
        data: {
            cashRefund: cash,
            date,
            note: input.note === undefined ? undefined : input.note?.trim() || null,
        },
    });
    return getPurchaseReturn(id);
}
async function deletePurchaseReturn(id) {
    await postgres_1.prisma.$transaction(async (tx) => {
        const r = await tx.purchaseReturn.findUnique({
            where: { id },
            include: { lines: true },
        });
        if (!r)
            throw new appError_1.default('Purchase return not found', 404);
        for (const [batchId, q] of (0, sale_helper_1.sumSlices)(r.lines)) {
            await tx.batch.update({
                where: { id: batchId },
                data: { qtyRemaining: { increment: q } },
            });
        }
        await tx.purchaseReturn.delete({ where: { id } });
    });
}
async function listPurchaseReturns(q) {
    const where = {};
    if (q.supplierId)
        where.supplierId = q.supplierId;
    if (q.purchaseId)
        where.purchaseId = q.purchaseId;
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}),
        };
    }
    const [total, rows] = await Promise.all([
        postgres_1.prisma.purchaseReturn.count({ where }),
        postgres_1.prisma.purchaseReturn.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
            include: {
                supplier: { select: { id: true, name: true } },
                _count: { select: { lines: true } },
            },
        }),
    ]);
    return {
        returns: rows.map(({ _count, ...r }) => ({
            ...r,
            linesCount: _count.lines,
        })),
        total,
    };
}
async function getReturnable(purchaseId) {
    const purchase = await loadPurchase(postgres_1.prisma, purchaseId);
    if (!purchase)
        throw new appError_1.default('Purchase not found', 404);
    const delivered = deliveredByBatch(purchase);
    const returned = await returnedByBatch(postgres_1.prisma, purchaseId);
    const factor = (0, money_1.netFactor)(purchase.total, purchase.total.add(purchase.discount));
    return {
        purchaseId: purchase.id,
        supplierId: purchase.supplierId,
        lines: purchase.lines.map((l) => {
            const room = (delivered.get(l.batchId) ?? 0) - (returned.get(l.batchId) ?? 0);
            return {
                purchaseLineId: l.id,
                itemId: l.itemId,
                itemName: l.item.name,
                bought: l.baseQty,
                returnedFromBatch: returned.get(l.batchId) ?? 0,
                inStock: l.batch.qtyRemaining,
                returnable: Math.max(0, Math.min(room, l.batch.qtyRemaining)),
                netUnitValue: l.lineTotal.mul(factor).div(l.baseQty).toDecimalPlaces(6),
            };
        }),
    };
}
