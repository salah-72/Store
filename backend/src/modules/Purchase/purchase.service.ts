import { prisma } from '@/config/postgres';
import {
  CreatePurchaseInput,
  ListPurchasesQuery,
  PurchaseLineInput,
  UpdatePurchaseInput,
} from './purchase.validation';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';
import {
  addDaysYMD,
  cairoDay,
  cairoStartOfDay,
  cairoToday,
  hasExpiry,
} from '@/common/utils/date';
import {
  batchDeltas,
  invoiceTotals,
  prepareLines,
  resolvePurchaseDate,
  returnCapViolations,
  sumByBatch,
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

export async function updatePurchase(id: number, input: UpdatePurchaseInput) {
  const today = cairoToday();

  await prisma.$transaction(
    async (tx) => {
      const locked = await tx.purchase.updateMany({
        where: { id },
        data: { total: { increment: 0 } },
      });
      if (locked.count === 0) throw new appError('Purchase not found', 404);

      const purchase = await tx.purchase.findUniqueOrThrow({
        where: { id },
        include: { lines: true },
      });

      const returnedRows = await tx.purchaseReturnLine.groupBy({
        by: ['batchId'],
        where: { purchaseReturn: { purchaseId: id } },
        _sum: { baseQty: true },
      });
      const returned = new Map<number, number>(
        returnedRows.map((r): [number, number] => [
          r.batchId,
          r._sum.baseQty ?? 0,
        ]),
      );
      const hasReturns =
        (await tx.purchaseReturn.count({ where: { purchaseId: id } })) > 0;

      if (
        input.supplierId !== undefined &&
        input.supplierId !== purchase.supplierId
      ) {
        if (hasReturns) {
          throw new appError(
            'This purchase has returns, so its supplier cannot change',
            400,
          );
        }
        const supplier = await tx.supplier.findUnique({
          where: { id: input.supplierId },
        });
        if (!supplier) throw new appError('Supplier not found', 404);
      }

      let subtotal = purchase.total.add(purchase.discount);
      if (input.lines) {
        const { prepared, subtotal: newSubtotal } = await prepareFromInput(
          tx,
          input.lines,
        );
        const withBatch = [];
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
              qtyReceived: 0,
              qtyRemaining: 0,
            },
            update: { qtyReceived: { increment: 0 } },
          });
          withBatch.push({ ...l, batchId: batch.id });
        }

        const oldQty = sumByBatch(purchase.lines);
        const newQty = sumByBatch(withBatch);

        const violated = returnCapViolations(returned, newQty);
        if (violated.length > 0) {
          throw new appError(
            'Part of this purchase was already returned to the supplier: keep at least the returned quantity, or delete the return first',
            400,
          );
        }

        for (const { batchId, delta } of batchDeltas(oldQty, newQty)) {
          if (delta > 0) {
            await tx.batch.update({
              where: { id: batchId },
              data: {
                qtyReceived: { increment: delta },
                qtyRemaining: { increment: delta },
              },
            });
            continue;
          }

          const need = -delta;
          const r = await tx.batch.updateMany({
            where: {
              id: batchId,
              qtyRemaining: { gte: need },
              qtyReceived: { gte: need },
            },
            data: {
              qtyReceived: { decrement: need },
              qtyRemaining: { decrement: need },
            },
          });
          if (r.count !== 1) {
            throw new appError(`Cannot take ${need} units of this item`, 400);
          }
        }

        await tx.purchaseLine.deleteMany({ where: { purchaseId: id } });
        await tx.purchaseLine.createMany({
          data: withBatch.map((l) => ({
            purchaseId: id,
            itemId: l.itemId,
            baseQty: l.baseQty,
            lineTotal: l.lineTotal,
            batchId: l.batchId,
          })),
        });
        subtotal = newSubtotal;
      }

      const discount =
        input.discount !== undefined
          ? new Prisma.Decimal(input.discount)
          : purchase.discount;
      const paid =
        input.paid !== undefined
          ? new Prisma.Decimal(input.paid)
          : purchase.paid;
      const { total } = invoiceTotals(subtotal, discount);

      await tx.purchase.update({
        where: { id },
        data: {
          supplierId: input.supplierId,
          discount,
          total,
          paid,
          note:
            input.note === undefined ? undefined : input.note?.trim() || null,
          date:
            input.date && input.date !== cairoDay(purchase.date)
              ? resolvePurchaseDate(input.date, today)
              : undefined,
        },
      });
    },
    { timeout: 40000 },
  );
  return getPurchase(id);
}

export async function listPurchases(q: ListPurchasesQuery) {
  const where: Prisma.PurchaseWhereInput = {};
  if (q.supplierId) where.supplierId = q.supplierId;
  if (q.from || q.to) {
    where.date = {
      ...(q.from ? { gte: cairoStartOfDay(q.from) } : {}),
      ...(q.to ? { lt: cairoStartOfDay(addDaysYMD(q.to, 1)) } : {}), // the whole "to" day
    };
  }

  const [total, rows] = await Promise.all([
    prisma.purchase.count({ where }),
    prisma.purchase.findMany({
      where,
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: {
        supplier: { select: { id: true, name: true } },
        _count: { select: { lines: true } },
      },
    }),
  ]);

  return {
    purchases: rows.map(({ _count, ...p }) => ({
      ...p,
      subtotal: p.total.add(p.discount),
      linesCount: _count.lines,
    })),
    total,
  };
}
