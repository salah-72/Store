import { cairoToday } from '@/common/utils/date';
import { CreateSaleInput, SaleLineInput } from './sale.validation';
import {
  planFefo,
  PricedLine,
  priceLine,
  resolveSaleDate,
  saleTotals,
  Slice,
} from './sale.helper';
import { prisma } from '@/config/postgres';
import appError from '@/common/utils/appError';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;
const ZERO = new Prisma.Decimal(0);
const todayAsDate = (today: string) => new Date(`${today}T00:00:00.000Z`);

type ItemRow = {
  id: number;
  name: string;
  price: Prisma.Decimal;
  priceBasis: number;
};

async function loadAndPrice(db: Tx, lines: SaleLineInput[]) {
  const ids = [...new Set(lines.map((l) => l.itemId))];
  const rows = await db.item.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, price: true, priceBasis: true },
  });
  const items = new Map<number, ItemRow>(
    rows.map((i): [number, ItemRow] => [i.id, i]),
  );

  const missing = ids.filter((id) => !items.has(id));
  if (missing.length > 0) throw new appError('Items not found', 404);

  const priced: PricedLine[] = lines.map((l) => ({
    itemId: l.itemId,
    baseQty: l.baseQty,
    ...priceLine(items.get(l.itemId)!, l),
  }));
  const subtotal = priced.reduce((s, l) => s.add(l.lineTotal), ZERO);
  return { priced, subtotal, items };
}

export async function takeFefo(
  tx: Tx,
  item: ItemRow,
  qty: number,
  todayDate: Date,
): Promise<Slice[]> {
  const taken: Slice[] = [];
  let need = qty;

  for (let attempt = 0; attempt < 5 && need > 0; attempt++) {
    const batches = await tx.batch.findMany({
      where: {
        itemId: item.id,
        qtyRemaining: { gt: 0 },
        expiryDate: { gte: todayDate },
      },
      orderBy: [{ expiryDate: 'asc' }, { id: 'asc' }],
      select: { id: true, qtyRemaining: true, unitCost: true },
    });

    const { slices } = planFefo(batches, need);
    if (slices.length === 0) break; // nothing sellable left

    for (const s of slices) {
      const r = await tx.batch.updateMany({
        where: { id: s.batchId, qtyRemaining: { gte: s.baseQty } },
        data: { qtyRemaining: { decrement: s.baseQty } },
      });
      if (r.count !== 1) break;
      taken.push(s);
      need -= s.baseQty;
    }
  }

  if (need > 0) {
    const left = await tx.batch.aggregate({
      where: {
        itemId: item.id,
        qtyRemaining: { gt: 0 },
        expiryDate: { gt: todayDate },
      },
      _sum: { qtyRemaining: true },
    });
    const available =
      taken.reduce((s, t) => s + t.baseQty, 0) + (left._sum.qtyRemaining ?? 0);
    throw new appError(
      `Not enough stock of "${item.name}": requested ${qty}, available ${available} (expired batches are not sold)`,
      409,
    );
  }
  return taken;
}

async function sellLines(
  tx: Tx,
  saleId: number,
  priced: PricedLine[],
  items: Map<number, ItemRow>,
  todayDate: Date,
) {
  for (const l of priced) {
    const slices = await takeFefo(
      tx,
      items.get(l.itemId)!,
      l.baseQty,
      todayDate,
    );
    await tx.saleLine.create({
      data: {
        saleId,
        itemId: l.itemId,
        baseQty: l.baseQty,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        batches: {
          create: slices.map((s) => ({
            batchId: s.batchId,
            baseQty: s.baseQty,
            unitCost: s.unitCost,
          })),
        },
      },
    });
  }
}

export async function createSale(input: CreateSaleInput) {
  const customerId = input.customerId ?? null;
  const today = cairoToday();
  const date = resolveSaleDate(input.date, today);

  const id = await prisma.$transaction(
    async (tx) => {
      if (customerId !== null) {
        const customer = await tx.customer.findUnique({
          where: { id: customerId },
        });
        if (!customer) throw new appError('Customer not found', 404);
      }

      const { priced, subtotal, items } = await loadAndPrice(tx, input.lines);

      const discount = new Prisma.Decimal(input.discount);

      const paid =
        input.paid !== undefined
          ? new Prisma.Decimal(input.paid)
          : subtotal.sub(discount);
      const { total } = saleTotals(
        subtotal,
        discount,
        paid,
        customerId !== null,
      );

      const sale = await tx.sale.create({
        data: {
          customerId,
          date,
          discount,
          total,
          paid,
          note: input.note?.trim() || null,
        },
      });

      await sellLines(tx, sale.id, priced, items, todayAsDate(today));
      return sale.id;
    },
    { timeout: 40000 },
  );
  return getSale(id);
}

export async function getSale(id: number) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      lines: {
        orderBy: { id: 'asc' },
        include: {
          item: {
            select: { id: true, name: true, unit: true, priceBasis: true },
          },
          batches: {
            orderBy: { id: 'asc' },
            include: { batch: { select: { expiryDate: true } } },
          },
        },
      },
      returns: {
        select: { id: true, date: true, total: true, cashRefund: true },
      },
    },
  });
  if (!sale) throw new appError('Sale not found', 404);

  let totalCost = ZERO;
  const lines = sale.lines.map((l) => {
    const cost = l.batches
      .reduce((s, b) => s.add(b.unitCost.mul(b.baseQty)), ZERO)
      .toDecimalPlaces(2);
    totalCost = totalCost.add(cost);
    return {
      ...l,
      cost,
      profit: l.lineTotal.sub(cost),
      belowCost: l.lineTotal.lt(cost),
    };
  });

  return {
    ...sale,
    subtotal: sale.total.add(sale.discount),
    cost: totalCost,
    profit: sale.total.sub(totalCost),
    lines,
  };
}
