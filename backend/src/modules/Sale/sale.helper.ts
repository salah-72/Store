import appError from '@/common/utils/appError';
import { cairoStartOfDay } from '@/common/utils/date';
import { Prisma } from '@prisma/client';

export function resolveSaleDate(
  day: string | undefined,
  today: string,
  now = new Date(),
): Date {
  if (!day || day === today) return now;
  return new Date(cairoStartOfDay(day).getTime() + 12 * 60 * 60 * 1000);
}

export type PricedLine = {
  itemId: number;
  baseQty: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

export function priceLine(
  item: { price: Prisma.Decimal; priceBasis: number },
  l: { baseQty: number; price?: number; lineTotal?: number },
): { unitPrice: Prisma.Decimal; lineTotal: Prisma.Decimal } {
  if (l.lineTotal !== undefined) {
    const lineTotal = new Prisma.Decimal(l.lineTotal).toDecimalPlaces(2);
    return {
      lineTotal,
      unitPrice: lineTotal.div(l.baseQty).toDecimalPlaces(6),
    };
  }

  const price =
    l.price !== undefined ? new Prisma.Decimal(l.price) : item.price;
  return {
    lineTotal: new Prisma.Decimal(l.baseQty)
      .mul(price)
      .div(item.priceBasis)
      .toDecimalPlaces(2),
    unitPrice: price.div(item.priceBasis).toDecimalPlaces(6),
  };
}

export function saleTotals(
  subtotal: Prisma.Decimal,
  discount: Prisma.Decimal,
  paid: Prisma.Decimal,
  hasCustomer: boolean,
) {
  if (discount.gt(subtotal)) {
    throw new appError(
      `Discount (${discount.toString()}) cannot exceed the invoice subtotal (${subtotal.toString()})`,
      404,
    );
  }
  const total = subtotal.sub(discount);

  if (!hasCustomer && !paid.eq(total)) {
    throw new appError(
      'A sale without a customer must be paid in full: choose a customer for a credit sale',
      404,
    );
  }
  return { total };
}

export type FefoBatch = {
  id: number;
  qtyRemaining: number;
  unitCost: Prisma.Decimal;
};
export type Slice = {
  batchId: number;
  baseQty: number;
  unitCost: Prisma.Decimal;
};

export function planFefo(batches: FefoBatch[], need: number) {
  const slices: Slice[] = [];
  let left = need;
  for (const b of batches) {
    if (left <= 0) break;
    if (b.qtyRemaining <= 0) continue;
    const take = Math.min(left, b.qtyRemaining);
    slices.push({ batchId: b.id, baseQty: take, unitCost: b.unitCost });
    left -= take;
  }
  return { slices, missing: left };
}
