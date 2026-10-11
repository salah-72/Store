import { prisma } from '@/config/postgres';
import { CreatePurchaseInput, PurchaseLineInput } from './purchase.validation';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';
import { cairoToday, hasExpiry } from '@/common/utils/date';
import {
  invoiceTotals,
  prepareLines,
  resolvePurchaseDate,
} from './purchase.helpers';

async function prepareFromInput(
  db: Prisma.TransactionClient,
  lines: PurchaseLineInput[],
) {
  const itemIds = [...new Set(lines.map((l) => l.itemId))];
  const items = await db.item.findMany({
    where: { id: { in: itemIds } },
    select: { id: true, name: true, packSize: true },
  });

  const prepared = prepareLines(
    lines,
    new Map(items.map((i) => [i.id, i])),
    cairoToday(),
  );
  const subtotal = prepared.reduce(
    (s, l) => s.add(l.lineTotal),
    new Prisma.Decimal(0),
  );
  return { prepared, subtotal };
}

export async function createPurchase(input: CreatePurchaseInput) {
  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplierId },
  });
  if (!supplier) throw new appError('Supplier not found', 404);

  const { prepared, subtotal } = await prepareFromInput(prisma, input.lines);
  const date = resolvePurchaseDate(input.date, cairoToday());

  const discount = new Prisma.Decimal(input.discount);
  const paid = new Prisma.Decimal(input.paid);

  const { total } = invoiceTotals(subtotal, discount);

  const id = await prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.create({
        data: {
          supplierId: input.supplierId,
          date,
          discount,
          total,
          paid,
          note: input.note?.trim() || null,
        },
      });

      for (const l of prepared) {
        const batch = await tx.batch.upsert({
          where: {
            itemId_expiryDate_unitCost: {
              itemId: l.itemId,
              expiryDate: l.expiryDate,
              unitCost: l.unitCost,
            },
          },
          create: {
            itemId: l.itemId,
            expiryDate: l.expiryDate,
            unitCost: l.unitCost,
            qtyReceived: l.baseQty,
            qtyRemaining: l.baseQty,
          },
          update: {
            qtyReceived: { increment: l.baseQty },
            qtyRemaining: { increment: l.baseQty },
          },
        });

        await tx.purchaseLine.create({
          data: {
            purchaseId: purchase.id,
            itemId: l.itemId,
            baseQty: l.baseQty,
            lineTotal: l.lineTotal,
            batchId: batch.id,
          },
        });
      }
      return purchase.id;
    },
    { timeout: 30000 },
  );

  return getPurchase(id);
}

export async function getPurchase(id: number) {
  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              unit: true,
              packName: true,
              packSize: true,
            },
          },
          batch: {
            select: {
              id: true,
              expiryDate: true,
              unitCost: true,
              qtyRemaining: true,
            },
          },
        },
      },
      purchaseReturns: {
        select: { id: true, date: true, total: true, cashRefund: true },
      },
    },
  });
  if (!purchase) throw new appError('Purchase not found', 404);

  return {
    ...purchase,
    subtotal: purchase.total.add(purchase.discount),
    lines: purchase.lines.map((l) => ({
      ...l,
      packs: l.item.packSize ? l.baseQty / l.item.packSize : null,
      hasExpiry: hasExpiry(l.batch.expiryDate),
    })),
  };
}
