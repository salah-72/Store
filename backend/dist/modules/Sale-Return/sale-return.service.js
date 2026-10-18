"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSaleReturn = getSaleReturn;
exports.rowsFromInvoice = rowsFromInvoice;
exports.createSaleReturn = createSaleReturn;
exports.updateSaleReturn = updateSaleReturn;
exports.deleteSaleReturn = deleteSaleReturn;
exports.listSaleReturns = listSaleReturns;
exports.getReturnable = getReturnable;
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const date_1 = require("../../common/utils/date.js");
const money_1 = require("../../common/utils/money.js");
const sale_return_helpers_1 = require("./sale-return.helpers");
const sale_helper_1 = require("../Sale/sale.helper");
const D = (n) => new client_1.Prisma.Decimal(n);
const ZERO = D(0);
async function loadSale(tx, id) {
    return tx.sale.findUnique({
        where: { id },
        include: {
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: { select: { name: true } },
                    batches: { orderBy: { id: 'asc' } },
                },
            },
        },
    });
}
async function returnedBySlice(db, sale) {
    const sliceIds = sale.lines.flatMap((l) => l.batches.map((b) => b.id));
    const rows = await db.saleReturnLine.groupBy({
        by: ['saleLineBatchId'],
        where: { saleLineBatchId: { in: sliceIds } },
        _sum: { baseQty: true },
    });
    const map = new Map();
    for (const r of rows)
        if (r.saleLineBatchId !== null)
            map.set(r.saleLineBatchId, r._sum.baseQty ?? 0);
    return map;
}
async function getSaleReturn(id) {
    const r = await postgres_1.prisma.saleReturn.findUnique({
        where: { id },
        include: {
            customer: { select: { id: true, name: true } },
            sale: { select: { id: true, date: true, total: true } },
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: { select: { id: true, name: true, unit: true } },
                    batch: { select: { id: true, expiryDate: true } },
                },
            },
        },
    });
    if (!r)
        throw new appError_1.default('Sale return not found', 404);
    return r;
}
async function rowsFromInvoice(tx, sale, lines) {
    const returned = await returnedBySlice(tx, sale);
    const factor = (0, money_1.netFactor)(sale.total, sale.total.add(sale.discount));
    const rows = [];
    const seen = new Set();
    for (const l of lines) {
        if (seen.has(l.saleLineId))
            throw new appError_1.default(`Invoice line ${l.saleLineId} appears twice: send it once`, 400);
        seen.add(l.saleLineId);
        const line = sale.lines.find((x) => x.id === l.saleLineId);
        if (!line)
            throw new appError_1.default(`Line ${l.saleLineId} does not belong to sale ${sale.id}`, 400);
        const { parts, missing } = (0, sale_return_helpers_1.allocateToSlices)(line.batches.map((b) => ({
            id: b.id,
            batchId: b.batchId,
            room: b.baseQty - (returned.get(b.id) ?? 0),
        })), l.baseQty);
        if (missing > 0) {
            const returnable = l.baseQty - missing;
            throw new appError_1.default(`Only ${returnable} of "${line.item.name}" can still be returned from this invoice`, 409);
        }
        const value = (l.lineTotal !== undefined
            ? D(l.lineTotal)
            : (0, money_1.proportionalValue)(line.lineTotal, line.baseQty, l.baseQty, factor)).toDecimalPlaces(2);
        const shares = (0, money_1.splitAmount)(value, parts.map((p) => p.baseQty));
        parts.forEach((p, i) => rows.push({
            itemId: line.itemId,
            batchId: p.batchId,
            saleLineBatchId: p.sliceId,
            baseQty: p.baseQty,
            lineTotal: shares[i],
            unitPrice: shares[i].div(p.baseQty).toDecimalPlaces(6),
        }));
    }
    return rows;
}
async function createSaleReturn(input) {
    const today = (0, date_1.cairoToday)();
    const id = await postgres_1.prisma.$transaction(async (tx) => {
        const locked = await tx.sale.updateMany({
            where: { id: input.saleId },
            data: { total: { increment: 0 } },
        });
        if (locked.count === 0)
            throw new appError_1.default('Sale not found', 404);
        const sale = (await loadSale(tx, input.saleId));
        const customerId = sale.customerId;
        const date = (0, date_1.resolveDocDate)(input.date, today, 'Return date');
        const rows = await rowsFromInvoice(tx, sale, input.lines);
        const total = rows.reduce((s, r) => s.add(r.lineTotal), ZERO);
        const cash = input.cashRefund !== undefined
            ? D(input.cashRefund)
            : customerId === null
                ? total
                : ZERO;
        (0, money_1.checkCashRefund)(total, cash, customerId === null);
        const ret = await tx.saleReturn.create({
            data: {
                customerId,
                saleId: input.saleId,
                date,
                total,
                cashRefund: cash,
                note: input.note?.trim() || null,
            },
        });
        await tx.saleReturnLine.createMany({
            data: rows.map((r) => ({ returnId: ret.id, ...r })),
        });
        for (const [batchId, q] of (0, sale_helper_1.sumSlices)(rows)) {
            await tx.batch.update({
                where: { id: batchId },
                data: { qtyRemaining: { increment: q } },
            });
        }
        return ret.id;
    }, { timeout: 40000 });
    return getSaleReturn(id);
}
async function updateSaleReturn(id, input) {
    const r = await postgres_1.prisma.saleReturn.findUnique({
        where: { id },
        include: { sale: { select: { date: true } } },
    });
    if (!r)
        throw new appError_1.default('Sale return not found', 404);
    const cash = input.cashRefund !== undefined ? D(input.cashRefund) : r.cashRefund;
    (0, money_1.checkCashRefund)(r.total, cash, r.customerId === null);
    let date;
    if (input.date && input.date !== (0, date_1.cairoDay)(r.date)) {
        date = (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Return date');
        if (r.sale && (0, date_1.cairoDay)(date) < (0, date_1.cairoDay)(r.sale.date)) {
            throw new appError_1.default('Return date cannot be before the sale date', 400);
        }
    }
    await postgres_1.prisma.saleReturn.update({
        where: { id },
        data: {
            cashRefund: cash,
            date,
            note: input.note === undefined ? undefined : input.note?.trim() || null,
        },
    });
    return getSaleReturn(id);
}
async function deleteSaleReturn(id) {
    await postgres_1.prisma.$transaction(async (tx) => {
        const r = await tx.saleReturn.findUnique({
            where: { id },
            include: { lines: true },
        });
        if (!r)
            throw new appError_1.default('Sale return not found', 404);
        for (const [batchId, q] of (0, sale_helper_1.sumSlices)(r.lines)) {
            const res = await tx.batch.updateMany({
                where: { id: batchId, qtyRemaining: { gte: q } },
                data: { qtyRemaining: { decrement: q } },
            });
            if (res.count !== 1) {
                throw new appError_1.default('The returned goods were already sold again, so this return cannot be deleted', 409);
            }
        }
        await tx.saleReturn.delete({ where: { id } });
    });
}
async function listSaleReturns(q) {
    const where = {};
    if (q.customerId)
        where.customerId = q.customerId;
    if (q.saleId)
        where.saleId = q.saleId;
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}),
        };
    }
    const [total, rows] = await Promise.all([
        postgres_1.prisma.saleReturn.count({ where }),
        postgres_1.prisma.saleReturn.findMany({
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
        returns: rows.map(({ _count, ...r }) => ({
            ...r,
            linesCount: _count.lines,
        })),
        total,
    };
}
async function getReturnable(saleId) {
    const sale = await loadSale(postgres_1.prisma, saleId);
    if (!sale)
        throw new appError_1.default('Sale not found', 404);
    const returned = await returnedBySlice(postgres_1.prisma, sale);
    const factor = (0, money_1.netFactor)(sale.total, sale.total.add(sale.discount));
    return {
        saleId: sale.id,
        customerId: sale.customerId,
        lines: sale.lines.map((l) => {
            const sold = l.baseQty;
            const alreadyReturned = l.batches.reduce((s, b) => s + (returned.get(b.id) ?? 0), 0);
            return {
                saleLineId: l.id,
                itemId: l.itemId,
                itemName: l.item.name,
                sold,
                returned: alreadyReturned,
                returnable: sold - alreadyReturned,
                netUnitValue: l.lineTotal.mul(factor).div(sold).toDecimalPlaces(6),
            };
        }),
    };
}
