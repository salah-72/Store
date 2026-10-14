import { cairoDay, cairoToday, resolveDocDate } from '@/common/utils/date';
import {
  CreateAdjustmentInput,
  UpdateAdjustmentInput,
} from './adjustment.validation';
import { prisma } from '@/config/postgres';
import { Prisma } from '@prisma/client';
import appError from '@/common/utils/appError';

type Tx = Prisma.TransactionClient;
const ZERO = new Prisma.Decimal(0);

const detail = {
  item: { select: { id: true, name: true, unit: true } },
  batch: { select: { id: true, expiryDate: true, unitCost: true } },
} as const;

const adjustmentValue = (baseQty: number, unitCost: Prisma.Decimal) =>
  unitCost.mul(baseQty).toDecimalPlaces(2);

export async function removeStock(
  tx: Tx,
  a: { batchId: number; baseQty: number; reason: string; date: Date },
) {
  const batch = await tx.batch.findUnique({
    where: { id: a.batchId },
    select: { id: true, itemId: true },
  });
  if (!batch) throw new appError('Batch not found', 404);

  const r = await tx.batch.updateMany({
    where: { id: batch.id, qtyRemaining: { gte: a.baseQty } },
    data: { qtyRemaining: { decrement: a.baseQty } },
  });
  if (r.count !== 1) {
    const now = await tx.batch.findUnique({
      where: { id: batch.id },
      select: { qtyRemaining: true },
    });
    throw new appError(
      `Cannot take out ${a.baseQty}: only ${now?.qtyRemaining ?? 0} are in stock in this batch`,
      409,
    );
  }

  return tx.stockAdjustment.create({
    data: {
      itemId: batch.itemId,
      batchId: batch.id,
      baseQty: a.baseQty,
      reason: a.reason,
      date: a.date,
    },
  });
}

export async function createAdjustment(input: CreateAdjustmentInput) {
  const date = resolveDocDate(input.date, cairoToday(), 'Adjustment date');
  const id = await prisma.$transaction(
    async (tx) => (await removeStock(tx, { ...input, date })).id,
  );
  return getAdjustment(id);
}

export async function getAdjustment(id: number) {
  const r = await prisma.stockAdjustment.findUnique({
    where: { id },
    include: detail,
  });
  if (!r) throw new appError('Stock adjustment not found', 404);
  return { ...r, value: adjustmentValue(r.baseQty, r.batch.unitCost) };
}

export async function updateAdjustment(
  id: number,
  input: UpdateAdjustmentInput,
) {
  const current = await prisma.stockAdjustment.findUnique({
    where: { id },
    select: { date: true },
  });
  if (!current) throw new appError('Stock adjustment not found', 404);

  await prisma.stockAdjustment.update({
    where: { id },
    data: {
      reason: input.reason,
      date:
        input.date && input.date !== cairoDay(current.date)
          ? resolveDocDate(input.date, cairoToday(), 'Adjustment date')
          : undefined,
    },
  });
  return getAdjustment(id);
}

export async function deleteAdjustment(id: number) {
  await prisma.$transaction(async (tx) => {
    const adj = await tx.stockAdjustment.findUnique({ where: { id } });
    if (!adj) throw new appError('Stock adjustment not found', 404);

    await tx.batch.update({
      where: { id: adj.batchId },
      data: { qtyRemaining: { increment: adj.baseQty } },
    });
    await tx.stockAdjustment.delete({ where: { id } });
  });
}
