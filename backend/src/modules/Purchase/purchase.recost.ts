import { Prisma } from '@prisma/client';
import appError from '@/common/utils/appError';

type Tx = Prisma.TransactionClient;
export type Delta = { batchId: number; delta: number };

type Move = { from: number; to: number; qty: number; sold: number };

export async function transferSoldUnits(
  tx: Tx,
  purchase: {
    id: number;
    date: Date;
    lines: { batchId: number; baseQty: number }[];
  },
  returned: Map<number, number>,
  deltas: Delta[],
): Promise<{ residual: Delta[]; emptied: number[] }> {
  const neg = deltas.filter((d) => d.delta < 0);
  const pos = deltas.filter((d) => d.delta > 0);
  if (neg.length === 0 || pos.length === 0)
    return { residual: deltas, emptied: [] };

  const ids = deltas.map((d) => d.batchId);
  await tx.$queryRaw`SELECT "id" FROM "Batch" WHERE "id" IN (${Prisma.join(ids)}) FOR UPDATE`;
  const batches = new Map(
    (
      await tx.batch.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          itemId: true,
          expiryDate: true,
          unitCost: true,
          qtyReceived: true,
          qtyRemaining: true,
        },
      })
    ).map((b) => [b.id, b]),
  );
  const keyOf = (id: number) => {
    const b = batches.get(id)!;
    return `${b.itemId}|${b.expiryDate.getTime()}`;
  };

  const left = new Map(deltas.map((d) => [d.batchId, d.delta]));
  const moves: Move[] = [];
  const emptied: number[] = [];

  const groups = new Set(neg.map((d) => keyOf(d.batchId)));
  for (const key of groups) {
    const negs = neg.filter((d) => keyOf(d.batchId) === key);
    const poss = pos.filter((d) => keyOf(d.batchId) === key);
    if (poss.length === 0) continue;

    for (const nb of negs) {
      const b = batches.get(nb.batchId)!;
      const k = -nb.delta;

      const mine: { to: number; qty: number }[] = [];
      let toMove = k;
      for (const p of poss) {
        const room = left.get(p.batchId)!;
        if (room <= 0 || toMove <= 0) continue;
        const t = Math.min(room, toMove);
        mine.push({ to: p.batchId, qty: t });
        left.set(p.batchId, room - t);
        toMove -= t;
      }
      const matched = k - toMove;
      if (matched === 0) continue;

      const qP = purchase.lines
        .filter((l) => l.batchId === b.id)
        .reduce((s, l) => s + l.baseQty, 0);
      const retP = returned.get(b.id) ?? 0;
      const others = await tx.purchaseLine.findMany({
        where: { batchId: b.id, purchaseId: { not: purchase.id } },
        select: {
          baseQty: true,
          purchase: { select: { id: true, date: true } },
        },
      });
      const older = others
        .filter(
          (o) =>
            o.purchase.date < purchase.date ||
            (o.purchase.date.getTime() === purchase.date.getTime() &&
              o.purchase.id < purchase.id),
        )
        .reduce((s, o) => s + o.baseQty, 0);
      const gone = b.qtyReceived - b.qtyRemaining;
      const consumedP = Math.max(retP, Math.min(qP, Math.max(0, gone - older)));
      const cons = consumedP - retP; // اتباع/اتسوّى من بتاعنا (من غير المرتجع للمورد)
      const movedSold = Math.min(matched, cons);

      // الكمية المخصومة فعليًا لازم متقلّش عن اللي اتباع
      const stay = qP - k;
      if (cons - movedSold > stay - retP) {
        throw new appError(`Cannot take ${k} units of this item`, 400);
      }

      if (movedSold > 0) {
        const rows = await tx.saleLineBatch.findMany({
          where: { batchId: b.id },
          orderBy: [{ saleLine: { sale: { date: 'asc' } } }, { id: 'asc' }],
          select: {
            id: true,
            saleLineId: true,
            baseQty: true,
            unitCost: true,
            returnLines: { select: { baseQty: true } },
          },
        });
        const live = rows.map((r) => ({
          ...r,
          gross: r.baseQty,
          net: r.baseQty - r.returnLines.reduce((s, x) => s + x.baseQty, 0),
        }));
        const totalNet = live.reduce((s, r) => s + Math.max(0, r.net), 0);
        let skip = Math.min(older, totalNet);
        if (totalNet - skip < movedSold) {
          throw new appError(
            'Part of this item was written off or returned to the supplier, so its price cannot be changed',
            400,
          );
        }

        const dests: { to: number; qty: number }[] = [];
        let soldLeft = movedSold;
        for (const m of mine) {
          const q = Math.min(m.qty, soldLeft);
          if (q > 0) dests.push({ to: m.to, qty: q });
          soldLeft -= q;
        }

        let di = 0;
        for (const r of live) {
          if (di >= dests.length) break;
          if (r.net <= 0) continue;
          const s = Math.min(skip, r.net);
          skip -= s;
          let avail = r.net - s;
          while (avail > 0 && di < dests.length) {
            const d = dests[di];
            const x = Math.min(avail, d.qty);
            const dest = batches.get(d.to)!;
            if (x === r.net) {
              await tx.saleLineBatch.update({
                where: { id: r.id },
                data: { batchId: d.to, unitCost: dest.unitCost },
              });
              await tx.saleReturnLine.updateMany({
                where: { saleLineBatchId: r.id },
                data: { batchId: d.to },
              });
            } else {
              await tx.saleLineBatch.update({
                where: { id: r.id },
                data: { baseQty: r.gross - x },
              });
              await tx.saleLineBatch.create({
                data: {
                  saleLineId: r.saleLineId,
                  batchId: d.to,
                  baseQty: x,
                  unitCost: dest.unitCost,
                },
              });
            }
            r.gross -= x;
            r.net -= x;
            avail -= x;
            d.qty -= x;
            if (d.qty === 0) di++;
          }
        }
      }

      let soldLeft2 = movedSold;
      for (const m of mine) {
        const sold = Math.min(m.qty, soldLeft2);
        soldLeft2 -= sold;
        moves.push({ from: b.id, to: m.to, qty: m.qty, sold });
      }
    }
  }

  for (const m of moves) {
    const take = m.qty - m.sold;
    const r = await tx.batch.updateMany({
      where: {
        id: m.from,
        qtyRemaining: { gte: take },
        qtyReceived: { gte: m.qty },
      },
      data: {
        qtyReceived: { decrement: m.qty },
        qtyRemaining: { decrement: take },
      },
    });
    if (r.count !== 1) {
      throw new appError(`Cannot take ${m.qty} units of this item`, 400);
    }
    await tx.batch.update({
      where: { id: m.to },
      data: {
        qtyReceived: { increment: m.qty },
        qtyRemaining: { increment: take },
      },
    });
    if (!emptied.includes(m.from)) emptied.push(m.from);
  }

  const residual: Delta[] = [];
  for (const d of deltas) {
    const rest = left.get(d.batchId)!;
    if (d.delta < 0) {
      const matched = moves
        .filter((m) => m.from === d.batchId)
        .reduce((s, m) => s + m.qty, 0);
      const r = d.delta + matched;
      if (r !== 0) residual.push({ batchId: d.batchId, delta: r });
    } else if (rest !== 0) {
      residual.push({ batchId: d.batchId, delta: rest });
    }
  }
  return { residual: residual.sort((a, b) => a.delta - b.delta), emptied };
}

export async function dropEmptyBatches(tx: Tx, ids: number[]) {
  if (ids.length === 0) return;
  await tx.batch.deleteMany({
    where: {
      id: { in: ids },
      qtyReceived: 0,
      qtyRemaining: 0,
      saleLineBatches: { none: {} },
      saleReturnLines: { none: {} },
      purchaseLines: { none: {} },
      purchaseReturnLines: { none: {} },
      stockAdjustments: { none: {} },
    },
  });
}
