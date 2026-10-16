import {
  addDaysYMD,
  cairoDay,
  cairoStartOfDay,
  cairoToday,
} from '@/common/utils/date';
import {
  assembleOverview,
  bucketByDay,
  costOf,
  daysBetween,
  expiredBatches,
  ItemRow,
  lastDays,
  lowStockItems,
  monthStart,
  nearExpiryBatches,
  OverviewData,
  rankTopItems,
  staleItems,
  summarizeStock,
  topOwed,
} from './stats.helpers';
import { prisma } from '@/config/postgres';
import { Prisma } from '@prisma/client';
import { summariesFor as supplierSummaries } from '../Suppliers/supplier.service';
import { summariesFor as customerSummaries } from '../Customers/customer.service';
import {
  DashboardQuery,
  SalesByDayQuery,
  StaleStockQuery,
  TopItemsQuery,
} from './stats.validation';

const ZERO = new Prisma.Decimal(0);
const sum = (v: Prisma.Decimal | null | undefined) => v ?? ZERO;

const rangeOf = (from: string, to: string) => ({
  gte: cairoStartOfDay(from),
  lt: cairoStartOfDay(addDaysYMD(to, 1)),
});

async function costByBatch(ids: number[]) {
  const map = new Map<number, Prisma.Decimal>();
  if (ids.length === 0) return map;
  const rows = await prisma.batch.findMany({
    where: { id: { in: ids } },
    select: { id: true, unitCost: true },
  });
  for (const b of rows) map.set(b.id, b.unitCost);
  return map;
}

