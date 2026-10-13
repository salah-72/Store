import { Prisma } from '@prisma/client';
import appError from './appError';

const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);

export const netFactor = (total: Prisma.Decimal, subtotal: Prisma.Decimal) =>
  subtotal.isZero() ? D(1) : total.div(subtotal);

export const proportionalValue = (
  lineTotal: Prisma.Decimal,
  lineQty: number,
  qty: number,
  factor: Prisma.Decimal = D(1),
) => lineTotal.mul(qty).div(lineQty).mul(factor).toDecimalPlaces(2);

export function splitAmount(
  total: Prisma.Decimal,
  weights: number[],
): Prisma.Decimal[] {
  const sumW = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || sumW <= 0)
    throw new Error('splitAmount: weights must be positive');

  const cents = total.toDecimalPlaces(2).mul(100);
  const raw = weights.map((w) => cents.mul(w).div(sumW));
  const floors = raw.map((r) =>
    r.toDecimalPlaces(0, Prisma.Decimal.ROUND_DOWN),
  );

  const left = cents.sub(floors.reduce((a, f) => a.add(f), D(0))).toNumber(); // cents still to hand out
  const order = raw
    .map((r, i) => ({ i, frac: r.sub(floors[i]) }))
    .sort((a, b) => b.frac.cmp(a.frac) || a.i - b.i);
  for (let k = 0; k < left; k++) {
    const i = order[k % weights.length].i;
    floors[i] = floors[i].add(1);
  }
  return floors.map((f) => f.div(100));
}

export function checkCashRefund(
  total: Prisma.Decimal,
  cash: Prisma.Decimal,
  mustRefundAll: boolean,
) {
  if (cash.lt(0) || cash.gt(total)) {
    throw new appError(
      `Cash refund must be between 0 and the return total (${total.toString()})`,
      400,
    );
  }
  if (mustRefundAll && !cash.eq(total)) {
    throw new appError(
      'A return without a customer account must be refunded in cash in full',
      400,
    );
  }
}
