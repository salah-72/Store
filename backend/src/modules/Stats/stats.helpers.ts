import { addDaysYMD } from '@/common/utils/date';
import { Prisma } from '@prisma/client';

export const monthStart = (today: string) => `${today.slice(0, 8)}01`;

type Dec = Prisma.Decimal;
const ZERO = new Prisma.Decimal(0);

export const costOf = (groups: { unitCost: Dec; qty: number }[]) =>
  groups
    .reduce((s, g) => s.add(g.unitCost.mul(g.qty)), ZERO)
    .toDecimalPlaces(2);

export type OverviewData = {
  sales: { count: number; total: Dec; discount: Dec; paid: Dec };
  saleReturns: { total: Dec; cashRefund: Dec };
  purchases: { count: number; total: Dec; discount: Dec; paid: Dec };
  purchaseReturns: { total: Dec; cashRefund: Dec };
  expenses: {
    total: Dec;
    byCategory: { category: string; amount: Dec; count: number }[];
  };
  customerPayments: Dec;
  supplierPayments: Dec;
  costSold: Dec;
  costReturned: Dec;
  writeOffCost: Dec;
};

export function assembleOverview(d: OverviewData) {
  const netSales = d.sales.total.sub(d.saleReturns.total);
  const cost = d.costSold.sub(d.costReturned);
  const grossProfit = netSales.sub(cost);
  const netProfit = grossProfit
    .sub(d.expenses.total)
    .add(d.purchases.discount)
    .sub(d.writeOffCost);

  const cashIn = d.sales.paid
    .add(d.customerPayments)
    .add(d.purchaseReturns.cashRefund);
  const cashOut = d.purchases.paid
    .add(d.supplierPayments)
    .add(d.saleReturns.cashRefund)
    .add(d.expenses.total);

  return {
    sales: {
      count: d.sales.count,
      subtotal: d.sales.total.add(d.sales.discount),
      discount: d.sales.discount,
      total: d.sales.total,
      returns: d.saleReturns.total,
      net: netSales,
    },
    cost: { sold: d.costSold, returned: d.costReturned, net: cost },
    grossProfit,
    expenses: d.expenses,
    purchaseDiscounts: d.purchases.discount,
    writeOffs: d.writeOffCost,
    netProfit,
    purchases: {
      count: d.purchases.count,
      subtotal: d.purchases.total.add(d.purchases.discount),
      discount: d.purchases.discount,
      total: d.purchases.total,
      returns: d.purchaseReturns.total,
      net: d.purchases.total.sub(d.purchaseReturns.total),
    },
    cashFlow: {
      in: cashIn,
      out: cashOut,
      net: cashIn.sub(cashOut),
      parts: {
        paidOnSales: d.sales.paid,
        customerPayments: d.customerPayments,
        supplierRefunds: d.purchaseReturns.cashRefund,
        paidOnPurchases: d.purchases.paid,
        supplierPayments: d.supplierPayments,
        customerRefunds: d.saleReturns.cashRefund,
        expenses: d.expenses.total,
      },
    },
  };
}

export function daysBetween(from: string, to: string) {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDaysYMD(d, 1)) out.push(d);
  return out;
}

export function bucketByDay(
  days: string[],
  sales: { date: Date; total: Dec }[],
  returns: { date: Date; total: Dec }[],
  dayOf: (d: Date) => string,
) {
  const m = new Map(
    days.map((day) => [day, { day, count: 0, sales: ZERO, returns: ZERO }]),
  );
  for (const s of sales) {
    const b = m.get(dayOf(s.date));
    if (b) {
      b.count += 1;
      b.sales = b.sales.add(s.total);
    }
  }
  for (const r of returns) {
    const b = m.get(dayOf(r.date));
    if (b) b.returns = b.returns.add(r.total);
  }
  return days.map((day) => {
    const b = m.get(day)!;
    return { ...b, net: b.sales.sub(b.returns) };
  });
}

export function rankTopItems(
  sold: { itemId: number; qty: number; revenue: Dec }[],
  returned: { itemId: number; qty: number }[],
  by: 'revenue' | 'quantity',
  limit: number,
) {
  const back = new Map(returned.map((r) => [r.itemId, r.qty]));
  return sold
    .map((s) => ({
      itemId: s.itemId,
      soldQty: s.qty,
      returnedQty: back.get(s.itemId) ?? 0,
      netQty: s.qty - (back.get(s.itemId) ?? 0),
      revenue: s.revenue,
    }))
    .sort(
      (a, b) =>
        (by === 'revenue' ? b.revenue.cmp(a.revenue) : b.netQty - a.netQty) ||
        a.itemId - b.itemId,
    )
    .slice(0, limit);
}
