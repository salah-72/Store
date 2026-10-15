import { addDaysYMD, cairoStartOfDay, cairoToday } from '@/common/utils/date';
import {
  assembleOverview,
  costOf,
  monthStart,
  OverviewData,
} from './stats.helpers';
import { prisma } from '@/config/postgres';
import { Prisma } from '@prisma/client';

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
