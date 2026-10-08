import {
  CreateItemInput,
  ListItemsQuery,
  UpdateItemInput,
} from './item.validation';
import { isNameUnique, resolveShape } from './item.functions';
import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';
import {
  cairoToday,
  EXPIRY_CUTOFF,
  toYMD,
  hasExpiry,
} from '@/common/utils/date';

type StockRow = {
  itemId: number;
  stock: number;
  sellable: number;
  nearestExpiry: Date | null;
};

async function stockByItem(ids: number[]) {
  const map = new Map<number, StockRow>();
  if (ids.length === 0) return map;

  const today = new Date(`${cairoToday()}T00:00:00.000Z`);
  const withStockOnly = { itemId: { in: ids }, qtyRemaining: { gt: 0 } };

  const [all, notExpired, withExpiry] = await Promise.all([
    prisma.batch.groupBy({
      by: ['itemId'],
      where: withStockOnly,
      _sum: { qtyRemaining: true },
    }),
    prisma.batch.groupBy({
      by: ['itemId'],
      where: { ...withStockOnly, expiryDate: { gte: today } },
      _sum: { qtyRemaining: true },
    }),
    prisma.batch.groupBy({
      by: ['itemId'],
      where: { ...withStockOnly, expiryDate: { lt: EXPIRY_CUTOFF } },
      _min: { expiryDate: true },
    }),
  ]);

  const sellable = new Map<number, number>(
    notExpired.map((r): [number, number] => [
      r.itemId,
      r._sum.qtyRemaining ?? 0,
    ]),
  );
  const nearest = new Map<number, Date | null>(
    withExpiry.map((r): [number, Date | null] => [r.itemId, r._min.expiryDate]),
  );

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

function withStock<T extends { reorderLevel: number }>(item: T, s?: StockRow) {
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

export async function createItem(input: CreateItemInput) {
  await isNameUnique(input.name);
  const shape = resolveShape(input);

  return prisma.item.create({
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

export async function updateItem(id: number, input: UpdateItemInput) {
  const current = await prisma.item.findUnique({ where: { id } });
  if (!current) throw new appError('Item not found', 404);

  const unit = input.unit ?? current.unit;
  const unitChanged = unit !== current.unit;
  if (
    unitChanged &&
    (await prisma.batch.count({ where: { itemId: id } })) > 0
  ) {
    throw new appError(
      'Unit cannot be changed after the item has stock movements',
      409,
    );
  }

  const shape = resolveShape({
    unit,
    packName: input.packName !== undefined ? input.packName : current.packName,
    packSize: input.packSize !== undefined ? input.packSize : current.packSize,
  });

  if (
    input.name !== undefined &&
    input.name.toLowerCase() !== current.name.toLowerCase()
  )
    await isNameUnique(input.name);

  return prisma.item.update({
    where: { id },
    data: {
      name: input.name,
      description:
        input.description === undefined ? undefined : input.description,
      unit,
      price: input.price,
      reorderLevel: input.reorderLevel,
      ...shape,
    },
  });
}

export async function setItemStatus(id: number, isActive: boolean) {
  const current = await prisma.item.findUnique({ where: { id } });
  if (!current) throw new appError('Item not found', 404);

  return prisma.item.update({
    where: { id },
    data: { isActive },
  });
}

export async function listItems(q: ListItemsQuery) {
  const where: Prisma.ItemWhereInput = {};
  if (q.search) where.name = { contains: q.search, mode: 'insensitive' };
  if (q.unit) where.unit = q.unit;
  if (q.active !== 'all') where.isActive = q.active === 'true';

  if (q.lowStock) {
    const candidates = await prisma.item.findMany({
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
    prisma.item.count({ where }),
    prisma.item.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ]);

  const stock = await stockByItem(items.map((i) => i.id));
  return { items: items.map((i) => withStock(i, stock.get(i.id))), total };
}

export async function getItem(id: number) {
  const item = await prisma.item.findUnique({ where: { id } });
  if (!item) throw new appError('Item not found', 404);

  const [stock, batches] = await Promise.all([
    stockByItem([id]),
    prisma.batch.findMany({
      where: { itemId: id, qtyRemaining: { gt: 0 } },
      orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const today = cairoToday();
  return {
    ...withStock(item, stock.get(id)),
    batches: batches.map((b) => ({
      ...b,
      hasExpiry: hasExpiry(b.expiryDate),
      expired: toYMD(b.expiryDate) < today,
    })),
  };
}
