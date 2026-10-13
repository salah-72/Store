import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';
import {
  CreateSaleReturnInput,
  InvoiceLineInput,
} from './sale-return.validation';
import { Prisma } from '@prisma/client';
import { cairoDay, cairoToday, resolveDocDate } from '@/common/utils/date';
import {
  checkCashRefund,
  netFactor,
  proportionalValue,
  splitAmount,
} from '@/common/utils/money';
import { allocateToSlices } from './sale-return.helpers';
import { sumSlices } from '../Sale/sale.helper';

type Tx = Prisma.TransactionClient;
const D = (n: Prisma.Decimal.Value) => new Prisma.Decimal(n);
const ZERO = D(0);

type Row = {
  itemId: number;
  batchId: number;
  saleLineBatchId: number | null;
  baseQty: number;
  unitPrice: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

async function loadSale(tx: Tx, id: number) {
  return tx.sale.findUnique({
    where: { id },
    include: {
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { name: true } },
          batches: { orderBy: { id: 'asc' } },
        },
      },
    },
  });
}
type LoadedSale = NonNullable<Awaited<ReturnType<typeof loadSale>>>;

async function returnedBySlice(db: Tx, sale: LoadedSale) {
  const sliceIds = sale.lines.flatMap((l) => l.batches.map((b) => b.id));
  const rows = await db.saleReturnLine.groupBy({
    by: ['saleLineBatchId'],
    where: { saleLineBatchId: { in: sliceIds } },
    _sum: { baseQty: true },
  });
  const map = new Map<number, number>();
  for (const r of rows)
    if (r.saleLineBatchId !== null)
      map.set(r.saleLineBatchId, r._sum.baseQty ?? 0);
  return map;
}

export async function getSaleReturn(id: number) {
  const r = await prisma.saleReturn.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true } },
      sale: { select: { id: true, date: true, total: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: { select: { id: true, name: true, unit: true } },
          batch: { select: { id: true, expiryDate: true } },
        },
      },
    },
  });
  if (!r) throw new appError('Sale return not found', 404);
  return r;
}

export async function rowsFromInvoice(
  tx: Tx,
  sale: LoadedSale,
  lines: InvoiceLineInput[],
): Promise<Row[]> {
  const returned = await returnedBySlice(tx, sale);
  const factor = netFactor(sale.total, sale.total.add(sale.discount));
  const rows: Row[] = [];
  const seen = new Set<number>();

  for (const l of lines) {
    if (seen.has(l.saleLineId))
      throw new appError(
        `Invoice line ${l.saleLineId} appears twice: send it once`,
        400,
      );
    seen.add(l.saleLineId);

    const line = sale.lines.find((x) => x.id === l.saleLineId);
    if (!line)
      throw new appError(
        `Line ${l.saleLineId} does not belong to sale ${sale.id}`,
        400,
      );

    const { parts, missing } = allocateToSlices(
      line.batches.map((b) => ({
        id: b.id,
        batchId: b.batchId,
        room: b.baseQty - (returned.get(b.id) ?? 0),
      })),
      l.baseQty,
    );
    if (missing > 0) {
      const returnable = l.baseQty - missing;
      throw new appError(
        `Only ${returnable} of "${line.item.name}" can still be returned from this invoice`,
        409,
      );
    }

    const value = (
      l.lineTotal !== undefined
        ? D(l.lineTotal)
        : proportionalValue(line.lineTotal, line.baseQty, l.baseQty, factor)
    ).toDecimalPlaces(2);

    const shares = splitAmount(
      value,
      parts.map((p) => p.baseQty),
    );
    parts.forEach((p, i) =>
      rows.push({
        itemId: line.itemId,
        batchId: p.batchId,
        saleLineBatchId: p.sliceId,
        baseQty: p.baseQty,
        lineTotal: shares[i],
        unitPrice: shares[i].div(p.baseQty).toDecimalPlaces(6),
      }),
    );
  }
  return rows;
}

export async function createSaleReturn(input: CreateSaleReturnInput) {
  const today = cairoToday();

  const id = await prisma.$transaction(
    async (tx) => {
      const locked = await tx.sale.updateMany({
        where: { id: input.saleId },
        data: { total: { increment: 0 } },
      });
      if (locked.count === 0) throw new appError('Sale not found', 404);

      const sale = (await loadSale(tx, input.saleId))!;
      const customerId = sale.customerId;

      const date = resolveDocDate(input.date, today, 'Return date');

      const rows = await rowsFromInvoice(tx, sale, input.lines);

      const total = rows.reduce((s, r) => s.add(r.lineTotal), ZERO);
      const cash =
        input.cashRefund !== undefined
          ? D(input.cashRefund)
          : customerId === null
            ? total
            : ZERO;
      checkCashRefund(total, cash, customerId === null);

      const ret = await tx.saleReturn.create({
        data: {
          customerId,
          saleId: input.saleId,
          date,
          total,
          cashRefund: cash,
          note: input.note?.trim() || null,
        },
      });
      await tx.saleReturnLine.createMany({
        data: rows.map((r) => ({ returnId: ret.id, ...r })),
      });

      for (const [batchId, q] of sumSlices(rows)) {
        await tx.batch.update({
          where: { id: batchId },
          data: { qtyRemaining: { increment: q } },
        });
      }
      return ret.id;
    },
    { timeout: 40000 },
  );
  return getSaleReturn(id);
}
