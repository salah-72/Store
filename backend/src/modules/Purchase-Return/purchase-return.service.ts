import appError from '@/common/utils/appError';
import { prisma } from '@/config/postgres';
import {
  CreatePurchaseReturnInput,
  InvoiceLineInput,
  ListPurchaseReturnsQuery,
  UpdatePurchaseReturnInput,
} from './purchase-return.validation';
import {
  addDaysYMD,
  cairoDay,
  cairoStartOfDay,
  cairoToday,
  resolveDocDate,
} from '@/common/utils/date';
import {
  checkCashRefund,
  netFactor,
  proportionalValue,
} from '@/common/utils/money';
import { sumSlices } from '../Sale/sale.helper';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const ZERO = D(0);

type Row = {
  itemId: number;
  batchId: number;
  baseQty: number;
  lineTotal: Prisma.Decimal;
};

async function loadPurchase(db: Tx, id: number) {
  return db.purchase.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { name: true } },
          batch: { select: { qtyRemaining: true } },
        },
      },
    },
  });
}
type LoadedPurchase = NonNullable<Awaited<ReturnType<typeof loadPurchase>>>;

export async function getPurchaseReturn(id: number) {
  const r = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: {
      supplier: { select: { id: true, name: true } },
      purchase: { select: { id: true, date: true, total: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
          batch: { select: { id: true, expiryDate: true, qtyRemaining: true } },
        },
      },
    },
  });
  if (!r) throw new appError('Purchase return not found', 404);
  return r;
}

export function rowsFromInvoice(
  purchase: LoadedPurchase,
  returned: Map<number, number>,
  lines: InvoiceLineInput[],
): Row[] {
  const delivered = deliveredByBatch(purchase);
  const factor = netFactor(
    purchase.total,
    purchase.total.add(purchase.discount),
  );
  const rows: Row[] = [];
  const seen = new Set<number>();

  for (const l of lines) {
    if (seen.has(l.purchaseLineId)) {
      throw new appError(
        `Invoice line ${l.purchaseLineId} appears twice: send it once`,
        400,
      );
    }
    seen.add(l.purchaseLineId);

    const line = purchase.lines.find((x) => x.id === l.purchaseLineId);
    if (!line)
      throw new appError(
        `Line ${l.purchaseLineId} does not belong to purchase ${purchase.id}`,
        400,
      );

    const room =
      (delivered.get(line.batchId) ?? 0) - (returned.get(line.batchId) ?? 0);
    if (l.baseQty > room) {
      throw new appError(
        `Only ${Math.max(0, room)} of "${line.item.name}" can still be returned against this invoice`,
        409,
      );
    }
    returned.set(line.batchId, (returned.get(line.batchId) ?? 0) + l.baseQty);

    const value = proportionalValue(
      line.lineTotal,
      line.baseQty,
      l.baseQty,
      factor,
    );
    rows.push({
      itemId: line.itemId,
      batchId: line.batchId,
      baseQty: l.baseQty,
      lineTotal: value,
    });
  }
  return rows;
}

async function returnedByBatch(db: Tx, purchaseId: number) {
  const rows = await db.purchaseReturnLine.groupBy({
    by: ['batchId'],
    where: { purchaseReturn: { purchaseId } },
    _sum: { baseQty: true },
  });
  return new Map<number, number>(
    rows.map((r): [number, number] => [r.batchId, r._sum.baseQty ?? 0]),
  );
}

const deliveredByBatch = (purchase: LoadedPurchase) =>
  sumSlices(purchase.lines);

export async function createPurchaseReturn(input: CreatePurchaseReturnInput) {
  const today = cairoToday();

  const id = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.purchase.updateMany({
        where: { id: input.purchaseId },
        data: { total: { increment: 0 } },
      });
      if (locked.count === 0) throw new appError('Purchase not found', 404);
      const purchase = (await loadPurchase(tx, input.purchaseId))!;
      const supplierId = purchase.supplierId;

      const date = resolveDocDate(input.date, today, 'Return date');

      const rows = rowsFromInvoice(
        purchase,
        await returnedByBatch(tx, purchase.id),
        input.lines,
      );

      const total = rows.reduce((s, r) => s.add(r.lineTotal), ZERO);
      const cash = D(input.cashRefund ?? 0);
      checkCashRefund(total, cash, false);

      const ret = await tx.purchaseReturn.create({
        data: {
          supplierId,
          purchaseId: input.purchaseId,
          date,
          total,
          cashRefund: cash,
          note: input.note?.trim() || null,
        },
      });
      await tx.purchaseReturnLine.createMany({
        data: rows.map((r) => ({ returnId: ret.id, ...r })),
      });

      for (const [batchId, q] of sumSlices(rows)) {
        const r = await tx.batch.updateMany({
          where: { id: batchId, qtyRemaining: { gte: q } },
          data: { qtyRemaining: { decrement: q } },
        });
        if (r.count !== 1) {
          const b = await tx.batch.findUnique({
            where: { id: batchId },
            include: { item: { select: { name: true } } },
          });
          throw new appError(
            `Cannot return ${q} of "${b?.item.name}": only ${b?.qtyRemaining} are still in stock (the rest was sold)`,
            409,
          );
        }
      }
      return ret.id;
    },
    { timeout: 40000 },
  );

  return getPurchaseReturn(id);
}

export async function updatePurchaseReturn(
  id: number,
  input: UpdatePurchaseReturnInput,
) {
  const r = await prisma.purchaseReturn.findUnique({
    where: { id },
    include: { purchase: { select: { date: true } } },
  });

  if (!r) throw new appError('Purchase return not found', 404);

  const cash =
    input.cashRefund !== undefined ? D(input.cashRefund) : r.cashRefund;
  checkCashRefund(r.total, cash, false);

  let date: Date | undefined;
  if (input.date && input.date !== cairoDay(r.date)) {
    date = resolveDocDate(input.date, cairoToday(), 'Return date');
  }

  await prisma.purchaseReturn.update({
    where: { id },
    data: {
      cashRefund: cash,
      date,
      note: input.note === undefined ? undefined : input.note?.trim() || null,
    },
  });
  return getPurchaseReturn(id);
}

export async function deletePurchaseReturn(id: number) {
  await prisma.$transaction(async (tx) => {
    const r = await tx.purchaseReturn.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!r) throw new appError('Purchase return not found', 404);

    for (const [batchId, q] of sumSlices(r.lines)) {
      await tx.batch.update({
        where: { id: batchId },
        data: { qtyRemaining: { increment: q } },
      });
    }
    await tx.purchaseReturn.delete({ where: { id } });
  });
}

export async function listPurchaseReturns(q: ListPurchaseReturnsQuery) {
  const where: Prisma.PurchaseReturnWhereInput = {};
  if (q.supplierId) where.supplierId = q.supplierId;
  if (q.purchaseId) where.purchaseId = q.purchaseId;
  if (q.from || q.to) {
    where.date = {
      ...(q.from ? { gte: cairoStartOfDay(q.from) } : {}),
      ...(q.to ? { lt: cairoStartOfDay(addDaysYMD(q.to, 1)) } : {}),
    };
  }

  const [total, rows] = await Promise.all([
    prisma.purchaseReturn.count({ where }),
    prisma.purchaseReturn.findMany({
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
    returns: rows.map(({ _count, ...r }) => ({
      ...r,
      linesCount: _count.lines,
    })),
    total,
  };
}
