"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPurchase = createPurchase;
exports.getPurchase = getPurchase;
exports.updatePurchase = updatePurchase;
exports.listPurchases = listPurchases;
exports.deletePurchase = deletePurchase;
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const client_1 = require("@prisma/client");
const date_1 = require("../../common/utils/date.js");
const purchase_helpers_1 = require("./purchase.helpers");
async function prepareFromInput(db, lines) {
    const itemIds = [...new Set(lines.map((l) => l.itemId))];
    const items = await db.item.findMany({
        where: { id: { in: itemIds } },
        select: { id: true, name: true, packSize: true },
    });
    const prepared = (0, purchase_helpers_1.prepareLines)(lines, new Map(items.map((i) => [i.id, i])), (0, date_1.cairoToday)());
    const subtotal = prepared.reduce((s, l) => s.add(l.lineTotal), new client_1.Prisma.Decimal(0));
    return { prepared, subtotal };
}
async function createPurchase(input) {
    const supplier = await postgres_1.prisma.supplier.findUnique({
        where: { id: input.supplierId },
    });
    if (!supplier)
        throw new appError_1.default('Supplier not found', 404);
    const { prepared, subtotal } = await prepareFromInput(postgres_1.prisma, input.lines);
    const date = (0, purchase_helpers_1.resolvePurchaseDate)(input.date, (0, date_1.cairoToday)());
    const discount = new client_1.Prisma.Decimal(input.discount);
    const paid = new client_1.Prisma.Decimal(input.paid);
    const { total } = (0, purchase_helpers_1.invoiceTotals)(subtotal, discount);
    const id = await postgres_1.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
            data: {
                supplierId: input.supplierId,
                date,
                discount,
                total,
                paid,
                note: input.note?.trim() || null,
            },
        });
        for (const l of prepared) {
            const batch = await tx.batch.upsert({
                where: {
                    itemId_expiryDate_unitCost: {
                        itemId: l.itemId,
                        expiryDate: l.expiryDate,
                        unitCost: l.unitCost,
                    },
                },
                create: {
                    itemId: l.itemId,
                    expiryDate: l.expiryDate,
                    unitCost: l.unitCost,
                    qtyReceived: l.baseQty,
                    qtyRemaining: l.baseQty,
                },
                update: {
                    qtyReceived: { increment: l.baseQty },
                    qtyRemaining: { increment: l.baseQty },
                },
            });
            await tx.purchaseLine.create({
                data: {
                    purchaseId: purchase.id,
                    itemId: l.itemId,
                    baseQty: l.baseQty,
                    lineTotal: l.lineTotal,
                    batchId: batch.id,
                },
            });
        }
        return purchase.id;
    }, { timeout: 30000 });
    return getPurchase(id);
}
async function getPurchase(id) {
    const purchase = await postgres_1.prisma.purchase.findUnique({
        where: { id },
        include: {
            supplier: { select: { id: true, name: true } },
            lines: {
                orderBy: { id: 'asc' },
                include: {
                    item: {
                        select: {
                            id: true,
                            name: true,
                            unit: true,
                            packName: true,
                            packSize: true,
                        },
                    },
                    batch: {
                        select: {
                            id: true,
                            expiryDate: true,
                            unitCost: true,
                            qtyRemaining: true,
                        },
                    },
                },
            },
            purchaseReturns: {
                select: { id: true, date: true, total: true, cashRefund: true },
            },
        },
    });
    if (!purchase)
        throw new appError_1.default('Purchase not found', 404);
    return {
        ...purchase,
        subtotal: purchase.total.add(purchase.discount),
        lines: purchase.lines.map((l) => ({
            ...l,
            packs: l.item.packSize ? l.baseQty / l.item.packSize : null,
            hasExpiry: (0, date_1.hasExpiry)(l.batch.expiryDate),
        })),
    };
}
async function updatePurchase(id, input) {
    const today = (0, date_1.cairoToday)();
    await postgres_1.prisma.$transaction(async (tx) => {
        const locked = await tx.purchase.updateMany({
            where: { id },
            data: { total: { increment: 0 } },
        });
        if (locked.count === 0)
            throw new appError_1.default('Purchase not found', 404);
        const purchase = await tx.purchase.findUniqueOrThrow({
            where: { id },
            include: { lines: true },
        });
        const returnedRows = await tx.purchaseReturnLine.groupBy({
            by: ['batchId'],
            where: { purchaseReturn: { purchaseId: id } },
            _sum: { baseQty: true },
        });
        const returned = new Map(returnedRows.map((r) => [
            r.batchId,
            r._sum.baseQty ?? 0,
        ]));
        const hasReturns = (await tx.purchaseReturn.count({ where: { purchaseId: id } })) > 0;
        if (input.supplierId !== undefined &&
            input.supplierId !== purchase.supplierId) {
            if (hasReturns) {
                throw new appError_1.default('This purchase has returns, so its supplier cannot change', 400);
            }
            const supplier = await tx.supplier.findUnique({
                where: { id: input.supplierId },
            });
            if (!supplier)
                throw new appError_1.default('Supplier not found', 404);
        }
        let subtotal = purchase.total.add(purchase.discount);
        if (input.lines) {
            const { prepared, subtotal: newSubtotal } = await prepareFromInput(tx, input.lines);
            const withBatch = [];
            for (const l of prepared) {
                const batch = await tx.batch.upsert({
                    where: {
                        itemId_expiryDate_unitCost: {
                            itemId: l.itemId,
                            expiryDate: l.expiryDate,
                            unitCost: l.unitCost,
                        },
                    },
                    create: {
                        itemId: l.itemId,
                        expiryDate: l.expiryDate,
                        unitCost: l.unitCost,
                        qtyReceived: 0,
                        qtyRemaining: 0,
                    },
                    update: { qtyReceived: { increment: 0 } },
                });
                withBatch.push({ ...l, batchId: batch.id });
            }
            const oldQty = (0, purchase_helpers_1.sumByBatch)(purchase.lines);
            const newQty = (0, purchase_helpers_1.sumByBatch)(withBatch);
            const violated = (0, purchase_helpers_1.returnCapViolations)(returned, newQty);
            if (violated.length > 0) {
                throw new appError_1.default('Part of this purchase was already returned to the supplier: keep at least the returned quantity, or delete the return first', 400);
            }
            for (const { batchId, delta } of (0, purchase_helpers_1.batchDeltas)(oldQty, newQty)) {
                if (delta > 0) {
                    await tx.batch.update({
                        where: { id: batchId },
                        data: {
                            qtyReceived: { increment: delta },
                            qtyRemaining: { increment: delta },
                        },
                    });
                    continue;
                }
                const need = -delta;
                const r = await tx.batch.updateMany({
                    where: {
                        id: batchId,
                        qtyRemaining: { gte: need },
                        qtyReceived: { gte: need },
                    },
                    data: {
                        qtyReceived: { decrement: need },
                        qtyRemaining: { decrement: need },
                    },
                });
                if (r.count !== 1) {
                    throw new appError_1.default(`Cannot take ${need} units of this item`, 400);
                }
            }
            await tx.purchaseLine.deleteMany({ where: { purchaseId: id } });
            await tx.purchaseLine.createMany({
                data: withBatch.map((l) => ({
                    purchaseId: id,
                    itemId: l.itemId,
                    baseQty: l.baseQty,
                    lineTotal: l.lineTotal,
                    batchId: l.batchId,
                })),
            });
            subtotal = newSubtotal;
        }
        const discount = input.discount !== undefined
            ? new client_1.Prisma.Decimal(input.discount)
            : purchase.discount;
        const paid = input.paid !== undefined
            ? new client_1.Prisma.Decimal(input.paid)
            : purchase.paid;
        const { total } = (0, purchase_helpers_1.invoiceTotals)(subtotal, discount);
        await tx.purchase.update({
            where: { id },
            data: {
                supplierId: input.supplierId,
                discount,
                total,
                paid,
                note: input.note === undefined ? undefined : input.note?.trim() || null,
                date: input.date && input.date !== (0, date_1.cairoDay)(purchase.date)
                    ? (0, purchase_helpers_1.resolvePurchaseDate)(input.date, today)
                    : undefined,
            },
        });
    }, { timeout: 40000 });
    return getPurchase(id);
}
async function listPurchases(q) {
    const where = {};
    if (q.supplierId)
        where.supplierId = q.supplierId;
    if (q.from || q.to) {
        where.date = {
            ...(q.from ? { gte: (0, date_1.cairoStartOfDay)(q.from) } : {}),
            ...(q.to ? { lt: (0, date_1.cairoStartOfDay)((0, date_1.addDaysYMD)(q.to, 1)) } : {}), // the whole "to" day
        };
    }
    const [total, rows] = await Promise.all([
        postgres_1.prisma.purchase.count({ where }),
        postgres_1.prisma.purchase.findMany({
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
        purchases: rows.map(({ _count, ...p }) => ({
            ...p,
            subtotal: p.total.add(p.discount),
            linesCount: _count.lines,
        })),
        total,
    };
}
async function deletePurchase(id) {
    await postgres_1.prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.findUnique({
            where: { id },
            include: { lines: true },
        });
        if (!purchase)
            throw new appError_1.default('Purchase not found', 404);
        if ((await tx.purchaseReturn.count({ where: { purchaseId: id } })) > 0) {
            throw new appError_1.default('This purchase has returns to the supplier: delete them first', 400);
        }
        for (const line of purchase.lines) {
            const r = await tx.batch.updateMany({
                where: {
                    id: line.batchId,
                    qtyRemaining: { gte: line.baseQty },
                    qtyReceived: { gte: line.baseQty },
                },
                data: {
                    qtyRemaining: { decrement: line.baseQty },
                    qtyReceived: { decrement: line.baseQty },
                },
            });
            if (r.count !== 1) {
                throw new appError_1.default('Part of this purchase was already sold or returned, so it cannot be deleted', 400);
            }
        }
        await tx.purchase.delete({ where: { id } });
    });
}
