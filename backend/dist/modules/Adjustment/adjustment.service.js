"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeStock = removeStock;
exports.createAdjustment = createAdjustment;
exports.getAdjustment = getAdjustment;
exports.updateAdjustment = updateAdjustment;
exports.deleteAdjustment = deleteAdjustment;
exports.listAdjustments = listAdjustments;
const date_1 = require("../../common/utils/date.js");
const postgres_1 = require("../../config/postgres.js");
const client_1 = require("@prisma/client");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const ZERO = new client_1.Prisma.Decimal(0);
const detail = {
    item: { select: { id: true, name: true, unit: true } },
    batch: { select: { id: true, expiryDate: true, unitCost: true } },
};
const adjustmentValue = (baseQty, unitCost) => unitCost.mul(baseQty).toDecimalPlaces(2);
async function removeStock(tx, a) {
    const batch = await tx.batch.findUnique({
        where: { id: a.batchId },
        select: { id: true, itemId: true },
    });
    if (!batch)
        throw new appError_1.default('Batch not found', 404);
    const r = await tx.batch.updateMany({
        where: { id: batch.id, qtyRemaining: { gte: a.baseQty } },
        data: { qtyRemaining: { decrement: a.baseQty } },
    });
    if (r.count !== 1) {
        const now = await tx.batch.findUnique({
            where: { id: batch.id },
            select: { qtyRemaining: true },
        });
        throw new appError_1.default(`Cannot take out ${a.baseQty}: only ${now?.qtyRemaining ?? 0} are in stock in this batch`, 409);
    }
    return tx.stockAdjustment.create({
        data: {
            itemId: batch.itemId,
            batchId: batch.id,
            baseQty: a.baseQty,
            reason: a.reason,
            date: a.date,
        },
    });
}
async function createAdjustment(input) {
    const date = (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Adjustment date');
    const id = await postgres_1.prisma.$transaction(async (tx) => (await removeStock(tx, { ...input, date })).id);
    return getAdjustment(id);
}
async function getAdjustment(id) {
    const r = await postgres_1.prisma.stockAdjustment.findUnique({
        where: { id },
        include: detail,
    });
    if (!r)
        throw new appError_1.default('Stock adjustment not found', 404);
    return { ...r, value: adjustmentValue(r.baseQty, r.batch.unitCost) };
}
async function updateAdjustment(id, input) {
    const current = await postgres_1.prisma.stockAdjustment.findUnique({
        where: { id },
        select: { date: true },
    });
    if (!current)
        throw new appError_1.default('Stock adjustment not found', 404);
    await postgres_1.prisma.stockAdjustment.update({
        where: { id },
        data: {
            reason: input.reason,
            date: input.date && input.date !== (0, date_1.cairoDay)(current.date)
                ? (0, date_1.resolveDocDate)(input.date, (0, date_1.cairoToday)(), 'Adjustment date')
                : undefined,
        },
    });
    return getAdjustment(id);
}
async function deleteAdjustment(id) {
    await postgres_1.prisma.$transaction(async (tx) => {
        const adj = await tx.stockAdjustment.findUnique({ where: { id } });
        if (!adj)
            throw new appError_1.default('Stock adjustment not found', 404);
        await tx.batch.update({
            where: { id: adj.batchId },
            data: { qtyRemaining: { increment: adj.baseQty } },
        });
        await tx.stockAdjustment.delete({ where: { id } });
    });
}
async function listAdjustments(q) {
    const where = {};
    if (q.itemId)
        where.itemId = q.itemId;
    if (q.batchId)
        where.batchId = q.batchId;
    if (q.reason)
        where.itemId = q.itemId;
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}), // the whole "to" day
        };
    }
    const [total, rows, all] = await Promise.all([
        postgres_1.prisma.stockAdjustment.count({ where }),
        postgres_1.prisma.stockAdjustment.findMany({
            where,
            orderBy: [{ date: 'desc' }, { id: 'desc' }],
            skip: (q.page - 1) * q.limit,
            take: q.limit,
            include: detail,
        }),
        postgres_1.prisma.stockAdjustment.findMany({
            where,
            select: { baseQty: true, batch: { select: { unitCost: true } } },
        }),
    ]);
    const value = all.reduce((s, r) => s.add(adjustmentValue(r.baseQty, r.batch.unitCost)), ZERO);
    return {
        adjustments: rows.map((r) => ({
            ...r,
            value: adjustmentValue(r.baseQty, r.batch.unitCost),
        })),
        total,
        value,
    };
}
