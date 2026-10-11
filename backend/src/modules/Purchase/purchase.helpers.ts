import { cairoStartOfDay, cairoToday, NO_EXPIRY } from '@/common/utils/date';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';
import { PurchaseLineInput } from './purchase.validation';

export type ItemInfo = { id: number; name: string; packSize: number | null };

export function resolvePurchaseDate(
  day: string | undefined,
  today: string,
  now = new Date(),
): Date {
  if (!day || day === today) return now;
  if (day > today)
    throw new appError('Purchase date cannot be in the future', 400);
  return new Date(cairoStartOfDay(day).getTime() + 12 * 60 * 60 * 1000);
}

export type PreparedLine = {
  itemId: number;
  baseQty: number;
  lineTotal: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  expiryDate: Date;
};

const MAX_QTY = 2_000_000_000;

export function prepareLines(
  lines: PurchaseLineInput[],
  items: Map<number, ItemInfo>,
  today: string,
): PreparedLine[] {
  return lines.map((l, index) => {
    const item = items.get(l.itemId);
    if (!item)
      throw new appError(`Line ${index + 1}: item ${l.itemId} not found`, 404);

    let baseQty: number;
    if (l.packs !== undefined) {
      if (!item.packSize) {
        throw new appError(
          `Line ${index + 1}: "${item.name}" has no pack size, send baseQty instead`,
          400,
        );
      }
      const q = new Prisma.Decimal(l.packs).mul(item.packSize);
      if (!q.isInteger()) {
        throw new appError(
          `Line ${index + 1}: ${l.packs} packs of "${item.name}" is not a whole number of units`,
          400,
        );
      }
      baseQty = q.toNumber();
    } else {
      baseQty = l.baseQty as number;
    }
    if (baseQty <= 0 || baseQty > MAX_QTY) {
      throw new appError(`Line ${index + 1}: quantity is out of range`, 400);
    }

    const lineTotal = new Prisma.Decimal(l.lineTotal);
    const unitCost = lineTotal.div(baseQty).toDecimalPlaces(6);

    let expiryDate = NO_EXPIRY;
    if (l.expiryDate !== null) {
      if (l.expiryDate <= today) {
        throw new appError(
          `Line ${index + 1}: "${item.name}" is already expired (${l.expiryDate})`,
          400,
        );
      }
      expiryDate = new Date(`${l.expiryDate}T00:00:00.000Z`);
    }

    return { itemId: l.itemId, baseQty, lineTotal, unitCost, expiryDate };
  });
}

export function invoiceTotals(
  subtotal: Prisma.Decimal,
  discount: Prisma.Decimal,
) {
  if (discount.gt(subtotal)) {
    throw new appError(
      `Discount (${discount.toString()}) cannot exceed the invoice subtotal (${subtotal.toString()})`,
      400,
    );
  }
  const total = subtotal.sub(discount);

  return { total };
}
