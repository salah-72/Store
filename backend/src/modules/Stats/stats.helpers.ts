import { addDaysYMD, EXPIRY_CUTOFF } from '@/common/utils/date';
import { Prisma } from '@prisma/client';

export const monthStart = (today: string) => `${today.slice(0, 8)}01`;
export const lastDays = (today: string, n: number) =>
  Array.from({ length: n }, (_, i) => addDaysYMD(today, i - (n - 1)));

type Dec = Prisma.Decimal;
const ZERO = new Prisma.Decimal(0);
const dayMs = 86_400_000;

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

export type StockBatch = {
  id: number;
  itemId: number;
  qtyRemaining: number;
  unitCost: Dec;
  expiryDate: Date;
};
export type ItemRow = {
  id: number;
  name: string;
  unit: string;
  reorderLevel: number;
  isActive: boolean;
};
export type ItemStock = {
  stock: number;
  sellable: number;
  expiredStock: number;
  value: Dec;
  expiredValue: Dec;
};

export const emptyStock = (): ItemStock => ({
  stock: 0,
  sellable: 0,
  expiredStock: 0,
  value: ZERO,
  expiredValue: ZERO,
});

export function summarizeStock(batches: StockBatch[], today: Date) {
  const byItem = new Map<number, ItemStock>();
  let value = ZERO;
  let expiredValue = ZERO;

  for (const b of batches) {
    if (b.qtyRemaining <= 0) continue;
    const s = byItem.get(b.itemId) ?? emptyStock();
    const v = b.unitCost.mul(b.qtyRemaining);
    s.stock += b.qtyRemaining;
    s.value = s.value.add(v);
    if (b.expiryDate <= today) {
      s.expiredStock += b.qtyRemaining;
      s.expiredValue = s.expiredValue.add(v);
      expiredValue = expiredValue.add(v);
    } else {
      s.sellable += b.qtyRemaining;
    }
    value = value.add(v);
    byItem.set(b.itemId, s);
  }
  for (const s of byItem.values()) {
    s.value = s.value.toDecimalPlaces(2);
    s.expiredValue = s.expiredValue.toDecimalPlaces(2);
  }
  return {
    byItem,
    value: value.toDecimalPlaces(2),
    expiredValue: expiredValue.toDecimalPlaces(2),
  };
}

export function staleItems(
  items: ItemRow[],
  byItem: Map<number, ItemStock>,
  activeIds: Set<number>,
) {
  return items
    .filter(
      (i) =>
        i.isActive &&
        !activeIds.has(i.id) &&
        (byItem.get(i.id)?.sellable ?? 0) > 0,
    )
    .map((i) => {
      const s = byItem.get(i.id)!;
      return {
        itemId: i.id,
        name: i.name,
        unit: i.unit,
        sellable: s.sellable,
        value: s.value.sub(s.expiredValue),
      };
    })
    .sort((a, b) => b.value.cmp(a.value) || a.itemId - b.itemId);
}

export function topOwed(
  rows: { id: number; name: string; remaining: Dec }[],
  limit: number,
) {
  const owed = rows
    .filter((r) => r.remaining.gt(0))
    .sort((a, b) => b.remaining.cmp(a.remaining) || a.id - b.id);
  return {
    total: owed.reduce((s, r) => s.add(r.remaining), ZERO),
    count: owed.length,
    top: owed.slice(0, limit),
  };
}

export function lowStockItems(
  items: ItemRow[],
  byItem: Map<number, ItemStock>,
) {
  return items
    .filter(
      (i) =>
        i.isActive &&
        i.reorderLevel > 0 &&
        (byItem.get(i.id)?.sellable ?? 0) <= i.reorderLevel,
    )
    .map((i) => ({
      itemId: i.id,
      name: i.name,
      unit: i.unit,
      reorderLevel: i.reorderLevel,
      sellable: byItem.get(i.id)?.sellable ?? 0,
    }))
    .sort(
      (a, b) =>
        a.sellable / a.reorderLevel - b.sellable / b.reorderLevel ||
        a.itemId - b.itemId,
    );
}

export function nearExpiryBatches(
  batches: StockBatch[],
  items: Map<number, ItemRow>,
  today: Date,
  days: number,
) {
  const limit = today.getTime() + days * dayMs;
  return batches
    .filter(
      (b) =>
        b.qtyRemaining > 0 &&
        b.expiryDate > today &&
        b.expiryDate.getTime() <= limit &&
        b.expiryDate < EXPIRY_CUTOFF,
    )
    .sort(
      (a, b) => a.expiryDate.getTime() - b.expiryDate.getTime() || a.id - b.id,
    )
    .map((b) => ({
      batchId: b.id,
      itemId: b.itemId,
      name: items.get(b.itemId)?.name ?? '',
      expiryDate: b.expiryDate,
      daysLeft: Math.round((b.expiryDate.getTime() - today.getTime()) / dayMs),
      qtyRemaining: b.qtyRemaining,
      value: b.unitCost.mul(b.qtyRemaining).toDecimalPlaces(2),
    }));
}

export function expiredBatches(
  batches: StockBatch[],
  items: Map<number, ItemRow>,
  today: Date,
) {
  return batches
    .filter((b) => b.qtyRemaining > 0 && b.expiryDate <= today)
    .map((b) => ({
      batchId: b.id,
      itemId: b.itemId,
      name: items.get(b.itemId)?.name ?? '',
      expiryDate: b.expiryDate,
      qtyRemaining: b.qtyRemaining,
      value: b.unitCost.mul(b.qtyRemaining).toDecimalPlaces(2),
    }))
    .sort((a, b) => b.value.cmp(a.value) || a.batchId - b.batchId);
}
