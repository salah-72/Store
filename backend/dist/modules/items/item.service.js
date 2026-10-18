"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createItem = createItem;
exports.updateItem = updateItem;
exports.setItemStatus = setItemStatus;
exports.listItems = listItems;
exports.getItem = getItem;
const item_functions_1 = require("./item.functions");
const postgres_1 = require("../../config/postgres.js");
const appError_1 = __importDefault(require("../../common/utils/appError.js"));
const date_1 = require("../../common/utils/date.js");
async function stockByItem(ids) {
    const map = new Map();
    if (ids.length === 0)
        return map;
    const today = new Date(`${(0, date_1.cairoToday)()}T00:00:00.000Z`);
    const withStockOnly = { itemId: { in: ids }, qtyRemaining: { gt: 0 } };
    const [all, notExpired, withExpiry] = await Promise.all([
        postgres_1.prisma.batch.groupBy({
            by: ['itemId'],
            where: withStockOnly,
            _sum: { qtyRemaining: true },
        }),
        postgres_1.prisma.batch.groupBy({
            by: ['itemId'],
            where: { ...withStockOnly, expiryDate: { gte: today } },
            _sum: { qtyRemaining: true },
        }),
        postgres_1.prisma.batch.groupBy({
            by: ['itemId'],
            where: { ...withStockOnly, expiryDate: { lt: date_1.EXPIRY_CUTOFF } },
            _min: { expiryDate: true },
        }),
    ]);
    const sellable = new Map(notExpired.map((r) => [
        r.itemId,
        r._sum.qtyRemaining ?? 0,
    ]));
    const nearest = new Map(withExpiry.map((r) => [r.itemId, r._min.expiryDate]));
    for (const r of all) {
        map.set(r.itemId, {
            itemId: r.itemId,
            stock: r._sum.qtyRemaining ?? 0,
            sellable: sellable.get(r.itemId) ?? 0,
            nearestExpiry: nearest.get(r.itemId) ?? null,
        });
    }
    return map;
}
function withStock(item, s) {
    const stock = s?.stock ?? 0;
    const sellable = s?.sellable ?? 0;
    return {
        ...item,
        stock,
        sellable,
        expiredStock: stock - sellable,
        nearestExpiry: s?.nearestExpiry ?? null,
        lowStock: sellable <= item.reorderLevel,
    };
}
async function createItem(input) {
    await (0, item_functions_1.isNameUnique)(input.name);
    const shape = (0, item_functions_1.resolveShape)(input);
    return postgres_1.prisma.item.create({
        data: {
            name: input.name,
            description: input.description ?? null,
            unit: input.unit,
            price: input.price,
            reorderLevel: input.reorderLevel,
            ...shape,
        },
    });
}
async function updateItem(id, input) {
    const current = await postgres_1.prisma.item.findUnique({ where: { id } });
    if (!current)
        throw new appError_1.default('Item not found', 404);
    const unit = input.unit ?? current.unit;
    const unitChanged = unit !== current.unit;
    if (unitChanged &&
        (await postgres_1.prisma.batch.count({ where: { itemId: id } })) > 0) {
        throw new appError_1.default('Unit cannot be changed after the item has stock movements', 409);
    }
    const shape = (0, item_functions_1.resolveShape)({
        unit,
        packName: input.packName !== undefined ? input.packName : current.packName,
        packSize: input.packSize !== undefined ? input.packSize : current.packSize,
    });
    if (input.name !== undefined &&
        input.name.toLowerCase() !== current.name.toLowerCase())
        await (0, item_functions_1.isNameUnique)(input.name);
    return postgres_1.prisma.item.update({
        where: { id },
        data: {
            name: input.name,
            description: input.description === undefined ? undefined : input.description,
            unit,
            price: input.price,
            reorderLevel: input.reorderLevel,
            ...shape,
        },
    });
}
async function setItemStatus(id, isActive) {
    const current = await postgres_1.prisma.item.findUnique({ where: { id } });
    if (!current)
        throw new appError_1.default('Item not found', 404);
    return postgres_1.prisma.item.update({
        where: { id },
        data: { isActive },
    });
}
async function listItems(q) {
    const where = {};
    if (q.search)
        where.name = { contains: q.search, mode: 'insensitive' };
    if (q.unit)
        where.unit = q.unit;
    if (q.active !== 'all')
        where.isActive = q.active === 'true';
    if (q.lowStock) {
        const candidates = await postgres_1.prisma.item.findMany({
            where,
            select: { id: true, reorderLevel: true },
        });
        const stock = await stockByItem(candidates.map((c) => c.id));
        where.id = {
            in: candidates
                .filter((i) => (stock.get(i.id)?.sellable ?? 0) <= i.reorderLevel)
                .map((i) => i.id),
        };
    }
    const [total, items] = await Promise.all([
        postgres_1.prisma.item.count({ where }),
        postgres_1.prisma.item.findMany({
            where,
            orderBy: { name: 'asc' },
            skip: (q.page - 1) * q.limit,
            take: q.limit,
        }),
    ]);
    const stock = await stockByItem(items.map((i) => i.id));
    return { items: items.map((i) => withStock(i, stock.get(i.id))), total };
}
async function getItem(id) {
    const item = await postgres_1.prisma.item.findUnique({ where: { id } });
    if (!item)
        throw new appError_1.default('Item not found', 404);
    const [stock, batches] = await Promise.all([
        stockByItem([id]),
        postgres_1.prisma.batch.findMany({
            where: { itemId: id, qtyRemaining: { gt: 0 } },
            orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
        }),
    ]);
    const today = (0, date_1.cairoToday)();
    return {
        ...withStock(item, stock.get(id)),
        batches: batches.map((b) => ({
            ...b,
            hasExpiry: (0, date_1.hasExpiry)(b.expiryDate),
            expired: (0, date_1.toYMD)(b.expiryDate) < today,
        })),
    };
}
