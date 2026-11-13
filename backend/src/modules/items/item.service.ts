import {
  CreateItemInput,
  ItemSalesQuery,
  ListItemsQuery,
  UpdateItemInput,
} from './item.validation';
import { isNameUnique, resolveShape } from './item.functions';
import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';
import {
  addDaysYMD,
  cairoStartOfDay,
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

const ZERO = new Prisma.Decimal(0);
const dec = (v: string | null | undefined) => new Prisma.Decimal(v ?? 0);

/**
 * سجل مبيعات صنف: كل سطر بيع للصنف ده في الفواتير (الأحدث الأول)، مع إجماليات الفترة كلها
 * (مش بس الصفحة الحالية). الربح = إجمالي السطر - تكلفته (نفس حساب صفحة الفاتورة، قبل خصم الفاتورة).
 * المرتجعات بتتخصم في الصافي حسب تاريخ المرتجع.
 */
export async function listItemSales(id: number, q: ItemSalesQuery) {
  const item = await prisma.item.findUnique({
    where: { id },
    select: { id: true, name: true, unit: true, priceBasis: true },
  });
  if (!item) throw new appError('Item not found', 404);

  const range =
    q.from || q.to
      ? {
          ...(q.from ? { gte: cairoStartOfDay(q.from) } : {}),
          // اليوم الأخير كله
          ...(q.to ? { lt: cairoStartOfDay(addDaysYMD(q.to, 1)) } : {}),
        }
      : undefined;
  const where: Prisma.SaleLineWhereInput = {
    itemId: id,
    ...(range ? { sale: { date: range } } : {}),
  };

  // نفس الفلتر للـ SQL الخام (الإجماليات)
  const salesDate = Prisma.sql`${q.from ? Prisma.sql`AND s."date" >= ${cairoStartOfDay(q.from)}` : Prisma.empty} ${q.to ? Prisma.sql`AND s."date" < ${cairoStartOfDay(addDaysYMD(q.to, 1))}` : Prisma.empty}`;
  const returnsDate = Prisma.sql`${q.from ? Prisma.sql`AND r."date" >= ${cairoStartOfDay(q.from)}` : Prisma.empty} ${q.to ? Prisma.sql`AND r."date" < ${cairoStartOfDay(addDaysYMD(q.to, 1))}` : Prisma.empty}`;

  const [total, rows, soldAgg, soldCost, retAgg] = await Promise.all([
    prisma.saleLine.count({ where }),
    prisma.saleLine.findMany({
      where,
      orderBy: [{ sale: { date: 'desc' } }, { id: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        sale: {
          select: {
            id: true,
            date: true,
            customer: { select: { id: true, name: true } },
          },
        },
        batches: { select: { baseQty: true, unitCost: true } },
      },
    }),
    prisma.$queryRaw<
      { invoices: number; qty: number; revenue: string }[]
    >`SELECT COUNT(DISTINCT sl."saleId")::int AS invoices,
             COALESCE(SUM(sl."baseQty"), 0)::int AS qty,
             COALESCE(SUM(sl."lineTotal"), 0)::text AS revenue
      FROM "SaleLine" sl JOIN "Sale" s ON s."id" = sl."saleId"
      WHERE sl."itemId" = ${id} ${salesDate}`,
    prisma.$queryRaw<
      { cost: string }[]
    >`SELECT COALESCE(SUM(slb."baseQty" * slb."unitCost"), 0)::text AS cost
      FROM "SaleLineBatch" slb
      JOIN "SaleLine" sl ON sl."id" = slb."saleLineId"
      JOIN "Sale" s ON s."id" = sl."saleId"
      WHERE sl."itemId" = ${id} ${salesDate}`,
    prisma.$queryRaw<
      { qty: number; revenue: string; cost: string }[]
    >`SELECT COALESCE(SUM(rl."baseQty"), 0)::int AS qty,
             COALESCE(SUM(rl."lineTotal"), 0)::text AS revenue,
             COALESCE(SUM(rl."baseQty" * COALESCE(slb."unitCost", b."unitCost")), 0)::text AS cost
      FROM "SaleReturnLine" rl
      JOIN "SaleReturn" r ON r."id" = rl."returnId"
      JOIN "Batch" b ON b."id" = rl."batchId"
      LEFT JOIN "SaleLineBatch" slb ON slb."id" = rl."saleLineBatchId"
      WHERE rl."itemId" = ${id} ${returnsDate}`,
  ]);

  // المرتجع على كل سطر في الصفحة دي (عشان الفاتورة تظهر "رجع منها كذا")
  const returned = new Map<number, { qty: number; total: Prisma.Decimal }>();
  if (rows.length > 0) {
    const rl = await prisma.saleReturnLine.findMany({
      where: { saleLineBatch: { saleLineId: { in: rows.map((r) => r.id) } } },
      select: {
        baseQty: true,
        lineTotal: true,
        saleLineBatch: { select: { saleLineId: true } },
      },
    });
    for (const r of rl) {
      const key = r.saleLineBatch!.saleLineId;
      const cur = returned.get(key) ?? { qty: 0, total: ZERO };
      returned.set(key, {
        qty: cur.qty + r.baseQty,
        total: cur.total.add(r.lineTotal),
      });
    }
  }

  const sold = soldAgg[0];
  const soldRevenue = dec(sold.revenue);
  const soldCostD = dec(soldCost[0].cost).toDecimalPlaces(2);
  const ret = retAgg[0];
  const retRevenue = dec(ret.revenue);
  const retCost = dec(ret.cost).toDecimalPlaces(2);

  return {
    item,
    summary: {
      invoices: sold.invoices,
      soldQty: sold.qty,
      soldRevenue,
      soldCost: soldCostD,
      returnedQty: ret.qty,
      returnedRevenue: retRevenue,
      returnedCost: retCost,
      netQty: sold.qty - ret.qty,
      netRevenue: soldRevenue.sub(retRevenue),
      netProfit: soldRevenue.sub(retRevenue).sub(soldCostD.sub(retCost)),
    },
    lines: rows.map((l) => {
      const cost = l.batches
        .reduce((s, b) => s.add(b.unitCost.mul(b.baseQty)), ZERO)
        .toDecimalPlaces(2);
      const ret = returned.get(l.id);
      return {
        id: l.id,
        saleId: l.sale.id,
        date: l.sale.date,
        customer: l.sale.customer,
        baseQty: l.baseQty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        cost,
        profit: l.lineTotal.sub(cost),
        belowCost: l.lineTotal.lt(cost),
        returnedQty: ret?.qty ?? 0,
        returnedTotal: ret?.total ?? ZERO,
      };
    }),
    total,
  };
}