async function fetchOverviewData(
  from: string,
  to: string,
): Promise<OverviewData> {
  const date = rangeOf(from, to);

  const [
    sales,
    saleReturns,
    purchases,
    purchaseReturns,
    expenses,
    byCategory,
    customerPay,
    supplierPay,
    soldCost,
    returnedLines,
    writtenOff,
  ] = await Promise.all([
    prisma.sale.aggregate({
      where: { date },
      _sum: { total: true, discount: true, paid: true },
      _count: { _all: true },
    }),
    prisma.saleReturn.aggregate({
      where: { date },
      _sum: { total: true, cashRefund: true },
    }),
    prisma.purchase.aggregate({
      where: { date },
      _sum: { total: true, discount: true, paid: true },
      _count: { _all: true },
    }),
    prisma.purchaseReturn.aggregate({
      where: { date },
      _sum: { total: true, cashRefund: true },
    }),
    prisma.expense.aggregate({ where: { date }, _sum: { amount: true } }),
    prisma.expense.groupBy({
      by: ['category'],
      where: { date },
      _sum: { amount: true },
      _count: { _all: true },
      orderBy: { _sum: { amount: 'desc' } },
    }),
    prisma.payment.aggregate({
      where: { date, customerId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { date, supplierId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.saleLineBatch.groupBy({
      by: ['unitCost'],
      where: { saleLine: { sale: { date } } },
      _sum: { baseQty: true },
    }),
    prisma.saleReturnLine.groupBy({
      by: ['batchId'],
      where: { saleReturn: { date } },
      _sum: { baseQty: true },
    }),
    prisma.stockAdjustment.groupBy({
      by: ['batchId'],
      where: { date },
      _sum: { baseQty: true },
    }),
  ]);

  const costs = await costByBatch([
    ...returnedLines.map((r) => r.batchId),
    ...writtenOff.map((w) => w.batchId),
  ]);
  const costOfBatches = (
    rows: { batchId: number; _sum: { baseQty: number | null } }[],
  ) =>
    costOf(
      rows.map((r) => ({
        unitCost: costs.get(r.batchId) ?? ZERO,
        qty: r._sum.baseQty ?? 0,
      })),
    );

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
    costSold: costOf(
      soldCost.map((g) => ({ unitCost: g.unitCost, qty: g._sum.baseQty ?? 0 })),
    ),
    costReturned: costOfBatches(returnedLines),
    writeOffCost: costOfBatches(writtenOff),
  };
}

export async function getOverview(from?: string, to?: string) {
  const today = cairoToday();
  const start = from ?? monthStart(today);
  const end = to ?? today;
  return {
    period: { from: start, to: end },
    ...assembleOverview(await fetchOverviewData(start, end)),
  };
}

async function salesPerDay(days: string[]) {
  const date = {
    gte: cairoStartOfDay(days[0]),
    lt: cairoStartOfDay(addDaysYMD(days[days.length - 1], 1)),
  };
  const [sales, returns] = await Promise.all([
    prisma.sale.findMany({
      where: { date },
      select: { date: true, total: true },
    }),
    prisma.saleReturn.findMany({
      where: { date },
      select: { date: true, total: true },
    }),
  ]);
  return bucketByDay(days, sales, returns, cairoDay);
}

export async function getSalesByDay(q: SalesByDayQuery) {
  const today = cairoToday();
  const to = q.to ?? today;
  const from = q.from ?? addDaysYMD(to, -29);
  const days = await salesPerDay(daysBetween(from, to));

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

export async function getTopItems(q: TopItemsQuery) {
  const today = cairoToday();
  const from = q.from ?? monthStart(today);
  const to = q.to ?? today;
  const date = rangeOf(from, to);

  const [sold, returned] = await Promise.all([
    prisma.saleLine.groupBy({
      by: ['itemId'],
      where: { sale: { date } },
      _sum: { baseQty: true, lineTotal: true },
    }),
    prisma.saleReturnLine.groupBy({
      by: ['itemId'],
      where: { saleReturn: { date } },
      _sum: { baseQty: true },
    }),
  ]);

  const ranked = rankTopItems(
    sold.map((s) => ({
      itemId: s.itemId,
      qty: s._sum.baseQty ?? 0,
      revenue: sum(s._sum.lineTotal),
    })),
    returned.map((r) => ({ itemId: r.itemId, qty: r._sum.baseQty ?? 0 })),
    q.by,
    q.limit,
  );

  const items = await prisma.item.findMany({
    where: { id: { in: ranked.map((r) => r.itemId) } },
    select: { id: true, name: true, unit: true },
  });
  const byId = new Map(items.map((i) => [i.id, i] as const));

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

const todayAsDate = (today: string) => new Date(`${today}T00:00:00.000Z`);

export async function getStaleStock(q: StaleStockQuery) {
  const today = cairoToday();
  const since = { gte: cairoStartOfDay(addDaysYMD(today, -q.days)) };

  const [batches, items, soldRecently, boughtRecently] = await Promise.all([
    prisma.batch.findMany({
      where: { qtyRemaining: { gt: 0 } },
      select: {
        id: true,
        itemId: true,
        qtyRemaining: true,
        unitCost: true,
        expiryDate: true,
      },
    }),
    prisma.item.findMany({
      select: {
        id: true,
        name: true,
        unit: true,
        reorderLevel: true,
        isActive: true,
      },
    }),
    prisma.saleLine.groupBy({
      by: ['itemId'],
      where: { sale: { date: since } },
      _count: { _all: true },
    }),
    prisma.purchaseLine.groupBy({
      by: ['itemId'],
      where: { purchase: { date: since } },
      _count: { _all: true },
    }),
  ]);

  const recent = new Set<number>(
    [...soldRecently, ...boughtRecently].map((r) => r.itemId),
  );
  const { byItem } = summarizeStock(batches, todayAsDate(today));
  const rows = staleItems(items, byItem, recent);

  return {
    days: q.days,
    count: rows.length,
    value: rows.reduce((s, r) => s.add(r.value), ZERO),
    items: rows.slice(0, q.limit),
  };
}

export async function getDashboard(q: DashboardQuery) {
  const today = cairoToday();
  const todayDate = todayAsDate(today);
  const todayRange = rangeOf(today, today);

  const [
    month,
    salesToday,
    returnsToday,
    last7Days,
    customers,
    suppliers,
    batches,
    itemRows,
  ] = await Promise.all([
    getOverview(monthStart(today), today),
    prisma.sale.aggregate({
      where: { date: todayRange },
      _sum: { total: true },
      _count: { _all: true },
    }),
    prisma.saleReturn.aggregate({
      where: { date: todayRange },
      _sum: { total: true },
    }),
    salesPerDay(lastDays(today, 7)),
    prisma.customer.findMany({
      select: { id: true, name: true, openingBalance: true },
    }),
    prisma.supplier.findMany({
      select: { id: true, name: true, openingBalance: true },
    }),
    prisma.batch.findMany({
      where: { qtyRemaining: { gt: 0 } },
      select: {
        id: true,
        itemId: true,
        qtyRemaining: true,
        unitCost: true,
        expiryDate: true,
      },
    }),
    prisma.item.findMany({
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
    customerSummaries(customers),
    supplierSummaries(suppliers),
  ]);
  const receivables = topOwed(
    customers.map((c) => ({
      id: c.id,
      name: c.name,
      remaining: customerSums.get(c.id)!.remaining,
    })),
    5,
  );
  const payables = topOwed(
    suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      remaining: supplierSums.get(s.id)!.remaining,
    })),
    5,
  );

  const items = new Map<number, ItemRow>(
    itemRows.map((i): [number, ItemRow] => [i.id, i]),
  );
  const { byItem, value, expiredValue } = summarizeStock(batches, todayDate);
  const low = lowStockItems(itemRows, byItem);
  const near = nearExpiryBatches(batches, items, todayDate, q.expiryDays);
  const expired = expiredBatches(batches, items, todayDate);

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
